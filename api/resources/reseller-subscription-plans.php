<?php
/**
 * API Resource: Reseller Subscription Plans
 * Gerencia planos de assinatura (globais + customizados)
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Verificar se é rota pública
$isPublic = strpos($path, '/public') !== false;

// Autenticação apenas para rotas não públicas
if (!$isPublic) {
  $user = Auth::requireAuth();
}

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
  error_log("Erro em reseller-subscription-plans: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * GET - Buscar todos os planos (globais + customizados)
 * Retorna SEMPRE os planos padrão + planos customizados criados pelo admin
 */
function handleGet($pdo) {
  try {
    // Buscar TODOS os planos do banco (globais + customizados)
    $stmt = $pdo->prepare("
      SELECT 
        id, 
        name, 
        description, 
        price, 
        duration_days, 
        is_active,
        is_trial,
        created_at
      FROM reseller_subscription_plans
      WHERE is_active = TRUE
      ORDER BY 
        CASE 
          WHEN is_trial = TRUE THEN 0
          ELSE 1
        END,
        duration_days ASC
    ");
    
    $stmt->execute();
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Converter is_active e is_trial para boolean
    foreach ($plans as &$plan) {
      $plan['is_active'] = (bool)$plan['is_active'];
      $plan['is_trial'] = (bool)($plan['is_trial'] ?? false);
      $plan['price'] = (float)$plan['price'];
      $plan['duration_days'] = (int)$plan['duration_days'];
    }
    unset($plan);
    
    // Se não houver planos no banco, retornar planos padrão (fallback)
    if (empty($plans)) {
      error_log("⚠️ Nenhum plano encontrado no banco, retornando fallback");
      $plans = [
        [
          'id' => 'plan_trial',
          'name' => 'Trial 3 Dias',
          'description' => 'Período de teste gratuito de 3 dias',
          'price' => 0.00,
          'duration_days' => 3,
          'is_active' => true,
          'is_trial' => true
        ],
        [
          'id' => 'plan_monthly',
          'name' => 'Plano Mensal',
          'description' => 'Ideal para começar',
          'price' => 39.90,
          'duration_days' => 30,
          'is_active' => true,
          'is_trial' => false
        ],
        [
          'id' => 'plan_semester',
          'name' => 'Plano Semestral',
          'description' => 'Economia de 16%',
          'price' => 200.90,
          'duration_days' => 180,
          'is_active' => true,
          'is_trial' => false
        ],
        [
          'id' => 'plan_annual',
          'name' => 'Plano Anual',
          'description' => 'Melhor custo-benefício',
          'price' => 380.90,
          'duration_days' => 365,
          'is_active' => true,
          'is_trial' => false
        ]
      ];
    }
    
    echo json_encode([
      'plans' => $plans
    ], JSON_NUMERIC_CHECK);
    
  } catch (Exception $e) {
    error_log("Erro ao buscar planos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao buscar planos']);
  }
}
