<?php
/**
 * Auto Generate Invoices - Cron Job
 * 
 * Este script deve ser executado periodicamente via cron job
 * Gera faturas automaticamente para clientes que estão próximos do vencimento
 * 
 * Configuração do Cron (executar a cada hora):
 * 0 * * * * php /caminho/para/api/cron/auto-generate-invoices.php
 * 
 * Ou a cada 30 minutos (use aspas no cron):
 * "star/30 * * * *" php /caminho/para/api/cron/auto-generate-invoices.php
 */

// Permitir execução direta
define('APP_INIT', true);

// Configurar timezone
date_default_timezone_set('America/Sao_Paulo');

// Incluir configuração do banco
require_once __DIR__ . '/../../database/config.php';

// Log de início
error_log("=== Auto Generate Invoices - Started at " . date('Y-m-d H:i:s') . " ===");

try {
    $conn = getDbConnection();
    
    // Configurações
    $daysBeforeExpiry = 10; // Gerar fatura 10 dias antes do vencimento
    
    // Buscar todos os resellers ativos
    $stmt = $conn->prepare("
        SELECT id, email, display_name 
        FROM resellers 
        WHERE is_active = 1
    ");
    $stmt->execute();
    $resellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Found " . count($resellers) . " active resellers");
    
    $totalGenerated = 0;
    $totalSkipped = 0;
    $totalErrors = 0;
    
    foreach ($resellers as $reseller) {
        $reseller_id = $reseller['id'];
        error_log("\nProcessing reseller: {$reseller['email']} (ID: {$reseller_id})");
        
        // Buscar clientes ativos que precisam de fatura
        $stmt = $conn->prepare("
            SELECT c.*, p.name as plan_name
            FROM clients c
            LEFT JOIN plans p ON c.plan_id = p.id
            WHERE c.reseller_id = ? 
            AND c.status = 'active'
            AND DATEDIFF(c.renewal_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) <= ?
            AND DATEDIFF(c.renewal_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) >= 0
        ");
        $stmt->execute([$reseller_id, $daysBeforeExpiry]);
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("  Found " . count($clients) . " clients needing invoices");
        
        foreach ($clients as $client) {
            try {
                $client_id = $client['id'];
                $client_name = $client['name'];
                $renewal_date = $client['renewal_date'];
                $value = $client['value'];
                
                // Verificar se já existe fatura para esta data de vencimento
                $stmt = $conn->prepare("
                    SELECT id FROM invoices 
                    WHERE client_id = ? 
                    AND due_date = ?
                    LIMIT 1
                ");
                $stmt->execute([$client_id, $renewal_date]);
                $existingInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingInvoice) {
                    error_log("    ⏭️  Cliente {$client_name}: Fatura já existe para {$renewal_date}");
                    $totalSkipped++;
                    continue;
                }
                
                // Gerar descrição da fatura
                $renewalDateObj = new DateTime($renewal_date);
                $monthNames = [
                    1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
                    5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
                    9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
                ];
                $month = $monthNames[(int)$renewalDateObj->format('n')];
                $year = $renewalDateObj->format('Y');
                $description = "Mensalidade - {$month} {$year}";
                
                // Criar fatura
                $invoice_id = 'inv_auto_' . time() . '_' . substr(md5($client_id . $renewal_date), 0, 8);
                $invoice_date = date('Y-m-d');
                $discount = 0;
                $final_value = $value - $discount;
                
                // Gerar número sequencial da fatura
                $stmt = $conn->prepare("
                    SELECT invoice_number FROM invoices 
                    WHERE reseller_id = ? AND invoice_number IS NOT NULL 
                    ORDER BY created_at DESC LIMIT 1
                ");
                $stmt->execute([$reseller_id]);
                $lastInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($lastInvoice && $lastInvoice['invoice_number']) {
                    $lastNumber = intval($lastInvoice['invoice_number']);
                    $invoice_number = str_pad($lastNumber + 1, 6, '0', STR_PAD_LEFT);
                } else {
                    $invoice_number = '000001';
                }
                
                $stmt = $conn->prepare("
                    INSERT INTO invoices 
                    (id, reseller_id, client_id, invoice_number, date, due_date, value, final_value, status, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
                ");
                
                $result = $stmt->execute([
                    $invoice_id,
                    $reseller_id,
                    $client_id,
                    $invoice_number,
                    $invoice_date,
                    $renewal_date,
                    $value,
                    $final_value,
                    $description
                ]);
                
                if ($result) {
                    error_log("    ✅ Cliente {$client_name}: Fatura gerada (ID: {$invoice_id}, Vencimento: {$renewal_date}, Valor: R$ {$value})");
                    $totalGenerated++;
                    
                    // Enviar WhatsApp se cliente tem telefone (apenas uma vez por fatura)
                    if (!empty($client['phone'])) {
                        try {
                            sendInvoiceWhatsApp($conn, $reseller_id, $invoice_id, $client, $renewal_date, $value, $description);
                        } catch (Exception $e) {
                            error_log("    ⚠️  Erro ao enviar WhatsApp: " . $e->getMessage());
                        }
                    }
                } else {
                    error_log("    ❌ Cliente {$client_name}: Erro ao criar fatura");
                    $totalErrors++;
                }
                
            } catch (Exception $e) {
                error_log("    ❌ Erro ao processar cliente {$client['name']}: " . $e->getMessage());
                $totalErrors++;
            }
        }
    }
    
    // Log final
    error_log("\n=== Summary ===");
    error_log("Total invoices generated: {$totalGenerated}");
    error_log("Total skipped (already exists): {$totalSkipped}");
    error_log("Total errors: {$totalErrors}");
    error_log("=== Auto Generate Invoices - Finished at " . date('Y-m-d H:i:s') . " ===\n");
    
} catch (Exception $e) {
    error_log("❌ FATAL ERROR: " . $e->getMessage());
    error_log($e->getTraceAsString());
}

/**
 * Envia mensagem de fatura via WhatsApp (apenas uma vez por fatura)
 */
function sendInvoiceWhatsApp($conn, $reseller_id, $invoice_id, $client, $due_date, $value, $description) {
    // Verificar se já enviou WhatsApp para esta fatura
    $stmt = $conn->prepare("
        SELECT id FROM whatsapp_invoice_logs 
        WHERE invoice_id = ? 
        LIMIT 1
    ");
    $stmt->execute([$invoice_id]);
    $alreadySent = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($alreadySent) {
        error_log("      ⏭️  WhatsApp já foi enviado para esta fatura");
        return;
    }
    
    // Buscar template de fatura
    $stmt = $conn->prepare("
        SELECT message 
        FROM whatsapp_templates 
        WHERE reseller_id = ? AND trigger_event = 'invoice_generated' AND is_active = 1 
        LIMIT 1
    ");
    $stmt->execute([$reseller_id]);
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template) {
        error_log("      ⚠️  Nenhum template de fatura encontrado");
        return;
    }
    
    // Processar variáveis do template (todas as variáveis disponíveis)
    $dueDateObj = new DateTime($due_date);
    $current_date = new DateTime();
    $current_hour = $current_date->format('H:i');
    $client_value = floatval($value);
    
    // Formatar data por extenso
    $months = [
        1 => 'janeiro', 2 => 'fevereiro', 3 => 'março', 4 => 'abril',
        5 => 'maio', 6 => 'junho', 7 => 'julho', 8 => 'agosto',
        9 => 'setembro', 10 => 'outubro', 11 => 'novembro', 12 => 'dezembro'
    ];
    $data_extenso = $dueDateObj->format('j') . ' de ' . $months[(int)$dueDateObj->format('n')] . ' de ' . $dueDateObj->format('Y');
    
    // Status do cliente
    $status_map = [
        'active' => 'Ativo',
        'inactive' => 'Inativo',
        'suspended' => 'Suspenso',
        'cancelled' => 'Cancelado'
    ];
    $status_cliente = $status_map[$client['status']] ?? 'Ativo';
    
    // Gerar link de pagamento
    $payment_link = '';
    try {
        // Buscar método de pagamento padrão ativo
        $stmt = $conn->prepare("
            SELECT * FROM payment_methods 
            WHERE reseller_id = ? AND is_active = 1 AND is_default = 1
            LIMIT 1
        ");
        $stmt->execute([$reseller_id]);
        $payment_method = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($payment_method) {
            // Gerar link baseado no método
            $app_url = getenv('APP_URL') ?: 'http://localhost:9002';
            
            // TODO: Adicionar suporte para geração automática de links aqui no futuro
            // Por enquanto, links são gerados apenas na criação manual de faturas
        }
    } catch (Exception $e) {
        error_log("      ⚠️  Erro ao gerar link de pagamento: " . $e->getMessage());
    }
    
    // Determinar referência baseada no mês
    $referencia = 'Mensalidade - ' . strtolower($months[(int)$dueDateObj->format('n')]) . ' ' . $dueDateObj->format('Y');
    
    // Mapa completo de variáveis
    $variables = [
        // Cliente
        'CLIENT_NAME' => $client['name'] ?? '',
        'cliente_nome' => $client['name'] ?? '',
        'CLIENT_PHONE' => $client['phone'] ?? '',
        'cliente_telefone' => $client['phone'] ?? '',
        'USERNAME' => $client['username'] ?? '',
        'cliente_usuario' => $client['username'] ?? '',
        
        // Datas
        'DUE_DATE' => $dueDateObj->format('d/m/Y'),
        'data_vencimento' => $dueDateObj->format('d/m/Y'),
        'data_vencimento_extenso' => $data_extenso,
        'ano_vencimento' => $dueDateObj->format('Y'),
        'mes_vencimento' => $months[(int)$dueDateObj->format('n')],
        'CURRENT_DATE' => $current_date->format('d/m/Y'),
        'data_hoje' => $current_date->format('d/m/Y'),
        'data_atual' => $current_date->format('d/m/Y'),
        'hora_atual' => $current_hour,
        
        // Valores
        'AMOUNT' => number_format($client_value, 2, ',', '.'),
        'valor' => number_format($client_value, 2, ',', '.'),
        'valor_numerico' => number_format($client_value, 2, '.', ''),
        'DISCOUNT_VALUE' => '0,00',
        'desconto' => '0,00',
        'FINAL_VALUE' => number_format($client_value, 2, ',', '.'),
        'valor_final' => number_format($client_value, 2, ',', '.'),
        
        // Plano/Sistema
        'PLAN_NAME' => $client['plan_name'] ?? 'Plano',
        'plano' => $client['plan_name'] ?? 'Plano',
        'plano_nome' => $client['plan_name'] ?? 'Plano',
        'status_cliente' => $status_cliente,
        'CLIENT_STATUS' => $status_cliente,
        'BUSINESS_NAME' => 'GestPlay',
        'empresa_nome' => 'GestPlay',
        
        // Referência
        'referencia' => $referencia,
        'REFERENCE' => $referencia,
        
        // Link de pagamento
        'link_pagamento' => $payment_link ?: 'Link não disponível',
        'link_fatura' => $payment_link ?: 'Link não disponível',
        'PAYMENT_LINK' => $payment_link ?: 'Link não disponível',
    ];
    
    // Substituir todas as variáveis
    $message = $template['message'];
    foreach ($variables as $key => $value) {
        $message = str_replace('{{' . $key . '}}', $value, $message);
    }
    
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
        error_log("      ⚠️  WhatsApp API não configurada");
        return;
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
        error_log("      ✅ WhatsApp enviado para {$client['name']} ({$phone})");
        
        // Registrar envio para evitar duplicatas
        try {
            $log_id = 'wlog_' . time() . '_' . substr(md5($invoice_id), 0, 8);
            $stmt = $conn->prepare("
                INSERT INTO whatsapp_invoice_logs 
                (id, invoice_id, client_id, reseller_id, phone, message, sent_at, status)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), 'sent')
            ");
            $stmt->execute([
                $log_id,
                $invoice_id,
                $client['id'],
                $reseller_id,
                $phone,
                $message
            ]);
        } catch (Exception $e) {
            error_log("      ⚠️  Erro ao registrar log: " . $e->getMessage());
        }
    } else {
        error_log("      ❌ Falha ao enviar WhatsApp para {$client['name']}");
        
        // Registrar falha
        try {
            $log_id = 'wlog_' . time() . '_' . substr(md5($invoice_id), 0, 8);
            $stmt = $conn->prepare("
                INSERT INTO whatsapp_invoice_logs 
                (id, invoice_id, client_id, reseller_id, phone, message, sent_at, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), 'failed', 'API request failed')
            ");
            $stmt->execute([
                $log_id,
                $invoice_id,
                $client['id'],
                $reseller_id,
                $phone,
                $message
            ]);
        } catch (Exception $e) {
            error_log("      ⚠️  Erro ao registrar log de falha: " . $e->getMessage());
        }
    }
}
