<?php
/**
 * Auto Process Reminders - Cron Job
 * 
 * Este script deve ser executado periodicamente via cron job
 * Processa lembretes automáticos de vencimento e envia via WhatsApp
 * 
 * Configuração do Cron (executar a cada hora):
 * 0 * * * * php /caminho/para/api/cron/auto-process-reminders.php
 * 
 * Ou a cada 30 minutos:
 * "star/30 * * * *" php /caminho/para/api/cron/auto-process-reminders.php
 */

// Permitir execução direta
define('APP_INIT', true);

// Configurar timezone
date_default_timezone_set('America/Sao_Paulo');

// Set environment variables for database connection
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_NAME=iptv_manager');
putenv('DB_USER=root');
putenv('DB_PASS=');

// Incluir configuração do banco
require_once __DIR__ . '/../../database/config.php';

// Log de início
error_log("=== Auto Process Reminders - Started at " . date('Y-m-d H:i:s') . " ===");

try {
    $conn = getDbConnection();
    
    $currentHour = (int)date('H');
    $currentMinute = (int)date('i');
    $today = date('Y-m-d');
    
    error_log("Current time: {$currentHour}:{$currentMinute}");
    
    // Buscar configurações globais
    $stmt = $conn->prepare("SELECT * FROM whatsapp_reminder_settings LIMIT 1");
    $stmt->execute();
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$settings) {
        error_log("⚠️  No reminder settings found, using defaults");
        $settings = [
            'start_hour' => 0,
            'end_hour' => 23,
            'enabled_days' => '1,2,3,4,5,6,7' // Todos os dias
        ];
    }
    
    // Garantir que enabled_days existe
    if (!isset($settings['enabled_days']) || empty($settings['enabled_days'])) {
        $settings['enabled_days'] = '1,2,3,4,5,6,7'; // Todos os dias por padrão
    }
    
    // Verificar se está no horário de trabalho
    $inWorkingHours = $currentHour >= $settings['start_hour'] && $currentHour < $settings['end_hour'];
    
    // Verificar dia da semana
    $currentDayOfWeek = date('N'); // 1 (segunda) a 7 (domingo)
    $enabledDays = explode(',', $settings['enabled_days']);
    $isWorkingDay = in_array($currentDayOfWeek, $enabledDays);
    
    error_log("Working hours: {$settings['start_hour']}:00 - {$settings['end_hour']}:00");
    error_log("In working hours: " . ($inWorkingHours ? 'yes' : 'no'));
    error_log("Is working day: " . ($isWorkingDay ? 'yes' : 'no'));
    
    if (!$isWorkingDay) {
        error_log("⏭️  Not a working day, skipping");
        exit(0);
    }
    
    // Buscar templates ativos
    $stmt = $conn->prepare("
        SELECT * FROM whatsapp_templates 
        WHERE trigger_event = 'scheduled' AND is_active = 1 
        ORDER BY days_offset DESC
    ");
    $stmt->execute();
    $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Found " . count($templates) . " active reminder templates");
    
    $totalProcessed = 0;
    $totalSent = 0;
    $totalSkipped = 0;
    $totalErrors = 0;
    
    foreach ($templates as $template) {
        $template_name = $template['name'];
        $template_id = $template['id'];
        $template_type = $template['reminder_type'] ?? 'before';
        $days_offset = (int)$template['days_offset'];
        $use_global_schedule = (bool)$template['use_global_schedule'];
        
        error_log("\nProcessing template: {$template_name} (type: {$template_type}, offset: {$days_offset}d)");
        
        // CRON JOB MODE: Sempre envia quando executado, ignora horários específicos
        // O controle de horário deve ser feito na configuração do cron job
        $canSendNow = true;
        error_log("  Cron mode: Always send when executed");
        
        // Buscar clientes elegíveis
        $sql = "
            SELECT c.*, p.name as plan_name
            FROM clients c
            LEFT JOIN plans p ON c.plan_id = p.id
            WHERE c.status = 'active'
        ";
        
        // Adicionar condição baseada no tipo de lembrete
        if ($template_type === 'before') {
            $sql .= " AND DATEDIFF(c.renewal_date, CURDATE()) = {$days_offset}";
        } elseif ($template_type === 'on_due') {
            $sql .= " AND DATEDIFF(c.renewal_date, CURDATE()) = 0";
        } elseif ($template_type === 'after') {
            $sql .= " AND DATEDIFF(c.renewal_date, CURDATE()) = {$days_offset}";
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("  Found " . count($clients) . " eligible clients");
        
        foreach ($clients as $client) {
            $totalProcessed++;
            $client_id = $client['id'];
            $client_name = $client['name'];
            
            // Verificar se já enviou hoje para este cliente/template
            $stmt = $conn->prepare("
                SELECT id FROM whatsapp_reminder_logs 
                WHERE client_id = ? 
                AND template_id = ? 
                AND DATE(created_at) = CURDATE()
                LIMIT 1
            ");
            $stmt->execute([$client_id, $template_id]);
            $existingLog = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingLog) {
                error_log("    ⏭️  {$client_name}: Already sent today");
                $totalSkipped++;
                continue;
            }
            
            // Verificar se cliente tem telefone
            if (empty($client['phone'])) {
                error_log("    ⚠️  {$client_name}: No phone number");
                $totalSkipped++;
                continue;
            }
            
            try {
                // Calcular dias até vencimento
                $renewal_date = new DateTime($client['renewal_date']);
                $today_date = new DateTime('today');
                $days_until_due = $today_date->diff($renewal_date)->days;
                if ($renewal_date < $today_date) {
                    $days_until_due = -$days_until_due;
                }
                
                // Processar mensagem
                $message = processReminderMessage(
                    $template['message'],
                    $client,
                    $days_until_due
                );
                
                // Criar log
                $log_id = 'rlog_' . time() . '_' . substr(md5($client_id . $template_id), 0, 8);
                
                $stmt = $conn->prepare("
                    INSERT INTO whatsapp_reminder_logs 
                    (id, reseller_id, client_id, template_id, message_content, scheduled_date, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
                ");
                
                $stmt->execute([
                    $log_id,
                    $client['reseller_id'],
                    $client_id,
                    $template_id,
                    $message,
                    $today
                ]);
                
                // Enviar WhatsApp
                $whatsapp_result = sendReminderWhatsApp($client, $message);
                
                if ($whatsapp_result['success']) {
                    // Atualizar log como enviado
                    $stmt = $conn->prepare("
                        UPDATE whatsapp_reminder_logs 
                        SET status = 'sent', sent_at = NOW(), whatsapp_message_id = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([$whatsapp_result['message_id'] ?? null, $log_id]);
                    
                    error_log("    ✅ {$client_name}: Reminder sent");
                    $totalSent++;
                } else {
                    // Atualizar log como falhou
                    $stmt = $conn->prepare("
                        UPDATE whatsapp_reminder_logs 
                        SET status = 'failed', error_message = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([$whatsapp_result['error'] ?? 'Unknown error', $log_id]);
                    
                    error_log("    ❌ {$client_name}: Failed - " . ($whatsapp_result['error'] ?? 'Unknown error'));
                    $totalErrors++;
                }
                
            } catch (Exception $e) {
                error_log("    ❌ {$client_name}: Error - " . $e->getMessage());
                $totalErrors++;
            }
        }
    }
    
    // Log final
    error_log("\n=== Summary ===");
    error_log("Total processed: {$totalProcessed}");
    error_log("Total sent: {$totalSent}");
    error_log("Total skipped: {$totalSkipped}");
    error_log("Total errors: {$totalErrors}");
    error_log("=== Auto Process Reminders - Finished at " . date('Y-m-d H:i:s') . " ===\n");
    
} catch (Exception $e) {
    error_log("❌ FATAL ERROR: " . $e->getMessage());
    error_log($e->getTraceAsString());
}

/**
 * Processa variáveis do template de lembrete
 */
function processReminderMessage($template, $client, $days_until_due) {
    $renewal_date = new DateTime($client['renewal_date']);
    $formatted_date = $renewal_date->format('d/m/Y');
    
    // Texto de dias restantes
    if ($days_until_due > 0) {
        $days_text = $days_until_due === 1 ? "em 1 dia" : "em {$days_until_due} dias";
    } elseif ($days_until_due === 0) {
        $days_text = "hoje";
    } else {
        $abs_days = abs($days_until_due);
        $days_text = $abs_days === 1 ? "há 1 dia" : "há {$abs_days} dias";
    }
    
    // Substituir variáveis
    $message = $template;
    $message = str_replace('{{cliente_nome}}', $client['name'], $message);
    $message = str_replace('{{data_vencimento}}', $formatted_date, $message);
    $message = str_replace('{{data_vencimento_extenso}}', $formatted_date, $message);
    $message = str_replace('{{dias_restantes}}', abs($days_until_due), $message);
    $message = str_replace('{{dias_restantes_texto}}', $days_text, $message);
    $message = str_replace('{{valor}}', number_format($client['value'], 2, ',', '.'), $message);
    $message = str_replace('{{plano}}', $client['plan_name'] ?? 'Plano', $message);
    
    return $message;
}

/**
 * Envia lembrete via WhatsApp
 */
function sendReminderWhatsApp($client, $message) {
    // Formatar telefone
    $phone = preg_replace('/\D/', '', $client['phone']);
    if (strlen($phone) === 11 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
        $phone = '55' . $phone;
    } elseif (strlen($phone) === 10 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
        $phone = '55' . $phone;
    }
    
    // Obter credenciais do WhatsApp
    $whatsapp_url = getenv('WHATSAPP_API_URL') ?: '';
    $whatsapp_key = getenv('WHATSAPP_API_KEY') ?: '';
    
    if (empty($whatsapp_url) || empty($whatsapp_key)) {
        return ['success' => false, 'error' => 'WhatsApp API not configured'];
    }
    
    // Enviar mensagem
    $whatsapp_data = [
        'number' => $phone,
        'text' => $message
    ];
    
    $url = rtrim($whatsapp_url, '/') . '/message/sendText/gestplay-instance';
    $post_data = json_encode($whatsapp_data);
    
    $context = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                'apikey: ' . $whatsapp_key,
                'Content-Length: ' . strlen($post_data)
            ],
            'content' => $post_data,
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ];
    
    $stream = stream_context_create($context);
    $result = @file_get_contents($url, false, $stream);
    
    if ($result !== false) {
        $response = json_decode($result, true);
        return [
            'success' => true,
            'message_id' => $response['key']['id'] ?? null
        ];
    } else {
        return ['success' => false, 'error' => 'API request failed'];
    }
}
