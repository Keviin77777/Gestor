<?php
/**
 * Invoice Payment Handler
 * Handles marking invoices as paid with Sigma integration
 */

// Don't include auth.php directly to avoid execution
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Get invoice ID from path
$invoice_id = $path_parts[1] ?? null;

if (!$invoice_id) {
    Response::error('Invoice ID required', 400);
}

if ($method !== 'POST') {
    Response::error('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$payment_date = $data['payment_date'] ?? date('Y-m-d');

try {
    // Start transaction
    $conn->beginTransaction();
    
    // Get invoice details with client phone for WhatsApp
    $stmt = $conn->prepare("
        SELECT i.*, 
               c.id as client_id,
               c.name as client_name, 
               c.username as client_username,
               c.phone as client_phone,
               c.renewal_date, 
               c.plan_id, 
               p.sigma_connected, 
               p.sigma_url, 
               p.sigma_username, 
               p.sigma_token,
               pl.name as plan_name,
               pl.sigma_package_id
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN panels p ON c.panel_id = p.id
        LEFT JOIN plans pl ON c.plan_id = pl.id
        WHERE i.id = ? AND i.reseller_id = ?
    ");
    $stmt->execute([$invoice_id, $reseller_id]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$invoice) {
        $conn->rollback();
        Response::error('Invoice not found', 404);
    }
    
    // Update invoice status
    $stmt = $conn->prepare("
        UPDATE invoices 
        SET status = 'paid', payment_date = ?, updated_at = NOW() 
        WHERE id = ? AND reseller_id = ?
    ");
    $stmt->execute([$payment_date, $invoice_id, $reseller_id]);
    
    $response = [
        'success' => true,
        'message' => 'Invoice marked as paid',
        'invoice' => [
            'id' => $invoice['id'],
            'status' => 'paid',
            'payment_date' => $payment_date
        ],
        'client_updated' => false,
        'sigma_renewed' => false
    ];
    
    // If invoice has a client, update renewal date
    if ($invoice['client_id']) {
        // Calculate new renewal date based on the invoice due date, not payment date
        $new_renewal_date = date('Y-m-d', strtotime('+1 month', strtotime($invoice['due_date'])));
        
        $stmt = $conn->prepare("
            UPDATE clients 
            SET renewal_date = ?, updated_at = NOW() 
            WHERE id = ? AND reseller_id = ?
        ");
        $stmt->execute([$new_renewal_date, $invoice['client_id'], $reseller_id]);
        
        $response['client_updated'] = true;
        $response['new_renewal_date'] = $new_renewal_date;
        
        // Try Sigma integration if panel is connected and client has username
        if ($invoice['sigma_connected'] && $invoice['sigma_url'] && $invoice['sigma_username'] && $invoice['sigma_token'] && $invoice['client_username']) {
            try {
                error_log("Sigma Debug - Starting Sigma integration");
                error_log("Sigma Debug - sigma_url: " . $invoice['sigma_url']);
                error_log("Sigma Debug - client_username: " . $invoice['client_username']);
                error_log("Sigma Debug - new_renewal_date: " . $new_renewal_date);
                
                // Call Sigma API to renew client using file_get_contents
                // Get the package ID from the client's plan
                $package_id = $invoice['sigma_package_id'] ?? 'BV4D3rLaqZ'; // Default package ID
                
                $sigma_data = [
                    'username' => $invoice['client_username'], // Use client username from database
                    'packageId' => $package_id
                ];
                
                $url = rtrim($invoice['sigma_url'], '/') . '/api/webhook/customer/renew';
                $post_data = json_encode($sigma_data);
                
                error_log("Sigma Debug - URL: " . $url);
                error_log("Sigma Debug - POST data: " . $post_data);
                
                $context_options = [
                    'http' => [
                        'method' => 'POST',
                        'header' => [
                            'Content-Type: application/json',
                            'Authorization: Bearer ' . $invoice['sigma_token'],
                            'Content-Length: ' . strlen($post_data)
                        ],
                        'content' => $post_data,
                        'timeout' => 10
                    ]
                ];
                
                $context = stream_context_create($context_options);
                $sigma_response = file_get_contents($url, false, $context);
                
                error_log("Sigma Debug - Response: " . $sigma_response);
                
                // Check if request was successful
                if ($sigma_response !== false) {
                    // Try to decode JSON response
                    $sigma_json = json_decode($sigma_response, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $response['sigma_renewed'] = true;
                        $response['message'] = 'Invoice marked as paid and client renewed';
                        $response['sigma_response'] = $sigma_json;
                    } else {
                        $response['sigma_error'] = 'Sigma API returned invalid JSON: ' . json_last_error_msg();
                        $response['sigma_raw_response'] = $sigma_response;
                    }
                } else {
                    $response['sigma_error'] = 'Sigma API request failed';
                }
            } catch (Exception $e) {
                error_log("Sigma Debug - Exception: " . $e->getMessage());
                $response['sigma_error'] = 'Sigma integration failed: ' . $e->getMessage();
            }
        } else {
            error_log("Sigma Debug - Integration skipped");
            error_log("Sigma Debug - sigma_connected: " . ($invoice['sigma_connected'] ? 'true' : 'false'));
            error_log("Sigma Debug - sigma_url: " . ($invoice['sigma_url'] ?: 'empty'));
            error_log("Sigma Debug - sigma_username (panel): " . ($invoice['sigma_username'] ?: 'empty'));
            error_log("Sigma Debug - sigma_token: " . ($invoice['sigma_token'] ? 'present' : 'empty'));
            error_log("Sigma Debug - client_username: " . ($invoice['client_username'] ?: 'empty'));
            
            if (!$invoice['client_username']) {
                $response['sigma_error'] = 'Cliente não possui username configurado para sincronização com Sigma';
            }
        }
    }
    
    // Send WhatsApp renewal confirmation if client has phone
    if ($invoice['client_id'] && $invoice['client_phone']) {
        try {
            error_log("WhatsApp Debug - Starting WhatsApp notification");
            error_log("WhatsApp Debug - client_phone: " . $invoice['client_phone']);
            
            // Get renewal template from database
            $stmt = $conn->prepare("
                SELECT message 
                FROM whatsapp_templates 
                WHERE reseller_id = ? AND trigger_event = 'invoice_paid' AND is_active = 1 
                LIMIT 1
            ");
            $stmt->execute([$reseller_id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($template) {
                // Format date for display
                $formatted_date = date('d/m/Y', strtotime($new_renewal_date));
                
                // Replace template variables
                $message = $template['message'];
                $message = str_replace('{{cliente_nome}}', $invoice['client_name'], $message);
                $message = str_replace('{{data_vencimento}}', $formatted_date, $message);
                $message = str_replace('{{valor}}', number_format($invoice['value'], 2, ',', '.'), $message);
                $message = str_replace('{{plano}}', $invoice['plan_name'] ?? 'Plano', $message);
                
                error_log("WhatsApp Debug - Message: " . $message);
                
                // Format phone number (Brazilian format)
                $phone = preg_replace('/\D/', '', $invoice['client_phone']);
                if (strlen($phone) === 11 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
                    $phone = '55' . $phone;
                } elseif (strlen($phone) === 10 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
                    $phone = '55' . $phone;
                }
                
                error_log("WhatsApp Debug - Formatted phone: " . $phone);
                
                // Get WhatsApp API credentials from environment
                $whatsapp_url = getenv('WHATSAPP_API_URL') ?: '';
                $whatsapp_key = getenv('WHATSAPP_API_KEY') ?: '';
                
                if ($whatsapp_url && $whatsapp_key) {
                    $whatsapp_data = [
                        'number' => $phone,
                        'text' => $message
                    ];
                    
                    $whatsapp_url = rtrim($whatsapp_url, '/') . '/message/sendText/gestplay-instance';
                    $whatsapp_post = json_encode($whatsapp_data);
                    
                    error_log("WhatsApp Debug - URL: " . $whatsapp_url);
                    
                    $whatsapp_context = [
                        'http' => [
                            'method' => 'POST',
                            'header' => [
                                'Content-Type: application/json',
                                'apikey: ' . $whatsapp_key,
                                'Content-Length: ' . strlen($whatsapp_post)
                            ],
                            'content' => $whatsapp_post,
                            'timeout' => 10,
                            'ignore_errors' => true
                        ]
                    ];
                    
                    $whatsapp_stream = stream_context_create($whatsapp_context);
                    $whatsapp_result = @file_get_contents($whatsapp_url, false, $whatsapp_stream);
                    
                    if ($whatsapp_result !== false) {
                        error_log("WhatsApp Debug - Success: " . $whatsapp_result);
                        $response['whatsapp_sent'] = true;
                        $response['whatsapp_response'] = json_decode($whatsapp_result, true);
                    } else {
                        error_log("WhatsApp Debug - Failed to send");
                        $response['whatsapp_sent'] = false;
                        $response['whatsapp_error'] = 'Failed to send WhatsApp message';
                    }
                } else {
                    error_log("WhatsApp Debug - API not configured");
                    $response['whatsapp_sent'] = false;
                    $response['whatsapp_error'] = 'WhatsApp API not configured';
                }
            } else {
                error_log("WhatsApp Debug - No renewal template found");
                $response['whatsapp_sent'] = false;
                $response['whatsapp_error'] = 'No renewal template configured';
            }
        } catch (Exception $e) {
            error_log("WhatsApp Debug - Exception: " . $e->getMessage());
            $response['whatsapp_sent'] = false;
            $response['whatsapp_error'] = $e->getMessage();
        }
    }
    
    $conn->commit();
    Response::json($response);
    
} catch (Exception $e) {
    $conn->rollback();
    Response::error('Failed to process payment: ' . $e->getMessage(), 500);
}