<?php
/**
 * Invoice Unmark Paid Handler
 * Handles unmarking invoices as paid with Sigma integration and date reversal
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

try {
    // Start transaction
    $conn->beginTransaction();
    
    // Get invoice details with client and panel info
    $stmt = $conn->prepare("
        SELECT i.*, 
               c.id as client_id,
               c.name as client_name, 
               c.renewal_date, 
               c.username as client_username, 
               c.plan_id, 
               p.sigma_connected, 
               p.sigma_url, 
               p.sigma_username, 
               p.sigma_token,
               pl.duration_days
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
    
    // Check if invoice is currently paid
    if ($invoice['status'] !== 'paid') {
        $conn->rollback();
        Response::error('Invoice is not marked as paid', 400);
    }
    
    // Update invoice status back to pending
    $stmt = $conn->prepare("
        UPDATE invoices 
        SET status = 'pending', payment_date = NULL, updated_at = NOW() 
        WHERE id = ? AND reseller_id = ?
    ");
    $stmt->execute([$invoice_id, $reseller_id]);
    
    $response = [
        'success' => true,
        'message' => 'Invoice unmarked as paid',
        'invoice' => [
            'id' => $invoice['id'],
            'status' => 'pending',
            'payment_date' => null
        ],
        'client_updated' => false
    ];
    
    // If invoice has a client, revert renewal date
    if ($invoice['client_id']) {
        // Calculate previous renewal date based on the invoice due date
        // The previous renewal date should be the invoice due date
        $previous_renewal_date = $invoice['due_date'];
        $current_renewal = $invoice['renewal_date'];
        
        error_log("Unmark Debug - Current renewal: " . $current_renewal);
        error_log("Unmark Debug - Previous renewal (due_date): " . $previous_renewal_date);
        error_log("Unmark Debug - Client ID: " . $invoice['client_id']);
        
        $stmt = $conn->prepare("
            UPDATE clients 
            SET renewal_date = ?, updated_at = NOW() 
            WHERE id = ? AND reseller_id = ?
        ");
        $stmt->execute([$previous_renewal_date, $invoice['client_id'], $reseller_id]);
        
        $response['client_updated'] = true;
        $response['previous_renewal_date'] = $previous_renewal_date;
        $response['current_renewal_date'] = $current_renewal;
        
        // Note: Sigma IPTV doesn't support date reversal via API
        // Only local renewal date is reverted in the gestor
        error_log("Sigma Debug - Reversal not supported, only local date updated");
    }
    
    // Commit transaction
    $conn->commit();
    
    Response::json($response);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("Invoice unmark error: " . $e->getMessage());
    Response::error('Failed to unmark invoice: ' . $e->getMessage(), 500);
}