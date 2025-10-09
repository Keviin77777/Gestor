<?php
/**
 * Database Configuration
 * Security Level: Maximum
 * 
 * This file contains secure database connection settings
 * with multiple layers of protection against common attacks.
 */

// Prevent direct access
if (!defined('APP_INIT')) {
    http_response_code(403);
    die('Direct access forbidden');
}

// Load .env file if exists
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse line
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            if (preg_match('/^(["\'])(.*)\\1$/', $value, $matches)) {
                $value = $matches[2];
            }
            
            // Set environment variable if not already set
            if (!getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
}

// Environment-based configuration
$env = getenv('APP_ENV') ?: 'production';

// Database configuration
$db_config = [
    'development' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => getenv('DB_PORT') ?: 3306,
        'database' => getenv('DB_NAME') ?: 'iptv_manager',
        'username' => getenv('DB_USER') ?: 'iptv_app',
        'password' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'production' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => getenv('DB_PORT') ?: 3306,
        'database' => getenv('DB_NAME') ?: 'iptv_manager',
        'username' => getenv('DB_USER') ?: 'iptv_app',
        'password' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ]
];

// Get current environment config
$config = $db_config[$env] ?? $db_config['production'];

// PDO options for maximum security
$pdo_options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false, // Use real prepared statements
    PDO::ATTR_STRINGIFY_FETCHES => false,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$config['charset']} COLLATE utf8mb4_unicode_ci",
    PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true,
];

/**
 * Get secure database connection
 * 
 * @return PDO Database connection
 * @throws PDOException on connection failure
 */
function getDbConnection(): PDO {
    global $config, $pdo_options;
    
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], $pdo_options);
            
            // Additional security settings
            $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
            $pdo->exec("SET SESSION time_zone = '+00:00'");
            
        } catch (PDOException $e) {
            // Log error securely (don't expose credentials)
            error_log('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed. Please contact support.');
        }
    }
    
    return $pdo;
}

/**
 * Execute a prepared statement safely
 * 
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters to bind
 * @return PDOStatement
 */
function executeQuery(string $sql, array $params = []): PDOStatement {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

/**
 * Begin database transaction
 */
function beginTransaction(): void {
    getDbConnection()->beginTransaction();
}

/**
 * Commit database transaction
 */
function commit(): void {
    getDbConnection()->commit();
}

/**
 * Rollback database transaction
 */
function rollback(): void {
    getDbConnection()->rollBack();
}

/**
 * Get last inserted ID
 * 
 * @return string
 */
function getLastInsertId(): string {
    return getDbConnection()->lastInsertId();
}
