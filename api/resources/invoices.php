<?php
/**
 * Invoices Resource Handler
 */

error_log("Invoices Debug - Starting invoices.php");
error_log("Invoices Debug - Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));
error_log("Invoices Debug - Path: " . ($_SERVER['REQUEST_URI'] ?? 'UNKNOWN'));

// Set environment variables for database connection
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_NAME=iptv_manager');
putenv('DB_USER=iptv_app');
putenv('DB_PASS=IptvManager2025!Secure');

// Don't include auth.php directly to avoid execution
// Just include security.php for the classes
require_once __DIR__ . '/../../database/config.php';

error_log("Invoices Debug - Required files loaded");

// Require authentication
try {
    $user = Auth::requireAuth();
    $reseller_id = $user['reseller_id'];
    error_log("Invoices Debug - Authentication successful, reseller_id: " . $reseller_id);
} catch (Exception $e) {
    error_log("Invoices Debug - Authentication failed: " . $e->getMessage());
    Response::error('Authentication required', 401);
}

// Get global variables from index.php
global $method, $path_parts;

// Debug logging
error_log("Invoices Debug - Method: " . $method);
error_log("Invoices Debug - Path parts: " . print_r($path_parts, true));

$conn = getDbConnection();

// Get ID from path if present
$id = $path_parts[1] ?? null;

error_log("Invoices Debug - Entering switch with method: " . $method);

switch ($method) {
    case 'GET':
        error_log("Invoices Debug - Processing GET request");
        if ($id) {
            // Get single invoice
            $stmt = $conn->prepare("SELECT * FROM invoices WHERE id = ?");
            $stmt->execute([$id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($invoice) {
                Response::json($invoice);
            } else {
                Response::error('Invoice not found', 404);
            }
        } else {
            // Get all invoices
            error_log("Invoices Debug - Getting all invoices for reseller: " . $reseller_id);
            
            $stmt = $conn->prepare("SELECT * FROM invoices WHERE reseller_id = ? ORDER BY created_at DESC");
            $stmt->execute([$reseller_id]);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map database fields to frontend interface
            foreach ($invoices as &$invoice) {
                // Map 'date' to 'issue_date' for frontend compatibility
                $invoice['issue_date'] = $invoice['date'];
                
                // Add missing fields with default values
                $invoice['discount'] = $invoice['discount'] ?? 0;
                $invoice['final_value'] = $invoice['final_value'] ?? ($invoice['value'] - $invoice['discount']);
                $invoice['payment_date'] = $invoice['payment_date'] ?? null;
                $invoice['payment_method'] = $invoice['payment_method'] ?? null;
                $invoice['description'] = $invoice['description'] ?? $invoice['notes'];
                
                // Remove old field names to avoid confusion
                unset($invoice['date']);
            }
            
            error_log("Invoices Debug - Found " . count($invoices) . " invoices");
            Response::json(['invoices' => $invoices]);
        }
        break;
        
    case 'POST':
        // Check if this is a mark-paid request
        if ($id && isset($path_parts[2]) && $path_parts[2] === 'mark-paid') {
            // Redirect to invoices-payment.php
            require_once __DIR__ . '/invoices-payment.php';
            exit;
        }
        
        // Check if this is an unmark-paid request
        if ($id && isset($path_parts[2]) && $path_parts[2] === 'unmark-paid') {
            // Redirect to invoices-unmark-paid.php
            require_once __DIR__ . '/invoices-unmark-paid.php';
            exit;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Map frontend fields to database fields
        $value = $data['value'] ?? 0;
        $discount = $data['discount'] ?? 0;
        $final_value = $data['final_value'] ?? ($value - $discount);
        
        $invoice_id = $data['id'] ?? uniqid('inv_');
        
        error_log("Invoice Debug - Creating invoice: " . $invoice_id);
        error_log("Invoice Debug - Data: " . json_encode($data));
        
        // Usar apenas colunas que existem na tabela
        $stmt = $conn->prepare("INSERT INTO invoices (id, reseller_id, client_id, invoice_number, date, due_date, value, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([
            $invoice_id,
            $reseller_id,
            $data['client_id'],
            $data['invoice_number'] ?? null,
            $data['issue_date'] ?? date('Y-m-d'),
            $data['due_date'],
            $final_value, // Usar final_value como value
            $data['status'] ?? 'pending',
            $data['description'] ?? $data['notes'] ?? null
        ]);
        
        error_log("Invoice Debug - Invoice created: " . ($result ? 'YES' : 'NO'));
        
        if ($result) {
            error_log("Invoice Debug - Starting payment link generation");
            // Gerar link de pagamento automaticamente
            $payment_link = null;
            try {
                // Buscar método de pagamento padrão ativo
                $stmt = $conn->prepare("
                    SELECT * FROM payment_methods 
                    WHERE reseller_id = ? AND is_active = 1 AND is_default = 1
                    LIMIT 1
                ");
                $stmt->execute([$reseller_id]);
                $payment_method = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log("Payment Method Debug - Found: " . ($payment_method ? 'YES' : 'NO'));
                if ($payment_method) {
                    error_log("Payment Method Debug - Type: " . $payment_method['method_type']);
                    error_log("Payment Method Debug - Has MP Token: " . ($payment_method['mp_access_token'] ? 'YES' : 'NO'));
                }
                
                if ($payment_method) {
                    $transaction_id = bin2hex(random_bytes(16));
                    $app_url = getenv('APP_URL') ?: 'http://localhost:9002';
                    $external_id = null;
                    $qr_code = null;
                    $pix_code = null;
                    
                    if ($payment_method['method_type'] === 'mercadopago') {
                        // Integração Mercado Pago
                        try {
                            // Buscar dados do cliente
                            $stmt = $conn->prepare("SELECT name, email, phone FROM clients WHERE id = ?");
                            $stmt->execute([$data['client_id']]);
                            $client = $stmt->fetch(PDO::FETCH_ASSOC);
                            
                            // Usar final_value (valor com desconto) em vez de value
                            // Garantir que o email não esteja vazio
                            $client_email = !empty($client['email']) ? $client['email'] : 'cliente@exemplo.com';
                            $client_name = !empty($client['name']) ? $client['name'] : 'Cliente';
                            
                            $mp_data = [
                                'transaction_amount' => (float)$final_value,
                                'description' => $data['description'] ?? "Fatura #{$invoice_id}",
                                'payment_method_id' => 'pix',
                                'payer' => [
                                    'email' => $client_email,
                                    'first_name' => $client_name,
                                ],
                                'external_reference' => $invoice_id
                            ];
                            
                            // Adicionar notification_url apenas se for uma URL pública válida
                            if (strpos($app_url, 'localhost') === false && strpos($app_url, '127.0.0.1') === false) {
                                $mp_data['notification_url'] = $app_url . '/api/webhooks/mercadopago';
                            }
                            
                            error_log("Mercado Pago Debug - Sending request with amount: " . $final_value);
                            error_log("Mercado Pago Debug - Access Token: " . (empty($payment_method['mp_access_token']) ? 'EMPTY' : 'EXISTS'));
                            
                            // Gerar chave de idempotência única
                            $idempotency_key = uniqid('mp_', true);
                            
                            $ch = curl_init('https://api.mercadopago.com/v1/payments');
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_POST, true);
                            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($mp_data));
                            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                                'Content-Type: application/json',
                                'Authorization: Bearer ' . $payment_method['mp_access_token'],
                                'X-Idempotency-Key: ' . $idempotency_key
                            ]);
                            // Desabilitar verificação SSL (apenas para desenvolvimento)
                            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                            
                            $response = curl_exec($ch);
                            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                            $curl_error = curl_error($ch);
                            curl_close($ch);
                            
                            error_log("Mercado Pago Debug - HTTP Code: " . $http_code);
                            error_log("Mercado Pago Debug - Response: " . $response);
                            if ($curl_error) {
                                error_log("Mercado Pago Debug - cURL Error: " . $curl_error);
                            }
                            
                            if ($http_code === 201) {
                                $mp_response = json_decode($response, true);
                                $external_id = $mp_response['id'] ?? null;
                                $payment_link = $mp_response['point_of_interaction']['transaction_data']['ticket_url'] ?? null;
                                $qr_code = $mp_response['point_of_interaction']['transaction_data']['qr_code_base64'] ?? null;
                                $pix_code = $mp_response['point_of_interaction']['transaction_data']['qr_code'] ?? null;
                                error_log("Mercado Pago Debug - Payment Link: " . ($payment_link ?: 'NULL'));
                                error_log("Mercado Pago Debug - External ID: " . ($external_id ?: 'NULL'));
                            } else {
                                error_log("Mercado Pago API error - HTTP " . $http_code . ": " . $response);
                                // Tentar decodificar erro
                                $error_response = json_decode($response, true);
                                if ($error_response && isset($error_response['message'])) {
                                    error_log("Mercado Pago Error Message: " . $error_response['message']);
                                }
                            }
                        } catch (Exception $e) {
                            error_log("Erro Mercado Pago: " . $e->getMessage());
                            error_log("Mercado Pago Stack Trace: " . $e->getTraceAsString());
                        }
                    }
                    
                    // Salvar transação
                    if ($payment_link) {
                        error_log("Payment Link Debug - Saving transaction with link: " . $payment_link);
                        $stmt = $conn->prepare("
                            INSERT INTO payment_transactions (
                                id, reseller_id, invoice_id, payment_method_id, method_type,
                                external_id, payment_link, qr_code, pix_code, status, amount, expires_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
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
                            $final_value // Usar final_value em vez de value
                        ]);
                        
                        // Usar nosso checkout personalizado (apenas PIX)
                        $custom_checkout_link = $app_url . "/checkout/pix/" . $transaction_id;
                        
                        error_log("Payment Link Debug - Transaction saved, updating invoice with custom checkout");
                        // Atualizar fatura com link personalizado
                        $stmt = $conn->prepare("UPDATE invoices SET payment_link = ?, payment_method_id = ? WHERE id = ?");
                        $stmt->execute([$custom_checkout_link, $payment_method['id'], $invoice_id]);
                        error_log("Payment Link Debug - Invoice updated with custom checkout link: " . $custom_checkout_link);
                        
                        // Atualizar variável para retornar o link personalizado
                        $payment_link = $custom_checkout_link;
                    } else {
                        error_log("Payment Link Debug - No payment link generated, skipping transaction save");
                    }
                }
            } catch (Exception $e) {
                error_log("Erro ao gerar link de pagamento: " . $e->getMessage());
            }
            
            Response::json([
                'id' => $invoice_id, 
                'message' => 'Invoice created',
                'payment_link' => $payment_link
            ], 201);
        } else {
            Response::error('Failed to create invoice', 500);
        }
        break;
        
    case 'PUT':
        error_log("Invoices Debug - PUT method called");
        if (!$id) {
            error_log("Invoices Debug - No ID provided");
            Response::error('Invoice ID required', 400);
        }
        
        error_log("Invoices Debug - Invoice ID: " . $id);
        $data = json_decode(file_get_contents('php://input'), true);
        error_log("Invoices Debug - PUT data: " . print_r($data, true));
        
        // Map frontend fields to database fields
        $payment_date = isset($data['payment_date']) && $data['payment_date'] !== null ? $data['payment_date'] : null;
        
        $stmt = $conn->prepare("UPDATE invoices SET status = ?, value = ?, notes = ?, payment_date = ? WHERE id = ? AND reseller_id = ?");
        $result = $stmt->execute([
            $data['status'],
            $data['value'] ?? null,
            $data['description'] ?? $data['notes'] ?? null, // Use description as notes
            $payment_date,
            $id,
            $reseller_id
        ]);
        
        error_log("Invoices Debug - PUT result: " . ($result ? 'success' : 'failed'));
        
        if ($result) {
            Response::json(['message' => 'Invoice updated']);
        } else {
            Response::error('Failed to update invoice', 500);
        }
        break;
        
    case 'DELETE':
        error_log("Invoices Debug - DELETE method called");
        if (!$id) {
            error_log("Invoices Debug - No ID provided for DELETE");
            Response::error('Invoice ID required', 400);
        }
        
        error_log("Invoices Debug - Deleting invoice ID: " . $id . " for reseller: " . $reseller_id);
        
        // First check if invoice exists and belongs to this reseller
        $stmt = $conn->prepare("SELECT id FROM invoices WHERE id = ? AND reseller_id = ?");
        $stmt->execute([$id, $reseller_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            error_log("Invoices Debug - Invoice not found or doesn't belong to reseller");
            Response::error('Invoice not found', 404);
        }
        
        // Delete the invoice
        $stmt = $conn->prepare("DELETE FROM invoices WHERE id = ? AND reseller_id = ?");
        $result = $stmt->execute([$id, $reseller_id]);
        
        error_log("Invoices Debug - DELETE result: " . ($result ? 'success' : 'failed'));
        error_log("Invoices Debug - Rows affected: " . $stmt->rowCount());
        
        if ($result && $stmt->rowCount() > 0) {
            error_log("Invoices Debug - Invoice deleted successfully");
            Response::json(['success' => true, 'message' => 'Invoice deleted']);
        } else {
            error_log("Invoices Debug - Failed to delete invoice");
            Response::error('Failed to delete invoice', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}