<?php
/**
 * Mercado Pago Webhook Handler
 * Processa notificações de pagamento do Mercado Pago
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../database/config.php';

// Log webhook
$payload = file_get_contents('php://input');
error_log("Mercado Pago Webhook received: " . $payload);

$data = json_decode($payload, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$conn = getDbConnection();

try {
    // Salvar webhook
    $webhook_id = bin2hex(random_bytes(16));
    $stmt = $conn->prepare("
        INSERT INTO payment_webhooks (
            id, method_type, event_type, external_id, payload, created_at
        ) VALUES (?, 'mercadopago', ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $webhook_id,
        $data['type'] ?? 'unknown',
        $data['data']['id'] ?? null,
        $payload
    ]);
    
    // Processar apenas eventos de pagamento
    if (isset($data['type']) && $data['type'] === 'payment') {
        $payment_id = $data['data']['id'];
        
        // Buscar detalhes do pagamento no Mercado Pago
        // Primeiro, tentar encontrar em payment_transactions (pagamentos de clientes)
        $stmt = $conn->prepare("
            SELECT pt.*, pm.mp_access_token, i.reseller_id, 'client' as payment_type
            FROM payment_transactions pt
            JOIN payment_methods pm ON pt.payment_method_id = pm.id
            JOIN invoices i ON pt.invoice_id = i.id
            WHERE pt.external_id = ? AND pt.method_type = 'mercadopago'
        ");
        $stmt->execute([$payment_id]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Se não encontrou, tentar em reseller_payment_history (assinaturas de resellers)
        if (!$transaction) {
            error_log("Webhook MP: Não encontrou em payment_transactions, tentando reseller_payment_history");
            
            // Verificar se a coluna external_id existe
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'reseller_payment_history'
                  AND COLUMN_NAME = 'external_id'
            ");
            $stmt->execute();
            $columnExists = $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
            
            error_log("Webhook MP: Coluna external_id existe: " . ($columnExists ? 'SIM' : 'NÃO'));
            
            if ($columnExists) {
                // Buscar método de pagamento do admin para assinaturas
                $stmt = $conn->prepare("
                    SELECT rph.*, pm.mp_access_token, rph.reseller_id, 'reseller' as payment_type
                    FROM reseller_payment_history rph
                    JOIN payment_methods pm ON pm.reseller_id = (
                        SELECT id FROM resellers WHERE is_admin = 1 LIMIT 1
                    )
                    WHERE rph.external_id = ? 
                      AND pm.method_type = 'mercadopago' 
                      AND pm.is_active = 1 
                      AND pm.is_default = 1
                ");
                $stmt->execute([$payment_id]);
                $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log("Webhook MP: Encontrou transação de reseller: " . ($transaction ? 'SIM' : 'NÃO'));
                if ($transaction) {
                    error_log("Webhook MP: ID da transação: " . $transaction['id']);
                }
            }
        }
        
        if ($transaction) {
            // Buscar status do pagamento no Mercado Pago
            $ch = curl_init("https://api.mercadopago.com/v1/payments/{$payment_id}");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $transaction['mp_access_token']
            ]);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($http_code === 200) {
                $payment_data = json_decode($response, true);
                $status = $payment_data['status'];
                
                // Mapear status do Mercado Pago
                $mapped_status = 'pending';
                if ($status === 'approved') {
                    $mapped_status = 'approved';
                } elseif ($status === 'rejected') {
                    $mapped_status = 'rejected';
                } elseif ($status === 'cancelled') {
                    $mapped_status = 'cancelled';
                } elseif ($status === 'refunded') {
                    $mapped_status = 'refunded';
                }
                
                // Atualizar transação
                $conn->beginTransaction();
                
                $stmt = $conn->prepare("
                    UPDATE payment_transactions 
                    SET status = ?, 
                        paid_amount = ?,
                        paid_at = ?,
                        gateway_response = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([
                    $mapped_status,
                    $payment_data['transaction_amount'] ?? null,
                    $status === 'approved' ? date('Y-m-d H:i:s') : null,
                    json_encode($payment_data),
                    $transaction['id']
                ]);
                
                // Se aprovado, processar baseado no tipo de pagamento
                if ($status === 'approved') {
                    if ($transaction['payment_type'] === 'client') {
                        // Processar pagamento de cliente (fatura)
                        processClientPayment($conn, $transaction, $payment_data);
                    } elseif ($transaction['payment_type'] === 'reseller') {
                        // Processar pagamento de assinatura de reseller
                        processResellerSubscriptionPayment($conn, $transaction, $payment_data);
                    }
                }
                
                // Marcar webhook como processado
                $stmt = $conn->prepare("
                    UPDATE payment_webhooks 
                    SET processed = TRUE, processed_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$webhook_id]);
                
                $conn->commit();
            }
        }
    }
    
    http_response_code(200);
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollback();
    }
    
    error_log("Mercado Pago Webhook Error: " . $e->getMessage());
    
    // Salvar erro no webhook
    try {
        $stmt = $conn->prepare("
            UPDATE payment_webhooks 
            SET error_message = ?
            WHERE id = ?
        ");
        $stmt->execute([$e->getMessage(), $webhook_id]);
    } catch (Exception $e2) {
        error_log("Failed to save webhook error: " . $e2->getMessage());
    }
    
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Renovar cliente no painel
 */
function renewClientInPanel($invoice) {
    // Aqui você implementa a lógica específica do seu painel
    // Exemplo para XtreamUI/XUI:
    
    if ($invoice['panel_type'] === 'xtream' || $invoice['panel_type'] === 'xui') {
        $panel_url = rtrim($invoice['panel_url'], '/');
        $api_url = $panel_url . '/api.php';
        
        // Calcular nova data de expiração (timestamp)
        $new_expiry = strtotime('+30 days');
        
        $data = [
            'action' => 'user',
            'sub' => 'edit',
            'username' => $invoice['username'],
            'exp_date' => $new_expiry,
            'enabled' => 1
        ];
        
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            throw new Exception("Falha ao renovar no painel: HTTP {$http_code}");
        }
        
        error_log("Cliente {$invoice['username']} renovado no painel com sucesso");
    }
}

/**
 * Processar pagamento de cliente (fatura)
 */
function processClientPayment($conn, $transaction, $payment_data) {
    // Marcar fatura como paga
    $stmt = $conn->prepare("
        UPDATE invoices 
        SET status = 'paid', 
            payment_date = NOW(),
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$transaction['invoice_id']]);
    
    // Buscar informações completas da fatura e cliente
    $stmt = $conn->prepare("
        SELECT i.*, c.name as client_name, c.phone as client_phone, c.username, c.password,
               pl.name as plan_name, pa.url as panel_url, pa.type as panel_type
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        LEFT JOIN plans pl ON c.plan_id = pl.id
        LEFT JOIN panels pa ON pl.panel_id = pa.id
        WHERE i.id = ?
    ");
    $stmt->execute([$transaction['invoice_id']]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($invoice && $invoice['client_id']) {
        // Calcular nova data de renovação (+30 dias a partir do vencimento)
        $new_renewal_date = date('Y-m-d', strtotime('+30 days', strtotime($invoice['due_date'])));
        
        // Atualizar cliente
        $stmt = $conn->prepare("
            UPDATE clients 
            SET renewal_date = ?, 
                status = 'active',
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$new_renewal_date, $invoice['client_id']]);
        
        // Renovar no painel (se houver integração)
        if ($invoice['panel_url'] && $invoice['username']) {
            try {
                renewClientInPanel($invoice);
            } catch (Exception $e) {
                error_log("Erro ao renovar no painel: " . $e->getMessage());
            }
        }
        
        // Renovar no Sigma (se houver integração)
        try {
            renewClientInSigma($conn, $invoice, $transaction['reseller_id']);
        } catch (Exception $e) {
            error_log("Erro ao renovar no Sigma: " . $e->getMessage());
        }
        
        // Enviar mensagem de agradecimento via WhatsApp
        if ($invoice['client_phone']) {
            try {
                sendPaymentConfirmationWhatsApp($invoice, $transaction['reseller_id'], $conn);
            } catch (Exception $e) {
                error_log("Erro ao enviar WhatsApp: " . $e->getMessage());
            }
        }
    }
}

/**
 * Processar pagamento de assinatura de reseller
 */
function processResellerSubscriptionPayment($conn, $transaction, $payment_data) {
    // Marcar pagamento como aprovado
    $stmt = $conn->prepare("
        UPDATE reseller_payment_history 
        SET status = 'paid',
            notes = CONCAT(COALESCE(notes, ''), ' - Aprovado automaticamente via webhook'),
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$transaction['id']]);
    
    // Buscar informações do plano e reseller
    $stmt = $conn->prepare("
        SELECT rph.*, rsp.duration_days, r.display_name, r.email, r.subscription_expiry_date
        FROM reseller_payment_history rph
        JOIN reseller_subscription_plans rsp ON rph.plan_id = rsp.id
        JOIN resellers r ON rph.reseller_id = r.id
        WHERE rph.id = ?
    ");
    $stmt->execute([$transaction['id']]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($payment) {
        // Calcular nova data de expiração
        $current_date = date('Y-m-d');
        $current_expiry = $payment['subscription_expiry_date'];
        
        // Se não tem data de expiração ou já expirou, começar da data atual
        if (!$current_expiry || $current_expiry < $current_date) {
            $base_date = $current_date;
        } else {
            // Se ainda não expirou, adicionar à data de expiração atual
            $base_date = $current_expiry;
        }
        
        $new_expiry = date('Y-m-d', strtotime($base_date . ' +' . $payment['duration_days'] . ' days'));
        
        // Atualizar assinatura do reseller
        $stmt = $conn->prepare("
            UPDATE resellers 
            SET subscription_expiry_date = ?,
                account_status = 'active',
                subscription_plan_id = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$new_expiry, $payment['plan_id'], $payment['reseller_id']]);
        
        error_log("Assinatura renovada para reseller {$payment['display_name']} de {$current_expiry} para {$new_expiry} (base: {$base_date}, duração: {$payment['duration_days']} dias)");
        
        // TODO: Enviar email/WhatsApp de confirmação para o reseller
    }
}

/**
 * Enviar mensagem de confirmação de pagamento via WhatsApp
 */
function sendPaymentConfirmationWhatsApp($invoice, $reseller_id, $conn) {
    // Buscar template de renovação confirmada (invoice_paid)
    $stmt = $conn->prepare("
        SELECT message FROM whatsapp_templates 
        WHERE reseller_id = ? 
        AND trigger_event = 'invoice_paid' 
        AND is_active = 1 
        LIMIT 1
    ");
    $stmt->execute([$reseller_id]);
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template) {
        error_log("Nenhum template de confirmação de pagamento encontrado");
        return;
    }
    
    // Processar variáveis do template (todas as variáveis disponíveis)
    $due_date = new DateTime($invoice['due_date']);
    $new_due_date = new DateTime($invoice['due_date']);
    $new_due_date->add(new DateInterval('P30D')); // Adicionar 30 dias
    $current_date = new DateTime();
    $current_hour = $current_date->format('H:i');
    $client_value = floatval($invoice['final_value']);
    
    // Formatar data por extenso
    $months = [
        1 => 'janeiro', 2 => 'fevereiro', 3 => 'março', 4 => 'abril',
        5 => 'maio', 6 => 'junho', 7 => 'julho', 8 => 'agosto',
        9 => 'setembro', 10 => 'outubro', 11 => 'novembro', 12 => 'dezembro'
    ];
    $data_extenso = $new_due_date->format('j') . ' de ' . $months[(int)$new_due_date->format('n')] . ' de ' . $new_due_date->format('Y');
    
    // Status do cliente (assumir ativo após pagamento)
    $status_cliente = 'Ativo';
    
    // Mapa completo de variáveis
    $variables = [
        // Cliente
        'CLIENT_NAME' => $invoice['client_name'] ?? '',
        'cliente_nome' => $invoice['client_name'] ?? '',
        'CLIENT_PHONE' => $invoice['client_phone'] ?? '',
        'cliente_telefone' => $invoice['client_phone'] ?? '',
        'USERNAME' => $invoice['client_username'] ?? '',
        'cliente_usuario' => $invoice['client_username'] ?? '',
        
        // Datas
        'DUE_DATE' => $new_due_date->format('d/m/Y'),
        'data_vencimento' => $new_due_date->format('d/m/Y'),
        'nova_data_vencimento' => $new_due_date->format('d/m/Y'),
        'data_vencimento_extenso' => $data_extenso,
        'ano_vencimento' => $new_due_date->format('Y'),
        'mes_vencimento' => $months[(int)$new_due_date->format('n')],
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
        'PLAN_NAME' => $invoice['plan_name'] ?? 'Plano',
        'plano' => $invoice['plan_name'] ?? 'Plano',
        'plano_nome' => $invoice['plan_name'] ?? 'Plano',
        'status_cliente' => $status_cliente,
        'CLIENT_STATUS' => $status_cliente,
        'BUSINESS_NAME' => 'GestPlay',
        'empresa_nome' => 'GestPlay',
        
        // Referência
        'referencia' => $invoice['description'] ?? 'Renovação',
        'REFERENCE' => $invoice['description'] ?? 'Renovação',
        
        // Link de pagamento (não aplicável para pagamento confirmado)
        'link_pagamento' => 'Pagamento já realizado',
        'link_fatura' => 'Pagamento já realizado',
        'PAYMENT_LINK' => 'Pagamento já realizado',
    ];
    
    // Substituir todas as variáveis
    $message = $template['message'];
    foreach ($variables as $key => $value) {
        $message = str_replace('{{' . $key . '}}', $value, $message);
    }
    
    // Formatar telefone
    $phone = preg_replace('/\D/', '', $invoice['client_phone']);
    if (strlen($phone) === 11 || strlen($phone) === 10) {
        $phone = '55' . $phone;
    }
    
    // Extrair ID numérico do reseller_id
    $numeric_id = preg_replace('/\D/', '', $reseller_id);
    if (empty($numeric_id)) {
        $numeric_id = substr(md5($reseller_id), 0, 8);
    }
    $instance_name = "reseller_{$numeric_id}";
    
    // Enviar via WhatsApp
    $whatsapp_url = getenv('WHATSAPP_API_URL') ?: 'http://localhost:3002';
    $whatsapp_key = getenv('WHATSAPP_API_KEY') ?: 'gestplay-api-key-2024';
    
    $ch = curl_init("{$whatsapp_url}/message/sendText/{$instance_name}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $whatsapp_key
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'number' => $phone,
        'text' => $message
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        error_log("WhatsApp de confirmação enviado para {$invoice['client_name']} ({$phone})");
        
        // Criar log
        $log_id = bin2hex(random_bytes(16));
        $stmt = $conn->prepare("
            INSERT INTO whatsapp_invoice_logs 
            (id, invoice_id, client_id, reseller_id, phone, message, sent_at, status)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), 'sent')
        ");
        $stmt->execute([
            $log_id,
            $invoice['id'],
            $invoice['client_id'],
            $reseller_id,
            $phone,
            $message
        ]);
    } else {
        error_log("Falha ao enviar WhatsApp: HTTP {$http_code}");
    }
}

/**
 * Renovar cliente no Sigma (se houver integração)
 * Usa o mesmo método da baixa manual
 */
function renewClientInSigma($conn, $invoice, $reseller_id) {
    // Buscar informações completas do cliente e painel (igual à baixa manual)
    $stmt = $conn->prepare("
        SELECT c.username as client_username,
               p.sigma_connected, 
               p.sigma_url, 
               p.sigma_username, 
               p.sigma_token,
               pl.sigma_package_id
        FROM clients c
        LEFT JOIN panels p ON c.panel_id = p.id
        LEFT JOIN plans pl ON c.plan_id = pl.id
        WHERE c.id = ?
    ");
    $stmt->execute([$invoice['client_id']]);
    $client_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$client_data) {
        error_log("Webhook Sigma: Cliente {$invoice['client_id']} não encontrado");
        return;
    }
    
    // Verificar se Sigma está configurado (mesmas condições da baixa manual)
    if (!$client_data['sigma_connected'] || 
        !$client_data['sigma_url'] || 
        !$client_data['sigma_username'] || 
        !$client_data['sigma_token'] || 
        !$client_data['client_username']) {
        
        error_log("Webhook Sigma: Integração não disponível para cliente {$invoice['client_id']}");
        error_log("Webhook Sigma: sigma_connected=" . ($client_data['sigma_connected'] ? '1' : '0'));
        error_log("Webhook Sigma: sigma_url=" . ($client_data['sigma_url'] ?: 'empty'));
        error_log("Webhook Sigma: client_username=" . ($client_data['client_username'] ?: 'empty'));
        return;
    }
    
    error_log("Webhook Sigma: Renovando cliente {$client_data['client_username']}");
    
    // Usar o mesmo método da baixa manual: /api/webhook/customer/renew
    $package_id = $client_data['sigma_package_id'] ?? 'BV4D3rLaqZ'; // Default package ID
    
    $sigma_data = [
        'username' => $client_data['client_username'],
        'packageId' => $package_id
    ];
    
    $url = rtrim($client_data['sigma_url'], '/') . '/api/webhook/customer/renew';
    $post_data = json_encode($sigma_data);
    
    error_log("Webhook Sigma: URL: " . $url);
    error_log("Webhook Sigma: POST data: " . $post_data);
    
    $context_options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $client_data['sigma_token'],
                'Content-Length: ' . strlen($post_data)
            ],
            'content' => $post_data,
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ];
    
    $context = stream_context_create($context_options);
    $sigma_response = @file_get_contents($url, false, $context);
    
    // Verificar resposta HTTP
    $http_response_header_array = $http_response_header ?? [];
    $http_code = 0;
    if (!empty($http_response_header_array)) {
        preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header_array[0], $matches);
        $http_code = isset($matches[1]) ? (int)$matches[1] : 0;
    }
    
    error_log("Webhook Sigma: HTTP Code: " . $http_code);
    error_log("Webhook Sigma: Response: " . ($sigma_response ?: 'empty'));
    
    if ($sigma_response !== false && $http_code >= 200 && $http_code < 300) {
        $sigma_json = json_decode($sigma_response, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            error_log("Webhook Sigma: Cliente {$client_data['client_username']} renovado com sucesso!");
        } else {
            error_log("Webhook Sigma: Resposta inválida: " . json_last_error_msg());
        }
    } else {
        error_log("Webhook Sigma: Falha HTTP {$http_code}");
    }
}
