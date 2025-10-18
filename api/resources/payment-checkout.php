<?php
/**
 * Payment Checkout API
 * Gera links de pagamento e processa checkouts
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Remove 'payment-checkout' from path_parts
array_shift($path_parts);
$path_parts = array_values($path_parts);

// GET não precisa de autenticação (checkout público)
// POST precisa de autenticação
$reseller_id = null;
if ($method === 'POST') {
    $user = Auth::requireAuth();
    $reseller_id = $user['reseller_id'];
}

// GET /payment-checkout/:transaction_id - Buscar dados da transação (público)
if ($method === 'GET' && count($path_parts) === 1) {
    $transaction_id = $path_parts[0];
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                pt.id,
                pt.method_type,
                pt.payment_link,
                pt.qr_code,
                pt.pix_code,
                pt.status,
                pt.amount,
                i.invoice_number,
                i.value as final_value,
                i.notes as description,
                i.due_date,
                c.name as client_name,
                pm.pix_holder_name,
                pm.pix_key_type
            FROM payment_transactions pt
            LEFT JOIN invoices i ON pt.invoice_id = i.id
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN payment_methods pm ON pt.payment_method_id = pm.id
            WHERE pt.id = ?
        ");
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            Response::error('Transaction not found', 404);
        }
        
        Response::json($transaction);
    } catch (Exception $e) {
        Response::error('Failed to fetch transaction: ' . $e->getMessage(), 500);
    }
}

// POST /payment-checkout/generate - Gerar link de pagamento para fatura
if ($method === 'POST' && isset($path_parts[0]) && $path_parts[0] === 'generate') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['invoice_id'])) {
        Response::error('invoice_id is required', 400);
    }
    
    $invoice_id = $data['invoice_id'];
    
    try {
        $conn->beginTransaction();
        
        // Buscar fatura
        $stmt = $conn->prepare("
            SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.id = ? AND i.reseller_id = ?
        ");
        $stmt->execute([$invoice_id, $reseller_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            Response::error('Invoice not found', 404);
        }
        
        // Buscar método de pagamento padrão ou especificado
        $payment_method_id = $data['payment_method_id'] ?? null;
        
        if ($payment_method_id) {
            $stmt = $conn->prepare("
                SELECT * FROM payment_methods 
                WHERE id = ? AND reseller_id = ? AND is_active = TRUE
            ");
            $stmt->execute([$payment_method_id, $reseller_id]);
        } else {
            $stmt = $conn->prepare("
                SELECT * FROM payment_methods 
                WHERE reseller_id = ? AND is_active = TRUE AND is_default = TRUE
                LIMIT 1
            ");
            $stmt->execute([$reseller_id]);
        }
        
        $payment_method = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$payment_method) {
            Response::error('No active payment method found', 400);
        }
        
        $transaction_id = bin2hex(random_bytes(16));
        $payment_link = null;
        $qr_code = null;
        $pix_code = null;
        $external_id = null;
        $gateway_response = null;
        
        // Processar conforme método
        switch ($payment_method['method_type']) {
            case 'mercadopago':
                // Integração Mercado Pago
                $mp_data = [
                    'transaction_amount' => (float)$invoice['final_value'],
                    'description' => $invoice['description'] ?? "Fatura #{$invoice['invoice_number']}",
                    'payment_method_id' => 'pix',
                    'payer' => [
                        'email' => $invoice['client_email'] ?? 'cliente@email.com',
                        'first_name' => $invoice['client_name'] ?? 'Cliente',
                    ],
                    'notification_url' => getenv('APP_URL') . '/api/webhooks/mercadopago',
                    'external_reference' => $invoice_id
                ];
                
                $ch = curl_init('https://api.mercadopago.com/v1/payments');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($mp_data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $payment_method['mp_access_token']
                ]);
                // Desabilitar verificação SSL (apenas para desenvolvimento)
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($http_code === 201) {
                    $mp_response = json_decode($response, true);
                    $external_id = $mp_response['id'];
                    $payment_link = $mp_response['point_of_interaction']['transaction_data']['ticket_url'] ?? null;
                    $qr_code = $mp_response['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null;
                    $pix_code = $mp_response['point_of_interaction']['transaction_data']['qr_code'] ?? null;
                    $gateway_response = $mp_response;
                } else {
                    throw new Exception('Mercado Pago API error: ' . $response);
                }
                break;
                
            case 'asaas':
                // Integração Asaas
                $asaas_data = [
                    'customer' => $invoice['client_email'] ?? 'cliente@email.com',
                    'billingType' => 'PIX',
                    'value' => (float)$invoice['final_value'],
                    'dueDate' => $invoice['due_date'],
                    'description' => $invoice['description'] ?? "Fatura #{$invoice['invoice_number']}",
                    'externalReference' => $invoice_id
                ];
                
                $ch = curl_init('https://www.asaas.com/api/v3/payments');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($asaas_data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'access_token: ' . $payment_method['asaas_api_key']
                ]);
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($http_code === 200 || $http_code === 201) {
                    $asaas_response = json_decode($response, true);
                    $external_id = $asaas_response['id'];
                    $payment_link = $asaas_response['invoiceUrl'] ?? null;
                    
                    // Buscar QR Code PIX
                    if ($external_id) {
                        $ch = curl_init("https://www.asaas.com/api/v3/payments/{$external_id}/pixQrCode");
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            'access_token: ' . $payment_method['asaas_api_key']
                        ]);
                        
                        $pix_response = curl_exec($ch);
                        curl_close($ch);
                        
                        $pix_data = json_decode($pix_response, true);
                        $qr_code = $pix_data['encodedImage'] ?? null;
                        $pix_code = $pix_data['payload'] ?? null;
                    }
                    
                    $gateway_response = $asaas_response;
                } else {
                    throw new Exception('Asaas API error: ' . $response);
                }
                break;
                
            case 'pix_manual':
                // PIX Manual - gerar link interno
                $payment_link = getenv('APP_URL') . "/checkout/pix/{$transaction_id}";
                $pix_code = $payment_method['pix_key'];
                break;
        }
        
        // Salvar transação
        $stmt = $conn->prepare("
            INSERT INTO payment_transactions (
                id, reseller_id, invoice_id, payment_method_id, method_type,
                external_id, payment_link, qr_code, pix_code, status, amount,
                gateway_response, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
        ");
        
        $stmt->execute([
            $transaction_id,
            $reseller_id,
            $invoice_id,
            $payment_method['id'],
            $payment_method['method_type'],
            $external_id,
            $payment_link,
            $qr_code,
            $pix_code,
            $invoice['final_value'],
            json_encode($gateway_response)
        ]);
        
        // Atualizar fatura com link
        $stmt = $conn->prepare("
            UPDATE invoices 
            SET payment_link = ?, payment_method_id = ? 
            WHERE id = ?
        ");
        $stmt->execute([$payment_link, $payment_method['id'], $invoice_id]);
        
        $conn->commit();
        
        Response::json([
            'success' => true,
            'transaction_id' => $transaction_id,
            'payment_link' => $payment_link,
            'qr_code' => $qr_code,
            'pix_code' => $pix_code,
            'method_type' => $payment_method['method_type'],
            'external_id' => $external_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        Response::error('Failed to generate payment: ' . $e->getMessage(), 500);
    }
}

// GET /payment-checkout/:transaction_id - Buscar dados do checkout
if ($method === 'GET' && count($path_parts) === 1) {
    $transaction_id = $path_parts[0];
    
    error_log("Payment Checkout Debug - GET transaction_id: " . $transaction_id);
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                pt.*,
                i.invoice_number,
                i.final_value,
                i.notes as description,
                i.due_date,
                c.name as client_name,
                pm.pix_holder_name,
                pm.pix_key_type
            FROM payment_transactions pt
            LEFT JOIN invoices i ON pt.invoice_id = i.id
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN payment_methods pm ON pt.payment_method_id = pm.id
            WHERE pt.id = ?
        ");
        $stmt->execute([$transaction_id]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            Response::error('Transaction not found', 404);
        }
        
        Response::json($transaction);
    } catch (Exception $e) {
        Response::error('Failed to fetch transaction: ' . $e->getMessage(), 500);
    }
}

Response::error('Invalid endpoint', 404);
