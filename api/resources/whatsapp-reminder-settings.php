<?php
/**
 * WhatsApp Reminder Settings Resource Handler
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

switch ($method) {
    case 'GET':
        // Get settings for reseller
        $stmt = $conn->prepare("
            SELECT * FROM whatsapp_reminder_settings 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$settings) {
            // Create default settings if not exists
            $stmt = $conn->prepare("
                INSERT INTO whatsapp_reminder_settings (reseller_id) 
                VALUES (?)
            ");
            $stmt->execute([$reseller_id]);
            
            // Fetch the created settings
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_reminder_settings 
                WHERE reseller_id = ?
            ");
            $stmt->execute([$reseller_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // Convert working_days string to array
        if ($settings && $settings['working_days']) {
            $settings['working_days_array'] = array_map('intval', explode(',', $settings['working_days']));
        } else {
            $settings['working_days_array'] = [1, 2, 3, 4, 5, 6]; // Default: Monday to Saturday
        }
        
        Response::json($settings);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Get current settings
        $stmt = $conn->prepare("
            SELECT * FROM whatsapp_reminder_settings 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $current_settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_settings) {
            // Create default settings first
            $stmt = $conn->prepare("
                INSERT INTO whatsapp_reminder_settings (reseller_id) 
                VALUES (?)
            ");
            $stmt->execute([$reseller_id]);
        }
        
        // Build dynamic UPDATE query
        $updateFields = [];
        $updateValues = [];
        
        // Update is_enabled if provided
        if (isset($data['is_enabled'])) {
            $updateFields[] = "is_enabled = ?";
            $updateValues[] = (bool)$data['is_enabled'];
        }
        
        // Update start_hour if provided
        if (isset($data['start_hour'])) {
            $start_hour = (int)$data['start_hour'];
            if ($start_hour < 0 || $start_hour > 23) {
                Response::error('start_hour must be between 0 and 23', 400);
            }
            $updateFields[] = "start_hour = ?";
            $updateValues[] = $start_hour;
        }
        
        // Update end_hour if provided
        if (isset($data['end_hour'])) {
            $end_hour = (int)$data['end_hour'];
            if ($end_hour < 0 || $end_hour > 23) {
                Response::error('end_hour must be between 0 and 23', 400);
            }
            $updateFields[] = "end_hour = ?";
            $updateValues[] = $end_hour;
        }
        
        // Validate hour logic if both are provided or one is being updated
        $final_start_hour = isset($data['start_hour']) ? (int)$data['start_hour'] : ($current_settings['start_hour'] ?? 8);
        $final_end_hour = isset($data['end_hour']) ? (int)$data['end_hour'] : ($current_settings['end_hour'] ?? 18);
        
        if ($final_start_hour >= $final_end_hour && !($final_start_hour === 0 && $final_end_hour === 0)) {
            Response::error('start_hour must be less than end_hour (except for 24h operation: 0-0)', 400);
        }
        
        // Update working_days if provided
        if (isset($data['working_days'])) {
            if (is_array($data['working_days'])) {
                $working_days = $data['working_days'];
            } else {
                $working_days = explode(',', $data['working_days']);
            }
            
            // Validate working days (1-7, where 1=Monday, 7=Sunday)
            $working_days = array_map('intval', $working_days);
            $working_days = array_filter($working_days, function($day) {
                return $day >= 1 && $day <= 7;
            });
            
            if (empty($working_days)) {
                Response::error('At least one working day must be specified', 400);
            }
            
            $working_days = array_unique($working_days);
            sort($working_days);
            
            $updateFields[] = "working_days = ?";
            $updateValues[] = implode(',', $working_days);
        }
        
        // Update check_interval_minutes if provided
        if (isset($data['check_interval_minutes'])) {
            $interval = (int)$data['check_interval_minutes'];
            if ($interval < 5 || $interval > 1440) {
                Response::error('check_interval_minutes must be between 5 and 1440 (24 hours)', 400);
            }
            $updateFields[] = "check_interval_minutes = ?";
            $updateValues[] = $interval;
        }
        
        // Update max_daily_reminders if provided
        if (isset($data['max_daily_reminders'])) {
            $max_reminders = (int)$data['max_daily_reminders'];
            if ($max_reminders < 1 || $max_reminders > 1000) {
                Response::error('max_daily_reminders must be between 1 and 1000', 400);
            }
            $updateFields[] = "max_daily_reminders = ?";
            $updateValues[] = $max_reminders;
        }
        
        // Update timezone if provided
        if (isset($data['timezone'])) {
            $timezone = trim($data['timezone']);
            
            // Validate timezone
            $valid_timezones = [
                'America/Sao_Paulo',
                'America/Manaus',
                'America/Fortaleza',
                'America/Recife',
                'America/Bahia',
                'UTC'
            ];
            
            if (!in_array($timezone, $valid_timezones)) {
                Response::error('Invalid timezone. Supported: ' . implode(', ', $valid_timezones), 400);
            }
            
            $updateFields[] = "timezone = ?";
            $updateValues[] = $timezone;
        }
        
        // If no fields to update, return current settings
        if (empty($updateFields)) {
            // Just return current settings
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_reminder_settings 
                WHERE reseller_id = ?
            ");
            $stmt->execute([$reseller_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($settings && $settings['working_days']) {
                $settings['working_days_array'] = array_map('intval', explode(',', $settings['working_days']));
            }
            
            Response::json($settings);
            return;
        }
        
        // Add WHERE clause parameters
        $updateValues[] = $reseller_id;
        
        $sql = "UPDATE whatsapp_reminder_settings SET " . implode(', ', $updateFields) . " WHERE reseller_id = ?";
        
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute($updateValues);
        
        if ($result) {
            // Return updated settings
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_reminder_settings 
                WHERE reseller_id = ?
            ");
            $stmt->execute([$reseller_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($settings && $settings['working_days']) {
                $settings['working_days_array'] = array_map('intval', explode(',', $settings['working_days']));
            }
            
            Response::json($settings);
        } else {
            Response::error('Failed to update settings', 500);
        }
        break;
        
    case 'POST':
        // Reset to default settings
        $stmt = $conn->prepare("
            INSERT INTO whatsapp_reminder_settings (reseller_id) 
            VALUES (?) 
            ON DUPLICATE KEY UPDATE
                is_enabled = TRUE,
                start_hour = 8,
                end_hour = 18,
                working_days = '1,2,3,4,5,6',
                check_interval_minutes = 60,
                max_daily_reminders = 100,
                timezone = 'America/Sao_Paulo',
                updated_at = CURRENT_TIMESTAMP
        ");
        
        $result = $stmt->execute([$reseller_id]);
        
        if ($result) {
            // Return reset settings
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_reminder_settings 
                WHERE reseller_id = ?
            ");
            $stmt->execute([$reseller_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($settings && $settings['working_days']) {
                $settings['working_days_array'] = array_map('intval', explode(',', $settings['working_days']));
            }
            
            Response::json($settings);
        } else {
            Response::error('Failed to reset settings', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
?>