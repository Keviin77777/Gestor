<?php
/**
 * Clients Sigma Sync API
 * Synchronizes client data from Sigma IPTV to update renewal dates
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get client ID from path
$client_id = $path_parts[1] ?? null;

if ($method !== 'POST') {
    Response::error('Method not allowed', 405);
}

if (!$client_id) {
    Response::error('Client ID is required', 400);
}

try {
    // Get client with panel info
    $stmt = executeQuery(
        "SELECT c.*, c.username, c.plan_id, p.panel_id, pan.sigma_connected, pan.sigma_url, pan.sigma_username, pan.sigma_token, pan.sigma_user_id
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         LEFT JOIN panels pan ON p.panel_id = pan.id
         WHERE c.id = ? AND c.reseller_id = ?",
        [$client_id, $reseller_id]
    );
    
    $client = $stmt->fetch();
    
    if (!$client) {
        Response::error('Client not found', 404);
    }
    
    $client_username = $client['username'];
    
    if (!$client_username) {
        Response::error('Client username is required for Sigma sync', 400);
    }
    
    // Check if panel has Sigma integration
    if (!$client['sigma_connected'] || !$client['sigma_url'] || !$client['sigma_username'] || !$client['sigma_token']) {
        Response::error('Panel is not connected to Sigma IPTV', 400);
    }
    
    error_log("🔄 Sincronizando cliente do Sigma: $client_username");
    
    // Get customer data from Sigma
    $get_customer_url = $client['sigma_url'] . '/api/webhook/customer?username=' . urlencode($client_username);
    
    $get_options = [
        'http' => [
            'method' => 'GET',
            'header' => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $client['sigma_token']
            ],
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ];
    
    $get_context = stream_context_create($get_options);
    $customer_response = @file_get_contents($get_customer_url, false, $get_context);
    
    if (!$customer_response || !isset($http_response_header)) {
        Response::error('Unable to connect to Sigma IPTV', 500);
    }
    
    // Check HTTP response code
    $status_line = $http_response_header[0];
    preg_match('{HTTP\/\S*\s(\d{3})}', $status_line, $match);
    $http_code = isset($match[1]) ? (int)$match[1] : 0;
    
    error_log("📡 Sigma Get Customer Response Code: $http_code");
    error_log("📡 Sigma Response: " . substr($customer_response, 0, 500));
    
    if ($http_code < 200 || $http_code >= 300) {
        Response::error('Sigma IPTV returned error: HTTP ' . $http_code, 400);
    }
    
    $customer_data = json_decode($customer_response, true);
    
    if (!$customer_data || !isset($customer_data['data'])) {
        Response::error('Invalid response from Sigma IPTV', 500);
    }
    
    $sigma_customer = $customer_data['data'];
    
    // Extract renewal information from Sigma
    $sigma_expiry = null;
    $sigma_status = 'active'; // Default status
    
    // Try to get expiry date from different possible fields
    if (isset($sigma_customer['expiry_date'])) {
        $sigma_expiry = $sigma_customer['expiry_date'];
    } elseif (isset($sigma_customer['expires_at'])) {
        $sigma_expiry = $sigma_customer['expires_at'];
    } elseif (isset($sigma_customer['renewal_date'])) {
        $sigma_expiry = $sigma_customer['renewal_date'];
    } elseif (isset($sigma_customer['end_date'])) {
        $sigma_expiry = $sigma_customer['end_date'];
    }
    
    // Try to get status from Sigma
    if (isset($sigma_customer['status'])) {
        $status_mapping = [
            'active' => 'active',
            'inactive' => 'inactive',
            'suspended' => 'suspended',
            'expired' => 'expired',
            'enabled' => 'active',
            'disabled' => 'inactive',
            1 => 'active',
            0 => 'inactive'
        ];
        
        $sigma_status = $status_mapping[$sigma_customer['status']] ?? 'active';
    }
    
    $updates = [];
    $update_params = [];
    
    // Update renewal date if found
    if ($sigma_expiry) {
        try {
            // Parse and format the date
            $expiry_date = new DateTime($sigma_expiry);
            $formatted_date = $expiry_date->format('Y-m-d');
            
            $updates[] = "renewal_date = ?";
            $update_params[] = $formatted_date;
            
            error_log("✅ Nova data de renovação do Sigma: $formatted_date");
        } catch (Exception $e) {
            error_log("⚠️ Erro ao processar data do Sigma: " . $e->getMessage());
        }
    }
    
    // Update status
    $updates[] = "status = ?";
    $update_params[] = $sigma_status;
    
    // Update last sync timestamp
    $updates[] = "updated_at = NOW()";
    
    if (!empty($updates)) {
        $update_params[] = $client_id;
        
        $update_sql = "UPDATE clients SET " . implode(', ', $updates) . " WHERE id = ?";
        executeQuery($update_sql, $update_params);
        
        error_log("✅ Cliente sincronizado com sucesso: $client_username");
    }
    
    // Get updated client data
    $stmt = executeQuery(
        "SELECT c.*, p.name as plan_name, pan.name as panel_name
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         LEFT JOIN panels pan ON p.panel_id = pan.id
         WHERE c.id = ? AND c.reseller_id = ?",
        [$client_id, $reseller_id]
    );
    
    $updated_client = $stmt->fetch();
    
    // Convert numeric types
    $updated_client['value'] = floatval($updated_client['value']);
    if (isset($updated_client['discount_value'])) {
        $updated_client['discount_value'] = floatval($updated_client['discount_value']);
    }
    if (isset($updated_client['fixed_value'])) {
        $updated_client['fixed_value'] = floatval($updated_client['fixed_value']);
    }
    if (isset($updated_client['use_fixed_value'])) {
        $updated_client['use_fixed_value'] = boolval($updated_client['use_fixed_value']);
    }
    
    $response_data = [
        'client' => $updated_client,
        'sigma_data' => $sigma_customer,
        'synced_fields' => [
            'renewal_date' => $sigma_expiry ? $formatted_date : null,
            'status' => $sigma_status
        ]
    ];
    
    Response::success($response_data, 'Client synchronized with Sigma IPTV successfully');
    
} catch (Exception $e) {
    error_log('Sigma sync error: ' . $e->getMessage());
    Response::error('Failed to sync with Sigma IPTV: ' . $e->getMessage(), 500);
}
