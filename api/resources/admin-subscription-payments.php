<?php
/**
 * API - Admin Subscription Payments (Fixed)
 */

// Definir APP_INIT se ainda não estiver definido
if (!defined('APP_INIT')) {
    define('APP_INIT', true);
}

require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:9002');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $pdo = getDbConnection();
    
    if ($method === 'GET') {
        // Buscar pagamentos
        $stmt = $pdo->prepare("
            SELECT 
              ph.id, ph.reseller_id, r.display_name as reseller_name,
              r.email as reseller_email, ph.plan_id, p.name as plan_name,
              ph.amount, ph.payment_method, ph.status, ph.transaction_id,
              ph.payment_date, ph.expires_at, ph.notes
            FROM reseller_payment_history ph
            INNER JOIN resellers r ON ph.reseller_id = r.id
            LEFT JOIN reseller_subscription_plans p ON ph.plan_id = p.id
            ORDER BY ph.payment_date DESC
        ");
        
        $stmt->execute();
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular estatísticas
        $stats = [
            'total_pending_amount' => 0,
            'total_paid_amount' => 0,
            'pending_count' => 0,
            'paid_count' => 0,
            'expired_count' => 0
        ];
        
        foreach ($payments as $payment) {
            $amount = floatval($payment['amount']);
            
            if ($payment['status'] === 'pending') {
                $stats['total_pending_amount'] += $amount;
                $stats['pending_count']++;
            } elseif ($payment['status'] === 'paid') {
                $stats['total_paid_amount'] += $amount;
                $stats['paid_count']++;
            } elseif ($payment['status'] === 'expired') {
                $stats['expired_count']++;
            }
        }
        
        echo json_encode([
            'payments' => $payments,
            'stats' => $stats
        ]);
        exit;
    }
    
    // Outros métodos...
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
}