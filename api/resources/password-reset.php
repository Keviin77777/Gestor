<?php
/**
 * API Resource: Password Reset
 * Gerencia solicitações de recuperação de senha
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';
require_once __DIR__ . '/../lib/email-sender.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDbConnection();
    
    switch ($method) {
        case 'POST':
            handleRequestReset($pdo);
            break;
            
        case 'PUT':
            handleResetPassword($pdo);
            break;
            
        case 'GET':
            handleValidateToken($pdo);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
    }
    
} catch (Exception $e) {
    error_log("Erro em password-reset: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * POST - Solicitar reset de senha (envia email)
 */
function handleRequestReset($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email é obrigatório']);
        return;
    }
    
    $email = Validator::sanitizeString($input['email']);
    
    if (!Validator::validateEmail($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email inválido']);
        return;
    }
    
    // Buscar usuário
    $stmt = $pdo->prepare("
        SELECT id, email, display_name, is_active 
        FROM resellers 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Por segurança, sempre retornar sucesso mesmo se email não existir
    // Isso evita que atacantes descubram quais emails estão cadastrados
    if (!$user) {
        error_log("Tentativa de reset para email não cadastrado: $email");
        echo json_encode([
            'success' => true,
            'message' => 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
        ]);
        return;
    }
    
    if (!$user['is_active']) {
        error_log("Tentativa de reset para conta inativa: $email");
        echo json_encode([
            'success' => true,
            'message' => 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
        ]);
        return;
    }
    
    // Gerar token único
    $token = bin2hex(random_bytes(32)); // 64 caracteres
    $tokenId = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    // Token expira em 1 hora
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Capturar IP e User Agent
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    // Invalidar tokens anteriores não usados
    $stmt = $pdo->prepare("
        UPDATE password_reset_tokens 
        SET used = TRUE, used_at = NOW() 
        WHERE reseller_id = ? AND used = FALSE
    ");
    $stmt->execute([$user['id']]);
    
    // Criar novo token
    $stmt = $pdo->prepare("
        INSERT INTO password_reset_tokens 
        (id, reseller_id, email, token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $tokenId,
        $user['id'],
        $email,
        $token,
        $expiresAt,
        $ipAddress,
        $userAgent
    ]);
    
    // Enviar email
    try {
        $emailSender = new EmailSender();
        $sent = $emailSender->sendPasswordResetEmail(
            $email,
            $user['display_name'] ?: 'Usuário',
            $token,
            60 // 60 minutos
        );
        
        if ($sent) {
            error_log("Email de recuperação enviado para: $email");
        } else {
            error_log("Falha ao enviar email de recuperação para: $email");
        }
    } catch (Exception $e) {
        error_log("Erro ao enviar email: " . $e->getMessage());
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
    ]);
}

/**
 * GET - Validar token
 */
function handleValidateToken($pdo) {
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['error' => 'Token é obrigatório']);
        return;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            prt.id,
            prt.reseller_id,
            prt.email,
            prt.expires_at,
            prt.used,
            r.display_name
        FROM password_reset_tokens prt
        JOIN resellers r ON prt.reseller_id = r.id
        WHERE prt.token = ? AND prt.used = FALSE
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tokenData) {
        http_response_code(404);
        echo json_encode(['error' => 'Token inválido ou já utilizado']);
        return;
    }
    
    // Verificar se expirou
    if (strtotime($tokenData['expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'Token expirado']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'email' => $tokenData['email'],
        'name' => $tokenData['display_name']
    ]);
}

/**
 * PUT - Redefinir senha com token
 */
function handleResetPassword($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['token']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Token e nova senha são obrigatórios']);
        return;
    }
    
    $token = $input['token'];
    $newPassword = $input['password'];
    
    // Validar senha
    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'A senha deve ter no mínimo 8 caracteres']);
        return;
    }
    
    if (!preg_match('/[a-zA-Z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
        http_response_code(400);
        echo json_encode(['error' => 'A senha deve conter letras e números']);
        return;
    }
    
    // Buscar token
    $stmt = $pdo->prepare("
        SELECT 
            prt.id,
            prt.reseller_id,
            prt.email,
            prt.expires_at,
            prt.used
        FROM password_reset_tokens prt
        WHERE prt.token = ?
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tokenData) {
        http_response_code(404);
        echo json_encode(['error' => 'Token inválido']);
        return;
    }
    
    if ($tokenData['used']) {
        http_response_code(400);
        echo json_encode(['error' => 'Token já utilizado']);
        return;
    }
    
    if (strtotime($tokenData['expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'Token expirado']);
        return;
    }
    
    // Atualizar senha
    $pdo->beginTransaction();
    
    try {
        // Hash da nova senha
        $passwordHash = password_hash($newPassword, PASSWORD_ARGON2ID);
        
        // Atualizar senha do usuário
        $stmt = $pdo->prepare("
            UPDATE resellers 
            SET password_hash = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$passwordHash, $tokenData['reseller_id']]);
        
        // Marcar token como usado
        $stmt = $pdo->prepare("
            UPDATE password_reset_tokens 
            SET used = TRUE, used_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$tokenData['id']]);
        
        $pdo->commit();
        
        error_log("Senha redefinida com sucesso para: " . $tokenData['email']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Senha redefinida com sucesso'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Erro ao redefinir senha: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao redefinir senha']);
    }
}
