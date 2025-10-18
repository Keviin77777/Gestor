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
    
    // Buscar configurações de cada reseller (mesma lógica do JavaScript)
    $stmt = $conn->prepare("SELECT DISTINCT reseller_id FROM whatsapp_reminder_settings WHERE is_enabled = 1");
    $stmt->execute();
    $resellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($resellers) === 0) {
        error_log("⚠️  Nenhum reseller com sistema de lembretes ativo");
        exit(0);
    }
    
    $totalProcessed = 0;
    $totalSent = 0;
    $totalSkipped = 0;
    $totalErrors = 0;
    
    foreach ($resellers as $reseller) {
        $reseller_id = $reseller['reseller_id'];
        
        // Buscar templates ativos para este reseller
        $stmt = $conn->prepare("
            SELECT * FROM whatsapp_templates 
            WHERE reseller_id = ? AND trigger_event = 'scheduled' AND is_active = 1 
            ORDER BY days_offset DESC
        ");
        $stmt->execute([$reseller_id]);
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($templates) === 0) {
            error_log("📋 Reseller {$reseller_id}: Nenhum template ativo");
            continue;
        }
        
        error_log("📋 Reseller {$reseller_id}: " . count($templates) . " templates ativos");
        
        // Buscar clientes ativos deste reseller
        $stmt = $conn->prepare("
            SELECT c.*, p.name as plan_name 
            FROM clients c
            LEFT JOIN plans p ON c.plan_id = p.id
            WHERE c.reseller_id = ? AND c.status = 'active'
        ");
        $stmt->execute([$reseller_id]);
        $reseller_clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("👥 Reseller {$reseller_id}: " . count($reseller_clients) . " clientes ativos");
        
        foreach ($templates as $template) {
        $template_name = $template['name'];
        $template_id = $template['id'];
        $days_offset = (int)$template['days_offset'];
        $use_global_schedule = (bool)$template['use_global_schedule'];
        
        error_log("\nProcessing template: {$template_name} (offset: {$days_offset}d)");
        
        // CRON JOB MODE: Sempre envia quando executado, ignora horários específicos
        // O controle de horário deve ser feito na configuração do cron job
        $canSendNow = true;
        error_log("  Cron mode: Always send when executed");
        
        // Buscar clientes elegíveis - MESMA LÓGICA DO JAVASCRIPT
        // Usar days_offset diretamente: positivo = antes, 0 = no dia, negativo = depois
        $sql = "
            SELECT c.*, p.name as plan_name
            FROM clients c
            LEFT JOIN plans p ON c.plan_id = p.id
            WHERE c.status = 'active'
            AND DATEDIFF(c.renewal_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) = {$days_offset}
        ";
        
        // Filtrar clientes elegíveis para este template
        $eligible_clients = [];
        foreach ($reseller_clients as $client) {
            // Calcular dias até vencimento (mesma lógica do JavaScript)
            $renewal_date = new DateTime($client['renewal_date']);
            $today_date = new DateTime('today');
            $days_until_due = $today_date->diff($renewal_date)->days;
            if ($renewal_date < $today_date) {
                $days_until_due = -$days_until_due;
            }
            
            // Verificar se é o dia certo para enviar (mesma lógica do JavaScript)
            if ($days_until_due === $days_offset) {
                $eligible_clients[] = $client;
            }
        }
        
        error_log("  Found " . count($eligible_clients) . " eligible clients");
        
        foreach ($eligible_clients as $client) {
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
                // Calcular dias até vencimento (mesma lógica do JavaScript)
                $renewal_parts = explode('-', $client['renewal_date']);
                $renewal_date = new DateTime();
                $renewal_date->setDate((int)$renewal_parts[0], (int)$renewal_parts[1], (int)$renewal_parts[2]);
                $renewal_date->setTime(0, 0, 0);
                
                $today_date = new DateTime();
                $today_date->setTime(0, 0, 0);
                
                $days_until_due = (int)(($renewal_date->getTimestamp() - $today_date->getTimestamp()) / (24 * 60 * 60));
                
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
    $current_date = new DateTime();
    $current_hour = $current_date->format('H:i');
    
    // Texto de dias restantes
    if ($days_until_due > 0) {
        $days_text = $days_until_due === 1 ? "em 1 dia" : "em {$days_until_due} dias";
    } elseif ($days_until_due === 0) {
        $days_text = "hoje";
    } else {
        $abs_days = abs($days_until_due);
        $days_text = $abs_days === 1 ? "há 1 dia" : "há {$abs_days} dias";
    }
    
    // Formatar data por extenso
    $months = [
        1 => 'janeiro', 2 => 'fevereiro', 3 => 'março', 4 => 'abril',
        5 => 'maio', 6 => 'junho', 7 => 'julho', 8 => 'agosto',
        9 => 'setembro', 10 => 'outubro', 11 => 'novembro', 12 => 'dezembro'
    ];
    $data_extenso = $renewal_date->format('j') . ' de ' . $months[(int)$renewal_date->format('n')] . ' de ' . $renewal_date->format('Y');
    
    // Status do cliente
    $status_map = [
        'active' => 'Ativo',
        'inactive' => 'Inativo',
        'suspended' => 'Suspenso',
        'cancelled' => 'Cancelado'
    ];
    $status_cliente = $status_map[$client['status']] ?? $client['status'] ?? 'Ativo';
    
    // Buscar link de pagamento da fatura (se existir)
    $payment_link = null;
    try {
        global $conn;
        $stmt = $conn->prepare("
            SELECT payment_link FROM invoices 
            WHERE client_id = ? AND due_date = ? AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$client['id'], $client['renewal_date']]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($invoice && !empty($invoice['payment_link'])) {
            $payment_link = $invoice['payment_link'];
        }
    } catch (Exception $e) {
        error_log("Erro ao buscar link de pagamento: " . $e->getMessage());
    }
    
    // Valores numéricos
    $client_value = floatval($client['value']);
    $discount_value = 0; // Pode ser expandido futuramente
    $final_value = $client_value;
    
    // Mapa completo de variáveis (igual ao JavaScript)
    $variables = [
        // Cliente
        'CLIENT_NAME' => $client['name'] ?? '',
        'cliente_nome' => $client['name'] ?? '',
        'CLIENT_PHONE' => $client['phone'] ?? '',
        'cliente_telefone' => $client['phone'] ?? '',
        'USERNAME' => $client['username'] ?? '',
        'cliente_usuario' => $client['username'] ?? '',
        
        // Datas
        'DUE_DATE' => $formatted_date,
        'data_vencimento' => $formatted_date,
        'data_vencimento_extenso' => $data_extenso,
        'DAYS_UNTIL_DUE' => strval(abs($days_until_due)),
        'dias_restantes' => strval(abs($days_until_due)),
        'dias_restantes_texto' => $days_text,
        'ano_vencimento' => $renewal_date->format('Y'),
        'mes_vencimento' => $months[(int)$renewal_date->format('n')],
        'CURRENT_DATE' => $current_date->format('d/m/Y'),
        'data_hoje' => $current_date->format('d/m/Y'),
        'data_atual' => $current_date->format('d/m/Y'),
        'hora_atual' => $current_hour,
        
        // Valores
        'AMOUNT' => number_format($client_value, 2, ',', '.'),
        'valor' => number_format($client_value, 2, ',', '.'),
        'valor_numerico' => number_format($client_value, 2, '.', ''),
        'DISCOUNT_VALUE' => number_format($discount_value, 2, ',', '.'),
        'desconto' => number_format($discount_value, 2, ',', '.'),
        'FINAL_VALUE' => number_format($final_value, 2, ',', '.'),
        'valor_final' => number_format($final_value, 2, ',', '.'),
        
        // Plano/Sistema
        'PLAN_NAME' => $client['plan_name'] ?? 'Plano',
        'plano' => $client['plan_name'] ?? 'Plano',
        'plano_nome' => $client['plan_name'] ?? 'Plano',
        'status_cliente' => $status_cliente,
        'CLIENT_STATUS' => $status_cliente,
        'BUSINESS_NAME' => 'GestPlay',
        'empresa_nome' => 'GestPlay',
        
        // Link de pagamento
        'link_pagamento' => $payment_link ?: 'Link não disponível',
        'link_fatura' => $payment_link ?: 'Link não disponível',
        'PAYMENT_LINK' => $payment_link ?: 'Link não disponível',
    ];
    
    // Substituir todas as variáveis (suporta {var} e {{var}})
    $message = $template;
    foreach ($variables as $key => $value) {
        // Substituir {{variavel}} e {variavel} (case insensitive)
        $message = preg_replace('/\{\{' . preg_quote($key, '/') . '\}\}/i', $value, $message);
        $message = preg_replace('/\{' . preg_quote($key, '/') . '\}/i', $value, $message);
    }
    
    return $message;
}

/**
 * Envia lembrete via WhatsApp
 */
function sendReminderWhatsApp($client, $message) {
    // Formatar telefone (mesma lógica do JavaScript)
    $phone = preg_replace('/\D/', '', $client['phone']);
    
    // Remover código do país se já tiver
    if (strlen($phone) > 11 && substr($phone, 0, 2) === '55') {
        $phone = substr($phone, 2);
    }
    
    // Pegar últimos 11 dígitos
    if (strlen($phone) > 11) {
        $phone = substr($phone, -11);
    }
    
    // Validar formato e adicionar código do país
    if (strlen($phone) === 11 || strlen($phone) === 10) {
        $phone = '55' . $phone;
    }
    
    // Obter credenciais do WhatsApp
    $whatsapp_url = getenv('WHATSAPP_API_URL') ?: '';
    $whatsapp_key = getenv('WHATSAPP_API_KEY') ?: '';
    
    if (empty($whatsapp_url) || empty($whatsapp_key)) {
        return ['success' => false, 'error' => 'WhatsApp API not configured'];
    }
    
    // Extrair ID numérico do reseller_id e criar nome da instância (mesma lógica do JavaScript)
    $reseller_id = $client['reseller_id'];
    $clean_id = str_replace('reseller_', '', $reseller_id);
    preg_match('/^(\d+)/', $clean_id, $matches);
    $numeric_id = $matches[1] ?? $clean_id;
    $instance_name = "reseller_{$numeric_id}";
    
    error_log("    🔧 Usando instância: {$instance_name} (de {$reseller_id})");
    
    // Enviar mensagem
    $whatsapp_data = [
        'number' => $phone,
        'text' => $message
    ];
    
    $url = rtrim($whatsapp_url, '/') . "/message/sendText/{$instance_name}";
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
