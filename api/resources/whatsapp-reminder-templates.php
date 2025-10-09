<?php
/**
 * WhatsApp Templates Resource Handler (Unified)
 * Gerencia templates manuais e automáticos em uma única API
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Get ID from path if present
$id = $path_parts[1] ?? null;
$action = $path_parts[2] ?? null;

switch ($method) {
    case 'GET':
        if ($id && $action === 'preview') {
            // Preview template with sample data
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_templates 
                WHERE id = ? AND reseller_id = ?
            ");
            $stmt->execute([$id, $reseller_id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$template) {
                Response::error('Template not found', 404);
            }
            
            // Sample data for preview
            $sampleData = [
                '{{cliente_nome}}' => 'João Silva',
                '{{cliente_usuario}}' => 'joao123',
                '{{cliente_telefone}}' => '(11) 98765-4321',
                '{{data_vencimento}}' => '15/11/2025',
                '{{data_vencimento_extenso}}' => '15 de novembro de 2025',
                '{{dias_restantes}}' => '7',
                '{{dias_restantes_texto}}' => 'em 7 dias',
                '{{valor}}' => '49,90',
                '{{valor_numerico}}' => '49.90',
                '{{plano}}' => 'Premium',
                '{{status_cliente}}' => 'Ativo',
                '{{data_hoje}}' => date('d/m/Y'),
                '{{hora_atual}}' => date('H:i'),
            ];
            
            $preview = $template['message'];
            foreach ($sampleData as $var => $value) {
                $preview = str_ireplace($var, $value, $preview);
                $preview = str_ireplace('{' . trim($var, '{}') . '}', $value, $preview);
            }
            
            Response::json([
                'template' => $template,
                'preview' => $preview,
                'sample_data' => $sampleData
            ]);
            
        } elseif ($id) {
            // Get single template
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_templates 
                WHERE id = ? AND reseller_id = ?
            ");
            $stmt->execute([$id, $reseller_id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($template) {
                Response::json($template);
            } else {
                Response::error('Template not found', 404);
            }
            
        } else {
            // Get all templates for reseller
            $filters = [];
            $params = [$reseller_id];
            
            // Filter by type
            if (!empty($_GET['type'])) {
                $filters[] = 'type = ?';
                $params[] = $_GET['type'];
            }
            
            // Filter by trigger_event
            if (!empty($_GET['trigger'])) {
                $filters[] = 'trigger_event = ?';
                $params[] = $_GET['trigger'];
            }
            
            // Filter by active status
            if (isset($_GET['active'])) {
                $filters[] = 'is_active = ?';
                $params[] = (bool)$_GET['active'];
            }
            
            // Filter by default status
            if (isset($_GET['default'])) {
                $filters[] = 'is_default = ?';
                $params[] = (bool)$_GET['default'];
            }
            
            // Search by name
            if (!empty($_GET['search'])) {
                $filters[] = 'name LIKE ?';
                $params[] = '%' . $_GET['search'] . '%';
            }
            
            $whereClause = 'reseller_id = ?';
            if (!empty($filters)) {
                $whereClause .= ' AND ' . implode(' AND ', $filters);
            }
            
            $stmt = $conn->prepare("
                SELECT * FROM whatsapp_templates 
                WHERE {$whereClause}
                ORDER BY 
                    is_default DESC,
                    FIELD(type, 'welcome', 'invoice', 'renewal', 'reminder_before', 'reminder_due', 'reminder_after', 'custom'),
                    days_offset DESC,
                    created_at DESC
            ");
            $stmt->execute($params);
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::json($templates);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required_fields = ['name', 'message', 'type', 'trigger_event'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                Response::error("Field '{$field}' is required", 400);
            }
        }
        
        // Validate type
        $valid_types = ['welcome', 'invoice', 'renewal', 'reminder_before', 'reminder_due', 'reminder_after', 'data_send', 'payment_link', 'custom'];
        if (!in_array($data['type'], $valid_types)) {
            Response::error('Invalid type', 400);
        }
        
        // Validate trigger_event
        $valid_triggers = ['user_created', 'invoice_generated', 'invoice_paid', 'scheduled', 'manual'];
        if (!in_array($data['trigger_event'], $valid_triggers)) {
            Response::error('Invalid trigger_event', 400);
        }
        
        // Validate message length
        $message = trim($data['message']);
        if (strlen($message) < 10) {
            Response::error('Message must be at least 10 characters long', 400);
        }
        
        // Generate ID
        $template_id = uniqid('tpl_');
        
        // Prepare data
        $insertData = [
            'id' => $template_id,
            'reseller_id' => $reseller_id,
            'name' => trim($data['name']),
            'type' => $data['type'],
            'trigger_event' => $data['trigger_event'],
            'message' => $message,
            'has_media' => isset($data['has_media']) && $data['has_media'] ? 1 : 0,
            'media_url' => $data['media_url'] ?? null,
            'media_type' => $data['media_type'] ?? null,
            'is_default' => 0, // User templates are never default
            'is_active' => isset($data['is_active']) && $data['is_active'] ? 1 : 0,
            'days_offset' => $data['days_offset'] ?? null,
            'send_hour' => $data['send_hour'] ?? null,
            'send_minute' => $data['send_minute'] ?? 0,
            'use_global_schedule' => isset($data['use_global_schedule']) && $data['use_global_schedule'] ? 1 : 0,
        ];
        
        // Validate scheduling fields
        if ($insertData['send_hour'] !== null) {
            if ($insertData['send_hour'] < 0 || $insertData['send_hour'] > 23) {
                Response::error('send_hour must be between 0 and 23', 400);
            }
        }
        
        if ($insertData['send_minute'] < 0 || $insertData['send_minute'] > 59) {
            Response::error('send_minute must be between 0 and 59', 400);
        }
        
        // Insert template
        $stmt = $conn->prepare("
            INSERT INTO whatsapp_templates 
            (id, reseller_id, name, type, trigger_event, message, has_media, media_url, media_type,
             is_default, is_active, days_offset, send_hour, send_minute, use_global_schedule) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $insertData['id'],
            $insertData['reseller_id'],
            $insertData['name'],
            $insertData['type'],
            $insertData['trigger_event'],
            $insertData['message'],
            $insertData['has_media'],
            $insertData['media_url'],
            $insertData['media_type'],
            $insertData['is_default'],
            $insertData['is_active'],
            $insertData['days_offset'],
            $insertData['send_hour'],
            $insertData['send_minute'],
            $insertData['use_global_schedule'],
        ]);
        
        if ($result) {
            // Return created template
            $stmt = $conn->prepare("SELECT * FROM whatsapp_templates WHERE id = ?");
            $stmt->execute([$template_id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            Response::json($template, 201);
        } else {
            Response::error('Failed to create template', 500);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('Template ID required', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Debug logging
        error_log("PUT Request Data: " . json_encode($data));
        
        // Check if template exists and belongs to reseller
        $stmt = $conn->prepare("
            SELECT * FROM whatsapp_templates 
            WHERE id = ? AND reseller_id = ?
        ");
        $stmt->execute([$id, $reseller_id]);
        $existing_template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_template) {
            Response::error('Template not found', 404);
        }
        
        error_log("Existing template is_default: " . ($existing_template['is_default'] ? 'true' : 'false'));
        error_log("Data keys: " . implode(', ', array_keys($data)));
        
        // Build dynamic UPDATE query
        $updateFields = [];
        $updateValues = [];
        
        // Check if trying to CHANGE protected fields of default templates
        if ($existing_template['is_default']) {
            $protectedFieldsChanged = false;
            
            if (isset($data['name']) && $data['name'] !== $existing_template['name']) {
                $protectedFieldsChanged = true;
                error_log("Name changed: '{$existing_template['name']}' -> '{$data['name']}'");
            }
            if (isset($data['message']) && $data['message'] !== $existing_template['message']) {
                $protectedFieldsChanged = true;
                error_log("Message changed");
            }
            if (isset($data['type']) && $data['type'] !== $existing_template['type']) {
                $protectedFieldsChanged = true;
                error_log("Type changed: '{$existing_template['type']}' -> '{$data['type']}'");
            }
            if (isset($data['trigger_event']) && $data['trigger_event'] !== $existing_template['trigger_event']) {
                $protectedFieldsChanged = true;
                error_log("Trigger changed: '{$existing_template['trigger_event']}' -> '{$data['trigger_event']}'");
            }
            
            if ($protectedFieldsChanged) {
                error_log("Blocked: Trying to CHANGE protected fields of default template");
                Response::error('Cannot edit name, message, type or trigger of default templates. You can only change scheduling and active status.', 403);
            }
            
            // Remove protected fields from data to avoid updating them
            unset($data['name'], $data['message'], $data['type'], $data['trigger_event']);
            error_log("Removed protected fields from update. Remaining: " . implode(', ', array_keys($data)));
        }
        
        if (isset($data['name']) && !empty(trim($data['name']))) {
            $updateFields[] = "name = ?";
            $updateValues[] = trim($data['name']);
        }
        
        if (isset($data['message'])) {
            $message = trim($data['message']);
            if (strlen($message) < 10) {
                Response::error('Message must be at least 10 characters long', 400);
            }
            $updateFields[] = "message = ?";
            $updateValues[] = $message;
        }
        
        if (isset($data['type'])) {
            $updateFields[] = "type = ?";
            $updateValues[] = $data['type'];
        }
        
        if (isset($data['trigger_event'])) {
            $updateFields[] = "trigger_event = ?";
            $updateValues[] = $data['trigger_event'];
        }
        
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            // Convert to integer (0 or 1) for MySQL TINYINT
            $updateValues[] = $data['is_active'] ? 1 : 0;
        }
        
        if (isset($data['has_media'])) {
            $updateFields[] = "has_media = ?";
            // Convert to integer (0 or 1) for MySQL TINYINT
            $updateValues[] = $data['has_media'] ? 1 : 0;
        }
        
        if (isset($data['media_url'])) {
            $updateFields[] = "media_url = ?";
            $updateValues[] = $data['media_url'];
        }
        
        if (isset($data['media_type'])) {
            $updateFields[] = "media_type = ?";
            $updateValues[] = $data['media_type'];
        }
        
        if (isset($data['days_offset'])) {
            $updateFields[] = "days_offset = ?";
            $updateValues[] = $data['days_offset'];
        }
        
        if (isset($data['send_hour'])) {
            if ($data['send_hour'] !== null && ($data['send_hour'] < 0 || $data['send_hour'] > 23)) {
                Response::error('send_hour must be between 0 and 23', 400);
            }
            $updateFields[] = "send_hour = ?";
            $updateValues[] = $data['send_hour'];
        }
        
        if (isset($data['send_minute'])) {
            if ($data['send_minute'] < 0 || $data['send_minute'] > 59) {
                Response::error('send_minute must be between 0 and 59', 400);
            }
            $updateFields[] = "send_minute = ?";
            $updateValues[] = $data['send_minute'];
        }
        
        if (isset($data['use_global_schedule'])) {
            $updateFields[] = "use_global_schedule = ?";
            // Convert to integer (0 or 1) for MySQL TINYINT
            $updateValues[] = $data['use_global_schedule'] ? 1 : 0;
        }
        
        if (empty($updateFields)) {
            Response::error('No valid fields to update', 400);
        }
        
        // Add WHERE clause parameters
        $updateValues[] = $id;
        $updateValues[] = $reseller_id;
        
        $sql = "UPDATE whatsapp_templates SET " . implode(', ', $updateFields) . " WHERE id = ? AND reseller_id = ?";
        
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute($updateValues);
        
        if ($result) {
            // Return updated template
            $stmt = $conn->prepare("SELECT * FROM whatsapp_templates WHERE id = ?");
            $stmt->execute([$id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            Response::json($template);
        } else {
            Response::error('Failed to update template', 500);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            Response::error('Template ID required', 400);
        }
        
        // Check if template exists and belongs to reseller
        $stmt = $conn->prepare("
            SELECT is_default FROM whatsapp_templates 
            WHERE id = ? AND reseller_id = ?
        ");
        $stmt->execute([$id, $reseller_id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) {
            Response::error('Template not found', 404);
        }
        
        // Cannot delete default templates
        if ($template['is_default']) {
            Response::error('Cannot delete default templates. Deactivate instead.', 403);
        }
        
        // Delete template
        $stmt = $conn->prepare("
            DELETE FROM whatsapp_templates 
            WHERE id = ? AND reseller_id = ?
        ");
        $result = $stmt->execute([$id, $reseller_id]);
        
        if ($result) {
            Response::json(['message' => 'Template deleted successfully']);
        } else {
            Response::error('Failed to delete template', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
?>
