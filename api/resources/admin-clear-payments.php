<?php
/**
 * API - Clear All Admin Payments
 */

// Definir APP_INIT se ainda não estiver definido
if (!defined('APP_INIT')) {
    define('APP_INIT', true);
}

require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:9002');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDbConnection();
    
    // Deletar TODOS os pagamentos (apenas admin pode fazer isso)
    $stmt = $pdo->prepare("DELETE FROM reseller_payment_history");
    $stmt->execute();
    
    $deletedCount = $stmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "Todo o histórico foi limpo! $deletedCount pagamento(s) removido(s).",
        'deleted_count' => $deletedCount
    ]);
    
} catch (Exception $e) {
    error_log("Erro ao limpar todo histórico: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao limpar histórico: ' . $e->getMessage()]);
}