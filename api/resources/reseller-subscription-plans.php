<?php
/**
 * API - Reseller Subscription Plans
 */

// Permitir acesso direto para esta API
if (!defined('APP_INIT')) {
    define('APP_INIT', true);
}

require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $pdo = getDbConnection();
    
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
    }
} catch (Exception $e) {
    error_log("Erro na API de planos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
}

function handleGet($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, name, price, duration_days, description, is_active
        FROM reseller_subscription_plans
        WHERE is_active = 1
        ORDER BY price ASC
    ");
    
    $stmt->execute();
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'plans' => $plans
    ]);
}