<?php
/**
 * API Resource: Public Plans
 * Retorna planos ativos para exibição na landing page (sem autenticação)
 */

require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Apenas GET é permitido
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Método não permitido']);
  exit;
}

try {
  $pdo = getDbConnection();
  
  // Buscar apenas planos ativos
  $stmt = $pdo->prepare("
    SELECT 
      id,
      name,
      description,
      price,
      duration_days,
      is_trial
    FROM reseller_subscription_plans
    WHERE is_active = 1
    ORDER BY 
      CASE 
        WHEN is_trial = 1 THEN 0
        ELSE 1
      END,
      duration_days ASC
  ");
  
  $stmt->execute();
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Converter tipos
  foreach ($plans as &$plan) {
    $plan['price'] = (float)$plan['price'];
    $plan['duration_days'] = (int)$plan['duration_days'];
    $plan['is_trial'] = (bool)$plan['is_trial'];
  }
  unset($plan);
  
  echo json_encode([
    'success' => true,
    'plans' => $plans
  ], JSON_NUMERIC_CHECK);
  
} catch (Exception $e) {
  error_log("Erro ao buscar planos públicos: " . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => 'Erro ao buscar planos'
  ]);
}
