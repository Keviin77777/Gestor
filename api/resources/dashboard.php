<?php
/**
 * Dashboard Resource Handler
 */

require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
Auth::requireAuth();

$db = Database::getInstance();
$conn = $db->getConnection();

switch ($method) {
    case 'GET':
        // Get dashboard statistics
        $stats = [];
        
        // Total clients
        $result = $conn->query("SELECT COUNT(*) as total FROM clients");
        $stats['total_clients'] = $result->fetch_assoc()['total'];
        
        // Active clients
        $result = $conn->query("SELECT COUNT(*) as total FROM clients WHERE status = 'active'");
        $stats['active_clients'] = $result->fetch_assoc()['total'];
        
        // Expiring soon (next 7 days)
        $result = $conn->query("SELECT COUNT(*) as total FROM clients WHERE expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)");
        $stats['expiring_soon'] = $result->fetch_assoc()['total'];
        
        // Total revenue this month
        $result = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE MONTH(date) = MONTH(NOW()) AND YEAR(date) = YEAR(NOW())");
        $stats['monthly_revenue'] = $result->fetch_assoc()['total'];
        
        // Total expenses this month
        $result = $conn->query("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE MONTH(date) = MONTH(NOW()) AND YEAR(date) = YEAR(NOW())");
        $stats['monthly_expenses'] = $result->fetch_assoc()['total'];
        
        // Recent payments (last 10)
        $result = $conn->query("SELECT r.*, c.name as client_name FROM revenues r LEFT JOIN clients c ON r.client_id = c.id ORDER BY r.date DESC LIMIT 10");
        $stats['recent_payments'] = [];
        while ($row = $result->fetch_assoc()) {
            $stats['recent_payments'][] = $row;
        }
        
        // Clients by plan
        $result = $conn->query("SELECT p.name, COUNT(c.id) as count FROM plans p LEFT JOIN clients c ON c.plan_id = p.id GROUP BY p.id, p.name");
        $stats['clients_by_plan'] = [];
        while ($row = $result->fetch_assoc()) {
            $stats['clients_by_plan'][] = $row;
        }
        
        Response::json($stats);
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
