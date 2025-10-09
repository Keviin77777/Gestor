<?php
/**
 * Revenues Resource Handler
 */

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();

$db = Database::getInstance();
$conn = $db->getConnection();

// Get ID from path if present
$id = $path_parts[1] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            // Get single revenue
            $stmt = $conn->prepare("SELECT * FROM revenues WHERE id = ? AND reseller_id = ?");
            $stmt->bind_param("ss", $id, $user['reseller_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($revenue = $result->fetch_assoc()) {
                Response::json($revenue);
            } else {
                Response::error('Revenue not found', 404);
            }
        } else {
            // Get all revenues for this reseller
            $stmt = $conn->prepare("SELECT * FROM revenues WHERE reseller_id = ? ORDER BY date DESC");
            $stmt->bind_param("s", $user['reseller_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $revenues = [];
            while ($row = $result->fetch_assoc()) {
                $revenues[] = $row;
            }
            Response::json(['revenues' => $revenues]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("INSERT INTO revenues (description, amount, category, date, payment_method, client_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sdsssss",
            $data['description'],
            $data['amount'],
            $data['category'],
            $data['date'],
            $data['payment_method'],
            $data['client_id'],
            $data['notes']
        );
        
        if ($stmt->execute()) {
            Response::json(['id' => $conn->insert_id, 'message' => 'Revenue created'], 201);
        } else {
            Response::error('Failed to create revenue', 500);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('Revenue ID required', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("UPDATE revenues SET description = ?, amount = ?, category = ?, date = ?, payment_method = ?, client_id = ?, notes = ? WHERE id = ?");
        $stmt->bind_param("sdsssssi",
            $data['description'],
            $data['amount'],
            $data['category'],
            $data['date'],
            $data['payment_method'],
            $data['client_id'],
            $data['notes'],
            $id
        );
        
        if ($stmt->execute()) {
            Response::json(['message' => 'Revenue updated']);
        } else {
            Response::error('Failed to update revenue', 500);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            Response::error('Revenue ID required', 400);
        }
        
        $stmt = $conn->prepare("DELETE FROM revenues WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            Response::json(['message' => 'Revenue deleted']);
        } else {
            Response::error('Failed to delete revenue', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
