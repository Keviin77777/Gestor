<?php
/**
 * Main API Router
 * Routes requests to appropriate handlers
 */

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../database/config.php';

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api/ prefix if present (for direct access)
// Keep as is for proxy access (Next.js rewrites)
if (strpos($path, '/api/') === 0) {
    $path = str_replace('/api/', '', $path);
}

$path_parts = array_filter(explode('/', $path));
$path_parts = array_values($path_parts);

// Debug logging
error_log("API Debug - Path: " . $path);
error_log("API Debug - Path parts: " . print_r($path_parts, true));
error_log("API Debug - Method: " . $method);
error_log("API Debug - Request URI: " . $_SERVER['REQUEST_URI']);
error_log("API Debug - Script name: " . $_SERVER['SCRIPT_NAME']);

// Route to appropriate handler
try {
    if (empty($path_parts)) {
        Response::json(['message' => 'IPTV Manager API v1.0', 'status' => 'online']);
    }
    
    $resource = $path_parts[0] ?? '';
    
    switch ($resource) {
        case 'auth':
            require __DIR__ . '/auth.php';
            break;
            
        case 'clients':
            require __DIR__ . '/resources/clients.php';
            break;
            
        case 'panels':
            require __DIR__ . '/resources/panels.php';
            break;
            
        case 'plans':
            require __DIR__ . '/resources/plans.php';
            break;
            
        case 'expenses':
            require __DIR__ . '/resources/expenses.php';
            break;
            
        case 'revenues':
            require __DIR__ . '/resources/revenues.php';
            break;
            
        case 'notifications':
            require __DIR__ . '/resources/notifications.php';
            break;
            
        case 'invoices':
            error_log("API Debug - Routing to invoices.php");
            require __DIR__ . '/resources/invoices.php';
            error_log("API Debug - invoices.php loaded successfully");
            break;
            
        case 'apps':
            require __DIR__ . '/resources/apps.php';
            break;
            
        case 'dashboard':
            require __DIR__ . '/resources/dashboard.php';
            break;
            
        case 'reports':
            require __DIR__ . '/resources/reports.php';
            break;
            
        case 'reports-old':
            require __DIR__ . '/resources/reports.php';
            break;
            
        case 'sigma':
            require __DIR__ . '/resources/sigma.php';
            break;
            
        case 'whatsapp-reminder-templates':
            require __DIR__ . '/resources/whatsapp-reminder-templates.php';
            break;
            
        case 'whatsapp-reminder-settings':
            require __DIR__ . '/resources/whatsapp-reminder-settings.php';
            break;
            
        case 'whatsapp-reminder-logs':
            require __DIR__ . '/resources/whatsapp-reminder-logs.php';
            break;
            
        default:
            Response::error('Resource not found', 404);
    }
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    Response::error('Internal server error', 500);
}
