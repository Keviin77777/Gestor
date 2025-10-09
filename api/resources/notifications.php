<?php
/**
 * Notifications Resource Handler
 */

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
Auth::requireAuth();

$db = Database::getInstance();
$conn = $db->getConnection();

// Get ID from path if present
$id = $path_parts[1] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            // Get single notification
            $stmt = $conn->prepare("SELECT * FROM notifications WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($notification = $result->fetch_assoc()) {
                Response::json($notification);
            } else {
                Response::error('Notification not found', 404);
            }
        } else {
            // Get all notifications
            $result = $conn->query("SELECT * FROM notifications ORDER BY created_at DESC");
            $notifications = [];
            while ($row = $result->fetch_assoc()) {
                $notifications[] = $row;
            }
            Response::json(['notifications' => $notifications]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("INSERT INTO notifications (title, message, type, client_id, read_status) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssi",
            $data['title'],
            $data['message'],
            $data['type'],
            $data['client_id'],
            $data['read_status'] ?? 0
        );
        
        if ($stmt->execute()) {
            Response::json(['id' => $conn->insert_id, 'message' => 'Notification created'], 201);
        } else {
            Response::error('Failed to create notification', 500);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('Notification ID required', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("UPDATE notifications SET read_status = ? WHERE id = ?");
        $stmt->bind_param("ii", $data['read_status'], $id);
        
        if ($stmt->execute()) {
            Response::json(['message' => 'Notification updated']);
        } else {
            Response::error('Failed to update notification', 500);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            Response::error('Notification ID required', 400);
        }
        
        $stmt = $conn->prepare("DELETE FROM notifications WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            Response::json(['message' => 'Notification deleted']);
        } else {
            Response::error('Failed to delete notification', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
