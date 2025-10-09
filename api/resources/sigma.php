<?php
/**
 * Sigma API Resource
 * Handles Sigma IPTV integration operations
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Verify authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get method and action
global $method, $path_parts;

$action = $path_parts[1] ?? '';

// Get database connection
try {
    $db = getDbConnection();
} catch (Exception $e) {
    error_log('Database connection error: ' . $e->getMessage());
    Response::error('Database connection failed', 500);
    exit;
}

try {
    if ($method === 'POST') {
        handlePost($db, $reseller_id, $action);
    } else {
        Response::error('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log('Sigma API Error: ' . $e->getMessage());
    Response::error($e->getMessage(), 500);
}

/**
 * Handle POST requests
 */
function handlePost($db, $reseller_id, $action) {
    switch ($action) {
        case 'sync-from-sigma':
            syncFromSigma($db, $reseller_id);
            break;
        case 'test-connection':
            testSigmaConnection($db, $reseller_id);
            break;
        default:
            Response::error("Invalid action: $action", 400);
    }
}

/**
 * Sync customer data from Sigma
 */
function syncFromSigma($db, $reseller_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        Response::error('Invalid JSON input', 400);
    }
    
    $username = $input['username'] ?? '';
    $currentRenewalDate = $input['currentRenewalDate'] ?? '';
    $sigmaConfig = $input['sigmaConfig'] ?? [];
    
    if (empty($username) || empty($currentRenewalDate) || empty($sigmaConfig)) {
        Response::error('Missing required parameters: username, currentRenewalDate, sigmaConfig', 400);
    }
    
    // Validate Sigma configuration
    $errors = validateSigmaConfig($sigmaConfig);
    if (!empty($errors)) {
        Response::error('Invalid Sigma configuration: ' . implode(', ', $errors), 400);
    }
    
    try {
        // Make request to Sigma API
        $sigmaResponse = makeSigmaRequest($sigmaConfig, "customer?username=" . urlencode($username));
        
        if (!$sigmaResponse || !isset($sigmaResponse['data']) || empty($sigmaResponse['data'])) {
            Response::error("Cliente '$username' não encontrado no Sigma IPTV", 404);
        }
        
        $customer = $sigmaResponse['data'][0] ?? $sigmaResponse['data'];
        
        // Extract expiration date
        $sigmaExpirationDate = null;
        if (isset($customer['expires_at_tz'])) {
            $sigmaExpirationDate = $customer['expires_at_tz'];
        } elseif (isset($customer['expires_at'])) {
            $sigmaExpirationDate = $customer['expires_at'];
        }
        
        if (!$sigmaExpirationDate) {
            Response::error('Data de expiração não encontrada no Sigma', 400);
        }
        
        // Convert to local date format
        $sigmaDate = new DateTime($sigmaExpirationDate);
        $localRenewalDate = $sigmaDate->format('Y-m-d');
        
        // Compare dates
        $datesAreDifferent = $currentRenewalDate !== $localRenewalDate;
        
        Response::json([
            'success' => true,
            'updated' => $datesAreDifferent,
            'oldDate' => $currentRenewalDate,
            'newDate' => $localRenewalDate,
            'sigmaData' => [
                'expirationDate' => $sigmaExpirationDate,
                'status' => $customer['status'] ?? 'UNKNOWN',
                'fullData' => $customer
            ]
        ]);
        
    } catch (Exception $e) {
        error_log('Sigma sync error: ' . $e->getMessage());
        Response::error('Erro ao sincronizar com Sigma: ' . $e->getMessage(), 500);
    }
}

/**
 * Test Sigma connection
 */
function testSigmaConnection($db, $reseller_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        Response::error('Invalid JSON input', 400);
    }
    
    $sigmaConfig = $input['sigmaConfig'] ?? [];
    
    if (empty($sigmaConfig)) {
        Response::error('Missing sigmaConfig parameter', 400);
    }
    
    // Validate Sigma configuration
    $errors = validateSigmaConfig($sigmaConfig);
    if (!empty($errors)) {
        Response::error('Invalid Sigma configuration: ' . implode(', ', $errors), 400);
    }
    
    try {
        // Test connection by getting users
        $sigmaResponse = makeSigmaRequest($sigmaConfig, 'user');
        
        if (!$sigmaResponse || !isset($sigmaResponse['data'])) {
            Response::error('Resposta inválida do Sigma', 400);
        }
        
        $users = $sigmaResponse['data'];
        if (!is_array($users) || empty($users)) {
            Response::error('Nenhum usuário encontrado no painel', 400);
        }
        
        // Find user by username or get first user
        $user = null;
        foreach ($users as $u) {
            if (isset($u['username']) && $u['username'] === $sigmaConfig['username']) {
                $user = $u;
                break;
            }
        }
        
        if (!$user) {
            $user = $users[0];
        }
        
        Response::json([
            'success' => true,
            'userId' => $user['id'] ?? null,
            'message' => 'Conexão com Sigma estabelecida com sucesso'
        ]);
        
    } catch (Exception $e) {
        error_log('Sigma connection test error: ' . $e->getMessage());
        Response::error('Erro ao conectar com Sigma: ' . $e->getMessage(), 500);
    }
}

/**
 * Make request to Sigma API
 */
function makeSigmaRequest($config, $endpoint) {
    $url = rtrim($config['url'], '/') . '/api/webhook/' . ltrim($endpoint, '/');
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $config['token'],
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception('Erro de conexão: ' . $error);
    }
    
    if ($httpCode !== 200) {
        throw new Exception("Sigma API Error: HTTP $httpCode");
    }
    
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Resposta inválida do Sigma: ' . json_last_error_msg());
    }
    
    return $data;
}

/**
 * Validate Sigma configuration
 */
function validateSigmaConfig($config) {
    $errors = [];
    
    if (empty($config['url'])) {
        $errors[] = 'URL do painel é obrigatória';
    } elseif (!filter_var($config['url'], FILTER_VALIDATE_URL)) {
        $errors[] = 'URL do painel inválida';
    }
    
    if (empty($config['username'])) {
        $errors[] = 'Usuário é obrigatório';
    }
    
    if (empty($config['token'])) {
        $errors[] = 'Token é obrigatório';
    }
    
    return $errors;
}
