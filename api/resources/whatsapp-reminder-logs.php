<?php
/**
 * WhatsApp Reminder Logs Resource Handler
 */

// Set environment variables for database connection
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_NAME=iptv_manager');
putenv('DB_USER=iptv_app');
putenv('DB_PASS=IptvManager2025!Secure');

require_once __DIR__ . '/../../database/config.php';

// Require authentication
try {
    $user = Auth::requireAuth();
    $reseller_id = $user['reseller_id'];
} catch (Exception $e) {
    Response::error('Authentication required', 401);
}

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Get ID from path if present
$id = $path_parts[1] ?? null;
$action = $path_parts[2] ?? null;

switch ($method) {
    case 'GET':
        if ($id && $action === 'stats') {
            // Get statistics for a specific log
            $stmt = $conn->prepare("
                SELECT 
                    l.*,
                    c.name as client_name,
                    c.phone as client_phone,
                    t.name as template_name,
                    t.reminder_type,
                    t.days_offset
                FROM whatsapp_reminder_logs l
                LEFT JOIN clients c ON l.client_id = c.id
                LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                WHERE l.id = ? AND l.reseller_id = ?
            ");
            $stmt->execute([$id, $reseller_id]);
            $log = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($log) {
                Response::json($log);
            } else {
                Response::error('Log not found', 404);
            }
        } elseif ($action === 'stats') {
            // Get general statistics
            $stats = [];
            
            // Total reminders sent today
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND DATE(created_at) = CURDATE()
            ");
            $stmt->execute([$reseller_id]);
            $stats['today_total'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // Successful reminders today
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND DATE(created_at) = CURDATE() AND status = 'sent'
            ");
            $stmt->execute([$reseller_id]);
            $stats['today_success'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // Failed reminders today
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND DATE(created_at) = CURDATE() AND status = 'failed'
            ");
            $stmt->execute([$reseller_id]);
            $stats['today_failed'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // Pending reminders
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count 
                FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND status = 'pending'
            ");
            $stmt->execute([$reseller_id]);
            $stats['pending'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // This month statistics
            $stmt = $conn->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
            ");
            $stmt->execute([$reseller_id]);
            $monthStats = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['month'] = $monthStats;
            
            // Success rate
            $stats['success_rate'] = $monthStats['total'] > 0 ? 
                round(($monthStats['sent'] / $monthStats['total']) * 100, 2) : 0;
            
            // Most used templates
            $stmt = $conn->prepare("
                SELECT 
                    t.name,
                    t.reminder_type,
                    t.days_offset,
                    COUNT(l.id) as usage_count
                FROM whatsapp_reminder_logs l
                JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                WHERE l.reseller_id = ? AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY t.id
                ORDER BY usage_count DESC
                LIMIT 5
            ");
            $stmt->execute([$reseller_id]);
            $stats['top_templates'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::json($stats);
        } else {
            // Get logs with filters and pagination
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(10, (int)$_GET['limit'])) : 20;
            $offset = ($page - 1) * $limit;
            
            // Build WHERE clause based on filters
            $whereConditions = ['l.reseller_id = ?'];
            $whereParams = [$reseller_id];
            
            // Filter by client
            if (!empty($_GET['client_id'])) {
                $whereConditions[] = 'l.client_id = ?';
                $whereParams[] = $_GET['client_id'];
            }
            
            // Filter by template
            if (!empty($_GET['template_id'])) {
                $whereConditions[] = 'l.template_id = ?';
                $whereParams[] = $_GET['template_id'];
            }
            
            // Filter by status
            if (!empty($_GET['status'])) {
                $validStatuses = ['pending', 'sent', 'failed', 'cancelled'];
                if (in_array($_GET['status'], $validStatuses)) {
                    $whereConditions[] = 'l.status = ?';
                    $whereParams[] = $_GET['status'];
                }
            }
            
            // Filter by date range
            if (!empty($_GET['date_from'])) {
                $whereConditions[] = 'DATE(l.created_at) >= ?';
                $whereParams[] = $_GET['date_from'];
            }
            
            if (!empty($_GET['date_to'])) {
                $whereConditions[] = 'DATE(l.created_at) <= ?';
                $whereParams[] = $_GET['date_to'];
            }
            
            // Filter by reminder type
            if (!empty($_GET['reminder_type'])) {
                $validTypes = ['before', 'on_due', 'after'];
                if (in_array($_GET['reminder_type'], $validTypes)) {
                    $whereConditions[] = 't.reminder_type = ?';
                    $whereParams[] = $_GET['reminder_type'];
                }
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            // Get total count for pagination
            $countSql = "
                SELECT COUNT(*) as total
                FROM whatsapp_reminder_logs l
                LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                WHERE $whereClause
            ";
            
            $stmt = $conn->prepare($countSql);
            $stmt->execute($whereParams);
            $totalCount = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get logs with details
            $sql = "
                SELECT 
                    l.*,
                    c.name as client_name,
                    c.phone as client_phone,
                    t.name as template_name,
                    t.reminder_type,
                    t.days_offset
                FROM whatsapp_reminder_logs l
                LEFT JOIN clients c ON l.client_id = c.id
                LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                WHERE $whereClause
                ORDER BY l.created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([...$whereParams, $limit, $offset]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate pagination info
            $totalPages = ceil($totalCount / $limit);
            
            Response::json([
                'logs' => $logs,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_count' => $totalCount,
                    'per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]);
        }
        break;
        
    case 'POST':
        if ($id && $action === 'retry') {
            // Retry a failed reminder
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_reminder_logs 
                WHERE id = ? AND reseller_id = ? AND status IN ('failed', 'pending')
            ");
            $stmt->execute([$id, $reseller_id]);
            $log = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$log) {
                Response::error('Log not found or cannot be retried', 404);
            }
            
            // Check retry limit
            if ($log['retry_count'] >= 3) {
                Response::error('Maximum retry attempts reached', 400);
            }
            
            // Update log for retry
            $stmt = $conn->prepare("
                UPDATE whatsapp_reminder_logs 
                SET 
                    status = 'pending',
                    retry_count = retry_count + 1,
                    error_message = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND reseller_id = ?
            ");
            
            $result = $stmt->execute([$id, $reseller_id]);
            
            if ($result) {
                // Return updated log
                $stmt = $conn->prepare("
                    SELECT 
                        l.*,
                        c.name as client_name,
                        c.phone as client_phone,
                        t.name as template_name,
                        t.reminder_type,
                        t.days_offset
                    FROM whatsapp_reminder_logs l
                    LEFT JOIN clients c ON l.client_id = c.id
                    LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                    WHERE l.id = ?
                ");
                $stmt->execute([$id]);
                $updatedLog = $stmt->fetch(PDO::FETCH_ASSOC);
                
                Response::json($updatedLog);
            } else {
                Response::error('Failed to retry reminder', 500);
            }
        } elseif ($action === 'cleanup') {
            // Cleanup old logs (older than 90 days)
            $data = json_decode(file_get_contents('php://input'), true);
            $days = isset($data['days']) ? max(30, min(365, (int)$data['days'])) : 90;
            
            $stmt = $conn->prepare("
                DELETE FROM whatsapp_reminder_logs 
                WHERE reseller_id = ? AND created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ");
            
            $result = $stmt->execute([$reseller_id, $days]);
            $deletedCount = $stmt->rowCount();
            
            if ($result) {
                Response::json([
                    'message' => 'Cleanup completed',
                    'deleted_count' => $deletedCount,
                    'days' => $days
                ]);
            } else {
                Response::error('Failed to cleanup logs', 500);
            }
        } else {
            // Create new log entry (usually done by the system)
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            $required_fields = ['client_id', 'template_id', 'message_content', 'scheduled_date'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    Response::error("Field '$field' is required", 400);
                }
            }
            
            // Validate client belongs to reseller
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count FROM clients 
                WHERE id = ? AND reseller_id = ?
            ");
            $stmt->execute([$data['client_id'], $reseller_id]);
            $clientExists = $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
            
            if (!$clientExists) {
                Response::error('Client not found or does not belong to reseller', 404);
            }
            
            // Validate template belongs to reseller
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count FROM whatsapp_reminder_templates 
                WHERE id = ? AND reseller_id = ?
            ");
            $stmt->execute([$data['template_id'], $reseller_id]);
            $templateExists = $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
            
            if (!$templateExists) {
                Response::error('Template not found or does not belong to reseller', 404);
            }
            
            // Check for duplicate log (same client, template, and date)
            $stmt = $conn->prepare("
                SELECT id FROM whatsapp_reminder_logs 
                WHERE client_id = ? 
                AND template_id = ? 
                AND DATE(created_at) = DATE(?)
                AND reseller_id = ?
                LIMIT 1
            ");
            $stmt->execute([
                $data['client_id'],
                $data['template_id'],
                $data['scheduled_date'],
                $reseller_id
            ]);
            $existingLog = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingLog) {
                // Return existing log instead of creating duplicate
                $stmt = $conn->prepare("
                    SELECT 
                        l.*,
                        c.name as client_name,
                        c.phone as client_phone,
                        t.name as template_name,
                        t.reminder_type,
                        t.days_offset
                    FROM whatsapp_reminder_logs l
                    LEFT JOIN clients c ON l.client_id = c.id
                    LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                    WHERE l.id = ?
                ");
                $stmt->execute([$existingLog['id']]);
                $log = $stmt->fetch(PDO::FETCH_ASSOC);
                
                Response::json($log, 200); // Return 200 instead of 201 to indicate existing log
            }
            
            // Generate ID
            $log_id = uniqid('log_reminder_');
            
            // Insert log
            $stmt = $conn->prepare("
                INSERT INTO whatsapp_reminder_logs 
                (id, reseller_id, client_id, template_id, message_content, scheduled_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $status = isset($data['status']) ? $data['status'] : 'pending';
            
            $result = $stmt->execute([
                $log_id,
                $reseller_id,
                $data['client_id'],
                $data['template_id'],
                $data['message_content'],
                $data['scheduled_date'],
                $status
            ]);
            
            if ($result) {
                // Return created log
                $stmt = $conn->prepare("
                    SELECT 
                        l.*,
                        c.name as client_name,
                        c.phone as client_phone,
                        t.name as template_name,
                        t.reminder_type,
                        t.days_offset
                    FROM whatsapp_reminder_logs l
                    LEFT JOIN clients c ON l.client_id = c.id
                    LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                    WHERE l.id = ?
                ");
                $stmt->execute([$log_id]);
                $log = $stmt->fetch(PDO::FETCH_ASSOC);
                
                Response::json($log, 201);
            } else {
                Response::error('Failed to create log', 500);
            }
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('Log ID required', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Check if log exists (don't check reseller_id as it might be null during creation)
        $stmt = $conn->prepare("
            SELECT * FROM whatsapp_reminder_logs 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $existing_log = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_log) {
            Response::error('Log not found', 404);
        }
        
        // Verify reseller_id if it exists
        if ($existing_log['reseller_id'] && $existing_log['reseller_id'] !== $reseller_id) {
            Response::error('Log does not belong to reseller', 403);
        }
        
        // Build dynamic UPDATE query
        $updateFields = [];
        $updateValues = [];
        
        // Update status if provided
        if (isset($data['status'])) {
            $validStatuses = ['pending', 'sent', 'failed', 'cancelled'];
            if (!in_array($data['status'], $validStatuses)) {
                Response::error('Invalid status', 400);
            }
            $updateFields[] = "status = ?";
            $updateValues[] = $data['status'];
            
            // If marking as sent, set sent_at
            if ($data['status'] === 'sent' && !isset($data['sent_at'])) {
                $updateFields[] = "sent_at = CURRENT_TIMESTAMP";
            }
        }
        
        // Update sent_at if provided
        if (isset($data['sent_at'])) {
            $updateFields[] = "sent_at = ?";
            $updateValues[] = $data['sent_at'];
        }
        
        // Update error_message if provided
        if (isset($data['error_message'])) {
            $updateFields[] = "error_message = ?";
            $updateValues[] = $data['error_message'];
        }
        
        // Update whatsapp_message_id if provided
        if (isset($data['whatsapp_message_id'])) {
            $updateFields[] = "whatsapp_message_id = ?";
            $updateValues[] = $data['whatsapp_message_id'];
        }
        
        // If no fields to update, return error
        if (empty($updateFields)) {
            Response::error('No valid fields to update', 400);
        }
        
        // Add WHERE clause parameters
        $updateValues[] = $id;
        
        $sql = "UPDATE whatsapp_reminder_logs SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute($updateValues);
        
        if ($result) {
            // Return updated log
            $stmt = $conn->prepare("
                SELECT 
                    l.*,
                    c.name as client_name,
                    c.phone as client_phone,
                    t.name as template_name,
                    t.reminder_type,
                    t.days_offset
                FROM whatsapp_reminder_logs l
                LEFT JOIN clients c ON l.client_id = c.id
                LEFT JOIN whatsapp_reminder_templates t ON l.template_id = t.id
                WHERE l.id = ?
            ");
            $stmt->execute([$id]);
            $log = $stmt->fetch(PDO::FETCH_ASSOC);
            
            Response::json($log);
        } else {
            Response::error('Failed to update log', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
?>