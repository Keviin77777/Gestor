<?php
/**
 * Asaas Webhook Handler
 * Processa notificações de pagamento do Asaas
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
error_log("Asaas Webhook received: " . $payload);

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
        ) VALUES (?, 'asaas', ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $webhook_id,
        $data['event'] ?? 'unknown',
        $data['payment']['id'] ?? null,
        $payload
    ]);
    
    // Processar eventos de pagamento
    $event = $data['event'] ?? '';
    $payment_id = $data['payment']['id'] ?? null;
    
    if ($payment_id && in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED'])) {
        // Buscar transação em payment_transactions (pagamentos de clientes)
        $stmt = $conn->prepare("
            SELECT pt.*, i.reseller_id, i.due_date, i.client_id, 'client' as payment_type
            FROM payment_transactions pt
            JOIN invoices i ON pt.invoice_id = i.id
            WHERE pt.external_id = ? AND pt.method_type = 'asaas'
        ");
        $stmt->execute([$payment_id]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Se não encontrou, tentar em reseller_payment_history (assinaturas de resellers)
        if (!$transaction) {
            error_log("Webhook Asaas: Não encontrou em payment_transactions, tentando reseller_payment_history");
            
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
            
            if ($columnExists) {
                $stmt = $conn->prepare("
                    SELECT rph.*, rph.reseller_id, 'reseller' as payment_type
                    FROM reseller_payment_history rph
                    WHERE rph.external_id = ?
                ");
                $stmt->execute([$payment_id]);
                $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log("Webhook Asaas: Encontrou transação de reseller: " . ($transaction ? 'SIM' : 'NÃO'));
            }
        }
        
        if ($transaction) {
            $conn->beginTransaction();
            
            // Mapear status do Asaas
            $mapped_status = 'pending';
            if (in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])) {
                $mapped_status = 'approved';
            } elseif ($event === 'PAYMENT_OVERDUE') {
                $mapped_status = 'rejected';
            } elseif ($event === 'PAYMENT_DELETED') {
                $mapped_status = 'cancelled';
            }
            
            // Atualizar transação
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
                $data['payment']['value'] ?? null,
                in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']) ? date('Y-m-d H:i:s') : null,
                json_encode($data['payment']),
                $transaction['id']
            ]);
            
            // Se aprovado, processar baseado no tipo de pagamento
            if (in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])) {
                if ($transaction['payment_type'] === 'client') {
                    // Processar pagamento de cliente (fatura)
                    $stmt = $conn->prepare("
                        UPDATE invoices 
                        SET status = 'paid', 
                            payment_date = NOW(),
                            payment_method = 'Asaas',
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$transaction['invoice_id']]);
                    
                    // Atualizar data de renovação do cliente
                    if ($transaction['client_id']) {
                        $new_renewal_date = date('Y-m-d', strtotime('+1 month', strtotime($transaction['due_date'])));
                        
                        $stmt = $conn->prepare("
                            UPDATE clients 
                            SET renewal_date = ?, status = 'active', updated_at = NOW()
                            WHERE id = ?
                        ");
                        $stmt->execute([$new_renewal_date, $transaction['client_id']]);
                        
                        // Buscar informações completas para renovação
                        $stmt = $conn->prepare("
                            SELECT i.*, c.name as client_name, c.phone as client_phone, c.username as client_username
                            FROM invoices i
                            JOIN clients c ON i.client_id = c.id
                            WHERE i.id = ?
                        ");
                        $stmt->execute([$transaction['invoice_id']]);
                        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($invoice) {
                            // Renovar no Sigma (se houver integração)
                            try {
                                renewClientInSigma($conn, $invoice, $transaction['reseller_id']);
                            } catch (Exception $e) {
                                error_log("Erro ao renovar no Sigma: " . $e->getMessage());
                            }
                            
                            // Enviar mensagem de confirmação via WhatsApp
                            if ($invoice['client_phone']) {
                                try {
                                    sendPaymentConfirmationWhatsApp($invoice, $transaction['reseller_id'], $conn);
                                } catch (Exception $e) {
                                    error_log("Erro ao enviar WhatsApp: " . $e->getMessage());
                                }
                            }
                        }
                    }
                } elseif ($transaction['payment_type'] === 'reseller') {
                    // Processar pagamento de assinatura de reseller
                    processResellerSubscriptionPaymentAsaas($conn, $transaction, $data['payment']);
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
    
    http_response_code(200);
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollback();
    }
    
    error_log("Asaas Webhook Error: " . $e->getMessage());
    
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
 * Processar pagamento de assinatura de reseller (Asaas)
 */
function processResellerSubscriptionPaymentAsaas($conn, $transaction, $payment_data) {
    // Marcar pagamento como aprovado
    $stmt = $conn->prepare("
        UPDATE reseller_payment_history 
        SET status = 'paid',
            notes = CONCAT(COALESCE(notes, ''), ' - Aprovado automaticamente via webhook Asaas'),
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
        
        error_log("Assinatura renovada via Asaas para reseller {$payment['display_name']} de {$current_expiry} para {$new_expiry} (base: {$base_date}, duração: {$payment['duration_days']} dias)");
    }
}


// Incluir funções compartilhadas do webhook do Mercado Pago
require_once __DIR__ . '/mercadopago.php';
