<?php
/**
 * Endpoint de teste direto - bypass do roteamento normal
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Force no cache
if (function_exists('opcache_invalidate')) {
    opcache_invalidate(__FILE__, true);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['sigmaConfig'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing sigmaConfig']);
    exit;
}

$sigmaConfig = $input['sigmaConfig'];

function makeSigmaRequest($config, $endpoint) {
    $baseUrl = rtrim($config['url'], '/');
    
    if (substr($baseUrl, -4) === '/api') {
        $url = $baseUrl . '/webhook/' . ltrim($endpoint, '/');
    } else {
        $url = $baseUrl . '/api/webhook/' . ltrim($endpoint, '/');
    }
    
    error_log("🔍 TEST DIRECT - URL: $url");
    
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
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

try {
    $username = $sigmaConfig['username'];
    
    error_log("🔍 TEST DIRECT - Buscando: $username");
    
    // Buscar usuário específico
    $result = makeSigmaRequest($sigmaConfig, 'user?username=' . urlencode($username));
    
    error_log("🔍 TEST DIRECT - Resposta: " . json_encode($result));
    
    if ($result['code'] === 200 && isset($result['data']['data']) && !empty($result['data']['data'])) {
        $userData = $result['data']['data'];
        $user = is_array($userData) && isset($userData[0]) ? $userData[0] : $userData;
        
        echo json_encode([
            'success' => true,
            'userId' => $user['id'] ?? null,
            'username' => $user['username'] ?? null,
            'message' => '✅ TESTE DIRETO: Usuário encontrado!',
            'debug' => [
                'url_used' => 'user?username=' . urlencode($username),
                'response_code' => $result['code']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Usuário não encontrado no teste direto',
            'debug' => $result
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
