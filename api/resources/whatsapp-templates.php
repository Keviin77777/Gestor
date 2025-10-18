<?php
/**
 * WhatsApp Templates Resource Handler (Unified)
 * Gerencia templates manuais e automáticos em uma única API
 */

// Set environment variables for database connection
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_NAME=iptv_manager');
putenv('DB_USER=root');
putenv('DB_PASS=');

require_once __DIR__ . '/../../database/config.php';

// Require authentication
try {
    $user = Auth::requireAuth();
    $reseller_id = $user['reseller_id'];
    
    // Verificar se é admin
    $conn = getDbConnection();
    $stmt = $conn->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$reseller_id]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    $is_admin = $userData && $userData['is_admin'];
} catch (Exception $e) {
    Response::error('Authentication required', 401);
}

// Get global variables from index.php
global $method, $path_parts;

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
            $templates = [];
            
            // Se for ADMIN, buscar templates de revendedores também
            if ($is_admin) {
                // Buscar templates para revendedores (reseller_whatsapp_templates)
                $stmt = $conn->prepare("
                    SELECT 
                        id,
                        name,
                        trigger_type as type,
                        trigger_type as trigger_event,
                        message,
                        is_active,
                        created_at,
                        updated_at,
                        'reseller' as template_category,
                        NULL as days_offset,
                        NULL as send_hour,
                        NULL as send_minute,
                        NULL as use_global_schedule,
                        0 as is_default,
                        NULL as has_media,
                        NULL as media_url,
                        NULL as media_type
                    FROM reseller_whatsapp_templates
                    WHERE is_active = TRUE
                    ORDER BY 
                        FIELD(trigger_type, 'welcome', 'payment_confirmed', 'expiring_7days', 'expiring_3days', 'expiring_1day', 'expired'),
                        created_at DESC
                ");
                $stmt->execute();
                $resellerTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Adicionar aos templates
                $templates = array_merge($templates, $resellerTemplates);
            }
            
            // Buscar templates normais (para clientes)
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
                SELECT 
                    *,
                    'client' as template_category
                FROM whatsapp_templates 
                WHERE {$whereClause}
                ORDER BY 
                    is_default DESC,
                    FIELD(type, 'welcome', 'invoice', 'renewal', 'reminder_before', 'reminder_due', 'reminder_after', 'custom'),
                    days_offset DESC,
                    created_at DESC
            ");
            $stmt->execute($params);
            $clientTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Adicionar templates de clientes
            $templates = array_merge($templates, $clientTemplates);
            
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
            'has_media' => isset($data['has_media']) ? (bool)$data['has_media'] : false,
            'media_url' => $data['media_url'] ?? null,
            'media_type' => $data['media_type'] ?? null,
            'is_default' => false, // User templates are never default
            'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
            'days_offset' => $data['days_offset'] ?? null,
            'send_hour' => $data['send_hour'] ?? null,
            'send_minute' => $data['send_minute'] ?? 0,
            'use_global_schedule' => isset($data['use_global_schedule']) ? (bool)$data['use_global_schedule'] : true,
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
        
        // Cannot edit default templates (only activate/deactivate)
        if ($existing_template['is_default'] && isset($data['message'])) {
            Response::error('Cannot edit default templates. Create a copy instead.', 403);
        }
        
        // Build dynamic UPDATE query
        $updateFields = [];
        $updateValues = [];
        
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
            $updateValues[] = (bool)$data['is_active'];
        }
        
        if (isset($data['has_media'])) {
            $updateFields[] = "has_media = ?";
            $updateValues[] = (bool)$data['has_media'];
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
            $updateValues[] = (bool)$data['use_global_schedule'];
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
