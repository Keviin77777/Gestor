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
$path = str_replace('/api/', '', $path);
$path_parts = array_filter(explode('/', $path));
$path_parts = array_values($path_parts);

// Make variables global for resource files
$GLOBALS['method'] = $method;
$GLOBALS['path_parts'] = $path_parts;

// Debug logging
error_log("API Request: $method " . $_SERVER['REQUEST_URI']);
error_log("Parsed path: $path");
error_log("Path parts: " . json_encode($path_parts));

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
            require __DIR__ . '/resources/invoices.php';
            break;
            
        case 'apps':
            require __DIR__ . '/resources/apps.php';
            break;
            
        case 'dashboard':
            require __DIR__ . '/resources/dashboard.php';
            break;
            
        case 'reports':
            require __DIR__ . '/resources/reports.php';
            exit; // Important: exit after reports to avoid conflicts
            break;
            
        case 'reports-old':
            require __DIR__ . '/resources/reports.php';
            break;
            
        case 'auth-user':
            require __DIR__ . '/resources/auth-user.php';
            break;
            
        case 'reseller-subscriptions':
            require __DIR__ . '/resources/reseller-subscriptions.php';
            break;
            
        case 'reseller-subscription-payment':
            require __DIR__ . '/resources/reseller-subscription-payment.php';
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
            
        case 'whatsapp-templates':
            require __DIR__ . '/resources/whatsapp-templates.php';
            break;
            
        case 'payment-methods':
            require __DIR__ . '/resources/payment-methods.php';
            break;
            
        case 'payment-checkout':
            require __DIR__ . '/resources/payment-checkout.php';
            break;
            
        case 'admin-resellers':
            require __DIR__ . '/resources/admin-resellers.php';
            break;
            
        case 'admin-subscription-payments':
            require __DIR__ . '/resources/admin-subscription-payments.php';
            break;
            
        case 'admin-clear-payments':
            require __DIR__ . '/resources/admin-clear-payments.php';
            break;
            
        case 'reseller-subscription-plans':
            require __DIR__ . '/resources/reseller-subscription-plans.php';
            break;
            
        case 'public-plans':
            require __DIR__ . '/resources/public-plans.php';
            break;
            
        case 'password-reset':
            require __DIR__ . '/resources/password-reset.php';
            break;
            
        case 'debug-reset-tokens':
            require __DIR__ . '/resources/debug-reset-tokens.php';
            break;
            
        case 'sigma':
            require __DIR__ . '/resources/sigma.php';
            break;
            
        case 'webhooks':
            // Handle webhook routes
            if (isset($path_parts[1])) {
                $webhook_type = $path_parts[1];
                switch ($webhook_type) {
                    case 'mercadopago':
                        require __DIR__ . '/webhooks/mercadopago.php';
                        break;
                    case 'asaas':
                        require __DIR__ . '/webhooks/asaas.php';
                        break;
                    default:
                        Response::error('Webhook not found', 404);
                }
            } else {
                Response::error('Webhook type required', 400);
            }
            break;
            
        default:
            Response::error('Resource not found', 404);
    }
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    Response::error('Internal server error', 500);
}
