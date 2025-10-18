<?php
/**
 * DEBUG API - Lista tokens de reset (APENAS DESENVOLVIMENTO)
 * REMOVER EM PRODUÇÃO!
 */

require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');

// APENAS EM DESENVOLVIMENTO
if (getenv('APP_ENV') === 'production') {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

try {
    $pdo = getDbConnection();
    
    $email = $_GET['email'] ?? null;
    
    if (!$email) {
        http_response_code(400);
        echo json_encode(['error' => 'Email é obrigatório']);
        exit;
    }
    
    // Buscar tokens do usuário
    $stmt = $pdo->prepare("
        SELECT 
            prt.id,
            prt.email,
            prt.token,
            prt.expires_at,
            prt.used,
            prt.created_at,
            r.display_name
        FROM password_reset_tokens prt
        JOIN resellers r ON prt.reseller_id = r.id
        WHERE prt.email = ?
        ORDER BY prt.created_at DESC
        LIMIT 10
    ");
    $stmt->execute([$email]);
    $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Adicionar informações úteis
    $frontendUrl = getenv('FRONTEND_URL') ?: 'http://localhost:9002';
    
    foreach ($tokens as &$token) {
        $token['expired'] = strtotime($token['expires_at']) < time();
        $token['reset_link'] = "$frontendUrl/reset-password?token={$token['token']}";
        $token['valid'] = !$token['used'] && !$token['expired'];
    }
    
    echo json_encode([
        'success' => true,
        'email' => $email,
        'tokens' => $tokens,
        'note' => 'Esta API é apenas para desenvolvimento. Remova em produção!'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("Erro em debug-reset-tokens: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno']);
}
