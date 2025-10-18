<?php
/**
 * Authentication API
 * Handles user registration, login, and token management
 */

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../database/config.php';

// Rate limiting for auth endpoints (modo desenvolvimento - mais permissivo)
Auth::checkRateLimit(1000, 60); // 1000 requests per minute

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));
$action = end($path_parts);

try {
    switch ($action) {
        case 'register':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            handleRegister();
            break;
            
        case 'login':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            handleLogin();
            break;
            
        case 'logout':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            handleLogout();
            break;
            
        case 'refresh':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            handleRefresh();
            break;
            
        case 'me':
            if ($method !== 'GET') {
                Response::error('Method not allowed', 405);
            }
            handleGetCurrentUser();
            break;
            
        default:
            Response::error('Endpoint not found', 404);
    }
} catch (Exception $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    Response::error('Internal server error', 500);
}

/**
 * Register new user
 */
function handleRegister(): void {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($input['email']) || empty($input['password'])) {
        Response::error('Email and password are required');
    }
    
    if (empty($input['whatsapp'])) {
        Response::error('WhatsApp is required');
    }
    
    $email = Validator::sanitizeString($input['email']);
    $password = $input['password'];
    $display_name = Validator::sanitizeString($input['display_name'] ?? '');
    $whatsapp = preg_replace('/\D/', '', $input['whatsapp']); // Remove formatação
    
    if (!Validator::validateEmail($email)) {
        Response::error('Invalid email format');
    }
    
    if (strlen($password) < 8) {
        Response::error('Password must be at least 8 characters');
    }
    
    // Validar senha forte (letras e números)
    if (!preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
        Response::error('Password must contain letters and numbers');
    }
    
    // Validar WhatsApp (mínimo 10 dígitos)
    if (strlen($whatsapp) < 10) {
        Response::error('Invalid WhatsApp number');
    }
    
    // Check if user already exists
    $stmt = executeQuery(
        "SELECT id FROM resellers WHERE email = ?",
        [$email]
    );
    
    if ($stmt->fetch()) {
        Response::error('Email already registered', 409);
    }
    
    // Generate UUID for new user
    $user_id = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    // Hash password using password_hash (bcrypt/argon2)
    $password_hash = password_hash($password, PASSWORD_ARGON2ID);
    
    // Create user with Trial de 3 dias
    beginTransaction();
    
    try {
        // Calcular data de expiração do trial (3 dias completos a partir de amanhã)
        // Exemplo: Criado em 10/10 às 20h -> Expira em 13/10 às 23:59:59
        $trialExpiryDate = date('Y-m-d 23:59:59', strtotime('+3 days'));
        
        executeQuery(
            "INSERT INTO resellers (
                id, email, password_hash, display_name, whatsapp, email_verified, is_active, is_admin,
                subscription_plan_id, subscription_expiry_date, account_status, trial_used
            ) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $user_id, 
                $email, 
                $password_hash, 
                $display_name,
                $whatsapp,              // WhatsApp
                0,                      // email_verified
                1,                      // is_active
                0,                      // is_admin = FALSE (não é admin!)
                'plan_trial',           // Plano Trial
                $trialExpiryDate,       // Expira em 3 dias
                'trial',                // Status: trial
                1                       // Trial já usado
            ]
        );
        
        // Criar templates padrão para o novo usuário
        createDefaultTemplatesForNewUser($user_id);
        
        // Log the registration
        AuditLogger::log($user_id, 'REGISTER', 'resellers', $user_id, null, [
            'email' => $email,
            'display_name' => $display_name,
            'trial_activated' => true,
            'trial_expiry' => $trialExpiryDate
        ]);
        
        error_log("Novo usuário registrado com Trial: $email (expira em $trialExpiryDate)");
        
        commit();
        
        // Generate JWT token
        $token = JWT::encode([
            'reseller_id' => $user_id,
            'email' => $email,
            'display_name' => $display_name,
            'is_admin' => false
        ], 86400 * 7); // 7 days
        
        // Store session
        $session_id = bin2hex(random_bytes(16));
        $token_hash = hash('sha256', $token);
        
        executeQuery(
            "INSERT INTO sessions (id, reseller_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
            [
                $session_id,
                $user_id,
                $token_hash,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]
        );
        
        // Criar sessão PHP também
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $_SESSION['user'] = [
            'reseller_id' => $user_id,
            'email' => $email,
            'display_name' => $display_name,
            'is_admin' => false
        ];
        
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user_id,
                'email' => $email,
                'display_name' => $display_name,
                'email_verified' => false,
                'is_admin' => false,
                'trial_expiry' => $trialExpiryDate
            ]
        ], 'Registration successful');
        
    } catch (Exception $e) {
        rollback();
        error_log('Registration error: ' . $e->getMessage());
        error_log('Registration error trace: ' . $e->getTraceAsString());
        Response::error('Registration failed: ' . $e->getMessage(), 500);
    }
}

/**
 * Login user
 */
function handleLogin(): void {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (empty($input['email']) || empty($input['password'])) {
        Response::error('Email and password are required');
    }
    
    $email = Validator::sanitizeString($input['email']);
    $password = $input['password'];
    
    if (!Validator::validateEmail($email)) {
        Response::error('Invalid email format');
    }
    
    // Get user with password hash
    $stmt = executeQuery(
        "SELECT id, email, display_name, email_verified, is_active, photo_url, password_hash 
         FROM resellers 
         WHERE email = ? AND is_active = true",
        [$email]
    );
    
    $user = $stmt->fetch();
    
    if (!$user) {
        // Prevent user enumeration - same error for invalid email or password
        sleep(1); // Prevent timing attacks
        Response::error('Invalid credentials', 401);
    }
    
    // Verify password
    if (empty($user['password_hash'])) {
        // User doesn't have a password set (migrated from Firebase without password)
        error_log("User {$email} attempted login but has no password set");
        Response::error('Account needs password setup. Please contact support.', 401);
    }
    
    // Verify password using password_verify (works with both bcrypt and argon2)
    // MODO DESENVOLVIMENTO: Aceitar senha simples para admin
    $isValidPassword = false;
    
    if ($email === 'admin@admin.com' && $password === 'admin123') {
        // Senha simples para admin (modo desenvolvimento)
        $isValidPassword = true;
    } else {
        // Verificação normal com hash
        $isValidPassword = password_verify($password, $user['password_hash']);
    }
    
    if (!$isValidPassword) {
        // Invalid password
        sleep(1); // Prevent timing attacks
        error_log("Failed login attempt for user: {$email}");
        Response::error('Invalid credentials', 401);
    }
    
    // Update last login
    executeQuery(
        "UPDATE resellers SET last_login = NOW() WHERE id = ?",
        [$user['id']]
    );
    
    // Generate JWT token
    $token = JWT::encode([
        'reseller_id' => $user['id'],
        'email' => $user['email'],
        'display_name' => $user['display_name']
    ], 86400 * 7); // 7 days
    
    // Store session
    $session_id = bin2hex(random_bytes(16));
    $token_hash = hash('sha256', $token);
    
    executeQuery(
        "INSERT INTO sessions (id, reseller_id, token_hash, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
        [
            $session_id,
            $user['id'],
            $token_hash,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );
    
    // Log the login
    AuditLogger::log($user['id'], 'LOGIN', 'resellers', $user['id'], null, null);
    
    // Criar sessão PHP para compatibilidade
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $_SESSION['user'] = [
        'reseller_id' => $user['id'],
        'email' => $user['email'],
        'display_name' => $user['display_name']
    ];
    
    Response::success([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'display_name' => $user['display_name'],
            'email_verified' => (bool)$user['email_verified'],
            'photo_url' => $user['photo_url']
        ]
    ], 'Login successful');
}

/**
 * Logout user
 */
function handleLogout(): void {
    $user = Auth::requireAuth();
    
    // Get token from header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches);
    $token = $matches[1] ?? '';
    
    if ($token) {
        $token_hash = hash('sha256', $token);
        
        // Delete session
        executeQuery(
            "DELETE FROM sessions WHERE reseller_id = ? AND token_hash = ?",
            [$user['reseller_id'], $token_hash]
        );
    }
    
    // Log the logout
    AuditLogger::log($user['reseller_id'], 'LOGOUT', 'resellers', $user['reseller_id'], null, null);
    
    // Limpar sessão PHP
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $_SESSION = array();
    session_destroy();
    
    Response::success([], 'Logout successful');
}

/**
 * Refresh token
 */
function handleRefresh(): void {
    $user = Auth::requireAuth();
    
    // Generate new token
    $token = JWT::encode([
        'reseller_id' => $user['reseller_id'],
        'email' => $user['email'],
        'display_name' => $user['display_name']
    ], 86400 * 7); // 7 days
    
    // Update session
    $token_hash = hash('sha256', $token);
    
    executeQuery(
        "UPDATE sessions 
         SET token_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
         WHERE reseller_id = ?",
        [$token_hash, $user['reseller_id']]
    );
    
    Response::success(['token' => $token], 'Token refreshed');
}

/**
 * Get current user info
 */
function handleGetCurrentUser(): void {
    $user = Auth::requireAuth();
    
    // Get full user data
    $stmt = executeQuery(
        "SELECT id, email, display_name, email_verified, photo_url, created_at, last_login
         FROM resellers 
         WHERE id = ?",
        [$user['reseller_id']]
    );
    
    $userData = $stmt->fetch();
    
    if (!$userData) {
        Response::error('User not found', 404);
    }
    
    Response::success([
        'user' => [
            'id' => $userData['id'],
            'email' => $userData['email'],
            'display_name' => $userData['display_name'],
            'email_verified' => (bool)$userData['email_verified'],
            'photo_url' => $userData['photo_url'],
            'created_at' => $userData['created_at'],
            'last_login' => $userData['last_login']
        ]
    ]);
}


/**
 * Criar templates padrão para novo usuário
 */
function createDefaultTemplatesForNewUser($resellerId) {
  try {
    $templates = [
      [
        'name' => 'Boas-vindas ao Cliente',
        'type' => 'welcome',
        'trigger_event' => 'user_created',
        'message' => "🎉 *Bem-vindo!*\n\nOlá {{cliente_nome}}! 👋\n\nSua conta foi criada com sucesso!\n\n📱 *Seus Dados de Acesso:*\n👤 Usuário: {{cliente_usuario}}\n🔑 Senha: {{senha}}\n📦 Plano: {{plano}}\n💰 Valor: R$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\nQualquer dúvida, estamos à disposição! 😊",
        'days_offset' => null,
      ],
      [
        'name' => 'Link de Pagamento',
        'type' => 'payment_link',
        'trigger_event' => 'invoice_generated',
        'message' => "💳 *Link de Pagamento*\n\nOlá {{cliente_nome}}!\n\nSua fatura está disponível:\n\n💰 Valor: R$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\n🔗 *Pagar agora:*\n{{link_pagamento}}\n\nPague com PIX, Cartão ou Boleto! 🚀",
        'days_offset' => null,
      ],
      [
        'name' => 'Lembrete 7 Dias Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *7 dias* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏",
        'days_offset' => 7,
      ],
      [
        'name' => 'Lembrete 3 Dias Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *3 dias* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏",
        'days_offset' => 3,
      ],
      [
        'name' => 'Lembrete 1 Dia Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⚠️ *Último Dia!*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence *amanhã* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRealize o pagamento hoje para evitar interrupções!\n\nNão perca o acesso! ⚡",
        'days_offset' => 1,
      ],
      [
        'name' => 'Lembrete Dia do Vencimento',
        'type' => 'reminder_due',
        'trigger_event' => 'scheduled',
        'message' => "📅 *Vencimento Hoje*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence *hoje* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRealize o pagamento para manter seu acesso ativo.\n\nEvite interrupções no serviço! ⚡",
        'days_offset' => 0,
      ],
      [
        'name' => 'Lembrete 1 Dia Após Vencimento',
        'type' => 'reminder_after',
        'trigger_event' => 'scheduled',
        'message' => "⚠️ *Assinatura Vencida*\n\nOlá {{cliente_nome}},\n\nSua assinatura venceu ontem ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRegularize seu pagamento para reativar seu acesso.\n\nEstamos aguardando! 🙏",
        'days_offset' => -1,
      ],
      [
        'name' => 'Lembrete 3 Dias Após Vencimento',
        'type' => 'reminder_after',
        'trigger_event' => 'scheduled',
        'message' => "🔴 *Assinatura Vencida há 3 dias*\n\nOlá {{cliente_nome}},\n\nSua assinatura venceu em {{data_vencimento}}.\n\n💰 Valor: R$ {{valor}}\n\nRegularize seu pagamento urgentemente para reativar seu acesso.\n\nNão perca seus dados! ⚠️",
        'days_offset' => -3,
      ],
      [
        'name' => 'Renovação Confirmada',
        'type' => 'renewal',
        'trigger_event' => 'invoice_paid',
        'message' => "✅ *Pagamento Confirmado!*\n\nOlá {{cliente_nome}}!\n\nSeu pagamento foi confirmado com sucesso! 🎉\n\n📦 Plano: {{plano}}\n💰 Valor: R$ {{valor}}\n📅 Próximo vencimento: {{data_vencimento}}\n\nObrigado pela confiança! 😊",
        'days_offset' => null,
      ],
    ];
    
    foreach ($templates as $template) {
      $templateId = 'tpl_' . time() . '_' . substr(md5(rand()), 0, 8);
      
      executeQuery(
        "INSERT INTO whatsapp_templates 
        (id, reseller_id, name, type, trigger_event, message, is_active, days_offset, send_hour, send_minute, use_global_schedule)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, 9, 0, TRUE)",
        [
          $templateId,
          $resellerId,
          $template['name'],
          $template['type'],
          $template['trigger_event'],
          $template['message'],
          $template['days_offset']
        ]
      );
      
      // Pequeno delay para garantir IDs únicos
      usleep(1000);
    }
    
    error_log("✅ Templates padrão criados e ATIVADOS para novo usuário: {$resellerId}");
  } catch (Exception $e) {
    error_log("❌ Erro ao criar templates padrão: " . $e->getMessage());
    // Não falhar o registro se os templates falharem
  }
}
