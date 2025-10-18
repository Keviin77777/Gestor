<?php
/**
 * Payment Checkout GET API
 * Busca dados de transação para exibir no checkout
 */

require_once __DIR__ . '/../../database/config.php';

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Remove 'payment-checkout' from path_parts
array_shift($path_parts);
$path_parts = array_values($path_parts);

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

Response::error('Invalid endpoint', 404);
