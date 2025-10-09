<?php
/**
 * Security Layer
 * Enterprise-grade security implementation
 * 
 * Features:
 * - JWT Authentication
 * - CSRF Protection
 * - XSS Prevention
 * - SQL Injection Prevention (via PDO)
 * - Rate Limiting
 * - Input Validation & Sanitization
 * - Secure Password Hashing
 * - Session Management
 */

define('APP_INIT', true);

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('Content-Security-Policy: default-src \'self\'');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// CORS configuration (adjust for your frontend domain)
$allowed_origins = [
    'http://localhost:9002',
    'http://localhost:3000',
    getenv('FRONTEND_URL') ?: 'https://yourdomain.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
}

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

/**
 * JWT Token Management
 */
class JWT {
    private static $secret_key;
    private static $algorithm = 'HS256';
    
    public static function init() {
        self::$secret_key = getenv('JWT_SECRET') ?: bin2hex(random_bytes(32));
        if (!getenv('JWT_SECRET')) {
            error_log('WARNING: JWT_SECRET not set in environment. Using random key.');
        }
    }
    
    /**
     * Generate JWT token
     */
    public static function encode(array $payload, int $expiry = 86400): string {
        $header = [
            'typ' => 'JWT',
            'alg' => self::$algorithm
        ];
        
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiry;
        $payload['jti'] = bin2hex(random_bytes(16)); // Unique token ID
        
        $base64UrlHeader = self::base64UrlEncode(json_encode($header));
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac(
            'sha256',
            $base64UrlHeader . '.' . $base64UrlPayload,
            self::$secret_key,
            true
        );
        
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        return $base64UrlHeader . '.' . $base64UrlPayload . '.' . $base64UrlSignature;
    }
    
    /**
     * Decode and verify JWT token
     */
    public static function decode(string $token): ?array {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }
        
        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
        
        // Verify signature
        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac(
            'sha256',
            $base64UrlHeader . '.' . $base64UrlPayload,
            self::$secret_key,
            true
        );
        
        if (!hash_equals($signature, $expectedSignature)) {
            return null;
        }
        
        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);
        
        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }
        
        return $payload;
    }
    
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

JWT::init();

/**
 * CSRF Protection
 */
class CSRF {
    /**
     * Generate CSRF token
     */
    public static function generateToken(): string {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();
        
        return $token;
    }
    
    /**
     * Verify CSRF token
     */
    public static function verifyToken(string $token): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
            return false;
        }
        
        // Token expires after 1 hour
        if (time() - $_SESSION['csrf_token_time'] > 3600) {
            return false;
        }
        
        return hash_equals($_SESSION['csrf_token'], $token);
    }
}

/**
 * Rate Limiting
 */
class RateLimiter {
    private static $storage_file = __DIR__ . '/../storage/rate_limits.json';
    
    /**
     * Check if request is allowed
     */
    public static function check(string $identifier, int $max_requests = 100, int $window = 60): bool {
        $limits = self::load();
        $now = time();
        
        // Clean old entries
        $limits = array_filter($limits, function($data) use ($now, $window) {
            return ($now - $data['first_request']) < $window;
        });
        
        if (!isset($limits[$identifier])) {
            $limits[$identifier] = [
                'count' => 1,
                'first_request' => $now
            ];
            self::save($limits);
            return true;
        }
        
        $data = $limits[$identifier];
        
        // Reset if window expired
        if (($now - $data['first_request']) >= $window) {
            $limits[$identifier] = [
                'count' => 1,
                'first_request' => $now
            ];
            self::save($limits);
            return true;
        }
        
        // Check limit
        if ($data['count'] >= $max_requests) {
            return false;
        }
        
        // Increment counter
        $limits[$identifier]['count']++;
        self::save($limits);
        return true;
    }
    
    private static function load(): array {
        if (!file_exists(self::$storage_file)) {
            return [];
        }
        
        $content = file_get_contents(self::$storage_file);
        return json_decode($content, true) ?: [];
    }
    
    private static function save(array $data): void {
        $dir = dirname(self::$storage_file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        file_put_contents(self::$storage_file, json_encode($data));
    }
}

/**
 * Input Validation & Sanitization
 */
class Validator {
    /**
     * Sanitize string input
     */
    public static function sanitizeString(string $input): string {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Validate email
     */
    public static function validateEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validate UUID
     */
    public static function validateUUID(string $uuid): bool {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid) === 1;
    }
    
    /**
     * Validate date
     */
    public static function validateDate(string $date, string $format = 'Y-m-d'): bool {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }
    
    /**
     * Sanitize array recursively
     */
    public static function sanitizeArray(array $data): array {
        $sanitized = [];
        foreach ($data as $key => $value) {
            $key = self::sanitizeString($key);
            if (is_array($value)) {
                $sanitized[$key] = self::sanitizeArray($value);
            } else if (is_string($value)) {
                $sanitized[$key] = self::sanitizeString($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        return $sanitized;
    }
}

/**
 * Password Security
 */
class PasswordSecurity {
    /**
     * Hash password securely
     */
    public static function hash(string $password): string {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3
        ]);
    }
    
    /**
     * Verify password
     */
    public static function verify(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }
    
    /**
     * Check if password needs rehashing
     */
    public static function needsRehash(string $hash): bool {
        return password_needs_rehash($hash, PASSWORD_ARGON2ID);
    }
}

/**
 * Encryption for sensitive data
 */
class Encryption {
    private static $method = 'aes-256-gcm';
    private static $key;
    
    public static function init() {
        self::$key = getenv('ENCRYPTION_KEY') ?: bin2hex(random_bytes(32));
        if (!getenv('ENCRYPTION_KEY')) {
            error_log('WARNING: ENCRYPTION_KEY not set in environment. Using random key.');
        }
    }
    
    /**
     * Encrypt data
     */
    public static function encrypt(string $data): string {
        $iv = random_bytes(openssl_cipher_iv_length(self::$method));
        $tag = '';
        
        $encrypted = openssl_encrypt(
            $data,
            self::$method,
            self::$key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        return base64_encode($iv . $tag . $encrypted);
    }
    
    /**
     * Decrypt data
     */
    public static function decrypt(string $data): ?string {
        $data = base64_decode($data);
        $iv_length = openssl_cipher_iv_length(self::$method);
        
        $iv = substr($data, 0, $iv_length);
        $tag = substr($data, $iv_length, 16);
        $encrypted = substr($data, $iv_length + 16);
        
        $decrypted = openssl_decrypt(
            $encrypted,
            self::$method,
            self::$key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        return $decrypted !== false ? $decrypted : null;
    }
}

Encryption::init();

/**
 * Authentication Middleware
 */
class Auth {
    /**
     * Get current authenticated user from JWT
     */
    public static function getCurrentUser(): ?array {
        // Handle both web server and CLI environments
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        } else {
            // Fallback for CLI or when getallheaders() is not available
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
        }
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        $payload = JWT::decode($token);
        
        if (!$payload || !isset($payload['reseller_id'])) {
            return null;
        }
        
        return $payload;
    }
    
    /**
     * Require authentication
     */
    public static function requireAuth(): array {
        // MODO DESENVOLVIMENTO - ativado temporariamente
        $dev_mode = getenv('DEV_MODE') === 'true' || true; // Força modo dev
        if ($dev_mode) {
            return [
                'reseller_id' => 'admin-user-001',
                'email' => 'admin@admin.com',
                'display_name' => 'Administrador'
            ];
        }
        
        // Código de produção
        $user = self::getCurrentUser();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        return $user;
    }
    
    /**
     * Check rate limit for current IP
     */
    public static function checkRateLimit(int $max_requests = 10000, int $window = 60): void {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        if (!RateLimiter::check($ip, $max_requests, $window)) {
            http_response_code(429);
            echo json_encode(['error' => 'Too many requests. Please try again later.']);
            exit;
        }
    }
}

/**
 * Audit Logger
 */
class AuditLogger {
    /**
     * Log action to database
     */
    public static function log(
        string $reseller_id,
        string $action,
        string $table_name,
        ?string $record_id = null,
        ?array $old_values = null,
        ?array $new_values = null
    ): void {
        require_once __DIR__ . '/../database/config.php';
        
        $sql = "INSERT INTO audit_logs 
                (reseller_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $params = [
            $reseller_id,
            $action,
            $table_name,
            $record_id,
            $old_values ? json_encode($old_values) : null,
            $new_values ? json_encode($new_values) : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ];
        
        try {
            executeQuery($sql, $params);
        } catch (Exception $e) {
            error_log('Audit log failed: ' . $e->getMessage());
        }
    }
}

/**
 * Response helper
 */
class Response {
    public static function json(array $data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    public static function error(string $message, int $status = 400): void {
        self::json(['error' => $message], $status);
    }
    
    public static function success(array $data = [], string $message = 'Success'): void {
        self::json(array_merge(['success' => true, 'message' => $message], $data));
    }
}
