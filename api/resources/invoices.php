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
        
        $stmt = $conn->prepare("INSERT INTO invoices (id, reseller_id, client_id, invoice_number, date, due_date, value, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([
            $data['id'] ?? uniqid('inv_'),
            $reseller_id,
            $data['client_id'],
            $data['invoice_number'] ?? null,
            $data['issue_date'] ?? date('Y-m-d'), // Map issue_date to date field
            $data['due_date'],
            $value,
            $data['status'] ?? 'pending',
            $data['description'] ?? $data['notes'] ?? null // Use description as notes
        ]);
        
        if ($result) {
            Response::json(['id' => $data['id'] ?? $conn->lastInsertId(), 'message' => 'Invoice created'], 201);
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