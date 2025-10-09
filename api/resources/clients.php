<?php
/**
 * Clients Resource API
 * CRUD operations for clients
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

$currentDbName = null;
function getCurrentDatabaseName(): string {
    static $cached;
    if ($cached) return $cached;
    $stmt = executeQuery("SELECT DATABASE() as db");
    $row = $stmt->fetch();
    $cached = $row && isset($row['db']) ? $row['db'] : '';
    return $cached;
}

function tableHasColumn(string $table, string $column): bool {
    $db = getCurrentDatabaseName();
    if (!$db) return false;
    $stmt = executeQuery(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [$db, $table, $column]
    );
    return (bool)$stmt->fetch();
}

$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get resource ID and action if present
$resource_id = $path_parts[1] ?? null;
$action = $path_parts[2] ?? null;

// Handle sync-sigma action
if ($resource_id && $action === 'sync-sigma' && $method === 'POST') {
    require __DIR__ . '/clients-sync-sigma.php';
    return;
}

switch ($method) {
    case 'GET':
        if ($resource_id) {
            getClient($reseller_id, $resource_id);
        } else {
            getClients($reseller_id);
        }
        break;
        
    case 'POST':
        createClient($reseller_id);
        break;
        
    case 'PUT':
        if (!$resource_id) {
            Response::error('Client ID required');
        }
        updateClient($reseller_id, $resource_id);
        break;
        
    case 'DELETE':
        if (!$resource_id) {
            Response::error('Client ID required');
        }
        deleteClient($reseller_id, $resource_id);
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

/**
 * Get all clients for reseller
 */
function getClients(string $reseller_id): void {
    // Get query parameters for filtering
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 100), 1000);
    $offset = (int)($_GET['offset'] ?? 0);
    
    $sql = "SELECT c.*, p.name as plan_name, pan.name as panel_name
            FROM clients c
            LEFT JOIN plans p ON c.plan_id = p.id
            LEFT JOIN panels pan ON c.panel_id = pan.id
            WHERE c.reseller_id = ?";
    
    $params = [$reseller_id];
    
    if ($status) {
        $sql .= " AND c.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $sql .= " AND (c.name LIKE ? OR c.email LIKE ? OR c.username LIKE ?)";
        $search_term = "%$search%";
        $params[] = $search_term;
        $params[] = $search_term;
        $params[] = $search_term;
    }
    
    $sql .= " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = executeQuery($sql, $params);
    $clients = [];
    
    while ($row = $stmt->fetch()) {
        // Converter tipos numéricos
        $row['value'] = floatval($row['value']);
        if (isset($row['discount_value'])) {
            $row['discount_value'] = floatval($row['discount_value']);
        }
        if (isset($row['fixed_value'])) {
            $row['fixed_value'] = floatval($row['fixed_value']);
        }
        if (isset($row['use_fixed_value'])) {
            $row['use_fixed_value'] = boolval($row['use_fixed_value']);
        }
        // Normalizar apps (se existir coluna JSON)
        if (isset($row['apps']) && is_string($row['apps'])) {
            $decoded = json_decode($row['apps'], true);
            $row['apps'] = is_array($decoded) ? $decoded : [];
        }
        $clients[] = $row;
    }
    
    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM clients WHERE reseller_id = ?";
    $count_params = [$reseller_id];
    
    if ($status) {
        $count_sql .= " AND status = ?";
        $count_params[] = $status;
    }
    
    $count_stmt = executeQuery($count_sql, $count_params);
    $total = $count_stmt->fetch()['total'];
    
    Response::success([
        'clients' => $clients,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

/**
 * Get single client
 */
function getClient(string $reseller_id, string $client_id): void {
    $stmt = executeQuery(
        "SELECT c.*, p.name as plan_name, pan.name as panel_name
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         LEFT JOIN panels pan ON c.panel_id = pan.id
         WHERE c.id = ? AND c.reseller_id = ?",
        [$client_id, $reseller_id]
    );
    
    $client = $stmt->fetch();
    
    if (!$client) {
        Response::error('Client not found', 404);
    }
    
    // Converter tipos numéricos
    $client['value'] = floatval($client['value']);
    if (isset($client['discount_value'])) {
        $client['discount_value'] = floatval($client['discount_value']);
    }
    if (isset($client['fixed_value'])) {
        $client['fixed_value'] = floatval($client['fixed_value']);
    }
    if (isset($client['use_fixed_value'])) {
        $client['use_fixed_value'] = boolval($client['use_fixed_value']);
    }
    // Normalizar apps (se existir coluna JSON)
    if (isset($client['apps']) && is_string($client['apps'])) {
        $decoded = json_decode($client['apps'], true);
        $client['apps'] = is_array($decoded) ? $decoded : [];
    }
    
    Response::success(['client' => $client]);
}

/**
 * Create new client
 */
function createClient(string $reseller_id): void {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['name', 'start_date', 'renewal_date', 'value'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            Response::error("Field '$field' is required");
        }
    }
    
    // Sanitize and validate
    $data = [
        'id' => sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        ),
        'reseller_id' => $reseller_id,
        'name' => Validator::sanitizeString($input['name']),
        'username' => Validator::sanitizeString($input['username'] ?? ''),
        'email' => Validator::sanitizeString($input['email'] ?? ''),
        'phone' => Validator::sanitizeString($input['phone'] ?? ''),
        'password' => Validator::sanitizeString($input['password'] ?? ''),
        'plan_id' => $input['plan_id'] ?? null,
        'panel_id' => $input['panel_id'] ?? null,
        'start_date' => $input['start_date'],
        'renewal_date' => $input['renewal_date'],
        'status' => $input['status'] ?? 'active',
        'value' => (float)$input['value'],
        'notes' => Validator::sanitizeString($input['notes'] ?? ''),
        'apps' => isset($input['apps']) && is_array($input['apps']) ? array_values(array_filter($input['apps'])) : []
    ];
    
    // Validate dates
    if (!Validator::validateDate($data['start_date'])) {
        Response::error('Invalid start_date format');
    }
    if (!Validator::validateDate($data['renewal_date'])) {
        Response::error('Invalid renewal_date format');
    }
    
    // Validate email if provided
    if (!empty($data['email']) && !Validator::validateEmail($data['email'])) {
        Response::error('Invalid email format');
    }
    
    try {
        $hasPassword = tableHasColumn('clients', 'password');
        $hasApps = tableHasColumn('clients', 'apps');
        if ($hasPassword) {
            if ($hasApps) {
                executeQuery(
                    "INSERT INTO clients (id, reseller_id, name, username, email, phone, password, plan_id, panel_id, start_date, renewal_date, status, value, notes, apps, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    [
                        $data['id'],
                        $data['reseller_id'],
                        $data['name'],
                        $data['username'],
                        $data['email'],
                        $data['phone'],
                        $data['password'] ?: null,
                        $data['plan_id'],
                        $data['panel_id'],
                        $data['start_date'],
                        $data['renewal_date'],
                        $data['status'],
                        $data['value'],
                        $data['notes'],
                        json_encode($data['apps'])
                    ]
                );
            } else {
                executeQuery(
                    "INSERT INTO clients (id, reseller_id, name, username, email, phone, password, plan_id, panel_id, start_date, renewal_date, status, value, notes, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    [
                        $data['id'],
                        $data['reseller_id'],
                        $data['name'],
                        $data['username'],
                        $data['email'],
                        $data['phone'],
                        $data['password'] ?: null,
                        $data['plan_id'],
                        $data['panel_id'],
                        $data['start_date'],
                        $data['renewal_date'],
                        $data['status'],
                        $data['value'],
                        $data['notes']
                    ]
                );
            }
        } else {
            if ($hasApps) {
                executeQuery(
                    "INSERT INTO clients (id, reseller_id, name, username, email, phone, plan_id, panel_id, start_date, renewal_date, status, value, notes, apps, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    [
                        $data['id'],
                        $data['reseller_id'],
                        $data['name'],
                        $data['username'],
                        $data['email'],
                        $data['phone'],
                        $data['plan_id'],
                        $data['panel_id'],
                        $data['start_date'],
                        $data['renewal_date'],
                        $data['status'],
                        $data['value'],
                        $data['notes'],
                        json_encode($data['apps'])
                    ]
                );
            } else {
                executeQuery(
                    "INSERT INTO clients (id, reseller_id, name, username, email, phone, plan_id, panel_id, start_date, renewal_date, status, value, notes, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    [
                        $data['id'],
                        $data['reseller_id'],
                        $data['name'],
                        $data['username'],
                        $data['email'],
                        $data['phone'],
                        $data['plan_id'],
                        $data['panel_id'],
                        $data['start_date'],
                        $data['renewal_date'],
                        $data['status'],
                        $data['value'],
                        $data['notes']
                    ]
                );
            }
        }
        
        // Enviar WhatsApp de boas-vindas
        $whatsappSent = false;
        $whatsappError = null;
        
        if (!empty($data['phone'])) {
            try {
                error_log("Welcome WhatsApp - Starting for client: {$data['name']}");
                
                // Buscar template de boas-vindas
                $stmt = executeQuery(
                    "SELECT message FROM whatsapp_templates 
                     WHERE reseller_id = ? AND trigger_event = 'user_created' AND is_active = 1 
                     LIMIT 1",
                    [$reseller_id]
                );
                $template = $stmt->fetch();
                
                if ($template) {
                    // Buscar nome do plano
                    $planName = 'Plano';
                    if (!empty($data['plan_id'])) {
                        $stmt = executeQuery("SELECT name FROM plans WHERE id = ?", [$data['plan_id']]);
                        $plan = $stmt->fetch();
                        if ($plan) {
                            $planName = $plan['name'];
                        }
                    }
                    
                    // Processar variáveis do template
                    $message = $template['message'];
                    $message = str_replace('{{cliente_nome}}', $data['name'], $message);
                    $message = str_replace('{{cliente_usuario}}', $data['username'] ?? '', $message);
                    $message = str_replace('{{senha}}', $data['password'] ?? '', $message);
                    $message = str_replace('{{plano}}', $planName, $message);
                    $message = str_replace('{{valor}}', number_format($data['value'], 2, ',', '.'), $message);
                    $message = str_replace('{{data_vencimento}}', date('d/m/Y', strtotime($data['renewal_date'])), $message);
                    
                    error_log("Welcome WhatsApp - Message: " . substr($message, 0, 100));
                    
                    // Formatar telefone
                    $phone = preg_replace('/\D/', '', $data['phone']);
                    if (strlen($phone) === 11 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
                        $phone = '55' . $phone;
                    } elseif (strlen($phone) === 10 && substr($phone, 0, 2) >= 11 && substr($phone, 0, 2) <= 99) {
                        $phone = '55' . $phone;
                    }
                    
                    error_log("Welcome WhatsApp - Formatted phone: {$phone}");
                    
                    // Obter credenciais do WhatsApp
                    $whatsapp_url = getenv('WHATSAPP_API_URL') ?: '';
                    $whatsapp_key = getenv('WHATSAPP_API_KEY') ?: '';
                    
                    if ($whatsapp_url && $whatsapp_key) {
                        $whatsapp_data = [
                            'number' => $phone,
                            'text' => $message
                        ];
                        
                        $url = rtrim($whatsapp_url, '/') . '/message/sendText/gestplay-instance';
                        $post_data = json_encode($whatsapp_data);
                        
                        $context = [
                            'http' => [
                                'method' => 'POST',
                                'header' => [
                                    'Content-Type: application/json',
                                    'apikey: ' . $whatsapp_key,
                                    'Content-Length: ' . strlen($post_data)
                                ],
                                'content' => $post_data,
                                'timeout' => 10,
                                'ignore_errors' => true
                            ]
                        ];
                        
                        $stream = stream_context_create($context);
                        $result = @file_get_contents($url, false, $stream);
                        
                        if ($result !== false) {
                            error_log("Welcome WhatsApp - Success: {$result}");
                            $whatsappSent = true;
                        } else {
                            error_log("Welcome WhatsApp - Failed to send");
                            $whatsappError = 'Failed to send WhatsApp message';
                        }
                    } else {
                        error_log("Welcome WhatsApp - API not configured");
                        $whatsappError = 'WhatsApp API not configured';
                    }
                } else {
                    error_log("Welcome WhatsApp - No template found");
                    $whatsappError = 'No welcome template configured';
                }
            } catch (Exception $e) {
                error_log("Welcome WhatsApp - Exception: " . $e->getMessage());
                $whatsappError = $e->getMessage();
            }
        }
        
        $response = [
            'id' => $data['id'],
            'message' => 'Cliente criado com sucesso'
        ];
        
        if ($whatsappSent) {
            $response['whatsapp_sent'] = true;
        } elseif ($whatsappError) {
            $response['whatsapp_sent'] = false;
            $response['whatsapp_error'] = $whatsappError;
        }
        
        Response::success($response, 201);
        
    } catch (Exception $e) {
        error_log('Create client error: ' . $e->getMessage());
        Response::error('Erro ao criar cliente', 500);
    }
}

/**
 * Update client
 */
function updateClient(string $reseller_id, string $client_id): void {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Check if client exists and belongs to reseller
    $stmt = executeQuery(
        "SELECT id FROM clients WHERE id = ? AND reseller_id = ?",
        [$client_id, $reseller_id]
    );
    
    if (!$stmt->fetch()) {
        Response::error('Client not found', 404);
    }
    
    // Build dynamic update query based on provided fields
    $updates = [];
    $params = [];
    
    $allowed_fields = ['name', 'username', 'email', 'phone', 'plan_id', 'panel_id', 'renewal_date', 'status', 'value', 'notes', 'password', 'apps'];
    
    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            if ($field === 'apps') {
                if (tableHasColumn('clients', 'apps')) {
                    $updates[] = "{$field} = ?";
                    $params[] = is_array($input[$field]) ? json_encode(array_values(array_filter($input[$field]))) : null;
                }
            } else if ($field === 'value') {
                $updates[] = "{$field} = ?";
                $params[] = (float)$input[$field];
            } else if (in_array($field, ['name', 'username', 'email', 'phone', 'notes', 'password'])) {
                $updates[] = "{$field} = ?";
                $params[] = Validator::sanitizeString($input[$field]);
            } else {
                $updates[] = "{$field} = ?";
                $params[] = $input[$field];
            }
        }
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update');
    }
    
    // Validate email if provided
    if (isset($input['email']) && !empty($input['email']) && !Validator::validateEmail($input['email'])) {
        Response::error('Invalid email format');
    }
    
    // Validate date if provided
    if (isset($input['renewal_date']) && !Validator::validateDate($input['renewal_date'])) {
        Response::error('Invalid renewal_date format');
    }
    
    $updates[] = "updated_at = NOW()";
    $params[] = $client_id;
    $params[] = $reseller_id;
    
    $sql = "UPDATE clients SET " . implode(', ', $updates) . " WHERE id = ? AND reseller_id = ?";
    
    try {
        executeQuery($sql, $params);
        Response::success(['message' => 'Cliente atualizado com sucesso']);
    } catch (Exception $e) {
        error_log('Update client error: ' . $e->getMessage());
        Response::error('Erro ao atualizar cliente', 500);
    }
}

/**
 * Delete client
 */
function deleteClient(string $reseller_id, string $client_id): void {
    try {
        executeQuery(
            "DELETE FROM clients WHERE id = ? AND reseller_id = ?",
            [$client_id, $reseller_id]
        );
        
        Response::success(['message' => 'Cliente excluído com sucesso']);
        
    } catch (Exception $e) {
        error_log('Delete client error: ' . $e->getMessage());
        Response::error('Erro ao excluir cliente', 500);
    }
}
