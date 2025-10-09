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
    
    $email = Validator::sanitizeString($input['email']);
    $password = $input['password'];
    $display_name = Validator::sanitizeString($input['display_name'] ?? '');
    
    if (!Validator::validateEmail($email)) {
        Response::error('Invalid email format');
    }
    
    if (strlen($password) < 8) {
        Response::error('Password must be at least 8 characters');
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
    
    // Create user
    beginTransaction();
    
    try {
        executeQuery(
            "INSERT INTO resellers (id, email, password_hash, display_name, email_verified, is_active) 
             VALUES (?, ?, ?, ?, ?, ?)",
            [$user_id, $email, $password_hash, $display_name, 0, 1]
        );
        
        // Log the registration
        AuditLogger::log($user_id, 'REGISTER', 'resellers', $user_id, null, [
            'email' => $email,
            'display_name' => $display_name
        ]);
        
        commit();
        
        // Generate JWT token
        $token = JWT::encode([
            'reseller_id' => $user_id,
            'email' => $email,
            'display_name' => $display_name
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
        
        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user_id,
                'email' => $email,
                'display_name' => $display_name,
                'email_verified' => false
            ]
        ], 'Registration successful');
        
    } catch (Exception $e) {
        rollback();
        error_log('Registration error: ' . $e->getMessage());
        Response::error('Registration failed', 500);
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
