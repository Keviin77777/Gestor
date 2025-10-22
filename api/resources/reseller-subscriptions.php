<?php
/**
 * API Resource: Reseller Subscriptions
 * Gerencia assinaturas e planos dos revendas
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');

// Verificar autenticação
$user = Auth::requireAuth();
$resellerId = $user['reseller_id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = getDbConnection();
  
  switch ($method) {
    case 'GET':
      handleGet($pdo, $resellerId);
      break;
      
    case 'POST':
      handlePost($pdo, $resellerId);
      break;
      
    case 'PUT':
      handlePut($pdo, $resellerId);
      break;
      
    case 'DELETE':
      handleDelete($pdo, $resellerId);
      break;
      
    default:
      http_response_code(405);
      echo json_encode(['error' => 'Método não permitido']);
  }
  
} catch (Exception $e) {
  error_log("Erro em reseller-subscriptions: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * GET - Buscar informações de assinatura do revenda
 */
function handleGet($pdo, $resellerId) {
  try {
    // Buscar informações do revenda e assinatura atual
    $stmt = $pdo->prepare("
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.is_admin,
        r.subscription_expiry_date,
        r.subscription_plan_id,
        r.account_status,
        r.trial_used,
        rs.id as subscription_id,
        rs.status as subscription_status,
        rs.start_date as subscription_start_date,
        COALESCE(rsp.id, r.subscription_plan_id) as plan_id,
        COALESCE(rsp.name, 
          CASE 
            WHEN r.subscription_plan_id = 'plan_trial' THEN 'Trial 3 Dias'
            ELSE NULL
          END
        ) as plan_name,
        COALESCE(rsp.price, 
          CASE 
            WHEN r.subscription_plan_id = 'plan_trial' THEN 0.00
            ELSE NULL
          END
        ) as plan_price,
        COALESCE(rsp.duration_days,
          CASE 
            WHEN r.subscription_plan_id = 'plan_trial' THEN 3
            ELSE NULL
          END
        ) as plan_duration,
        COALESCE(rsp.is_trial, 
          CASE 
            WHEN r.subscription_plan_id = 'plan_trial' THEN TRUE
            ELSE FALSE
          END
        ) as is_trial,
        DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) as days_remaining,
        CASE 
          WHEN r.is_admin = 1 THEN 'active'
          WHEN r.subscription_expiry_date IS NULL THEN 'no_subscription'
          WHEN r.subscription_expiry_date < DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')) THEN 'expired'
          WHEN DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) <= 7 THEN 'expiring_soon'
          ELSE 'active'
        END as subscription_health
      FROM resellers r
      LEFT JOIN reseller_subscriptions rs ON r.id = rs.reseller_id AND rs.status = 'active'
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      WHERE r.id = ?
    ");
    
    $stmt->execute([$resellerId]);
    $subscription = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$subscription) {
      http_response_code(404);
      echo json_encode(['error' => 'Revenda não encontrado']);
      return;
    }
    
    // Buscar planos disponíveis (TODOS os planos ativos)
    $stmt = $pdo->prepare("
      SELECT 
        id, 
        name, 
        duration_days, 
        price, 
        description, 
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
    }
    unset($plan);
    
    // Se não houver planos, adicionar planos padrão (fallback)
    if (empty($plans)) {
      $plans = [
        [
          'id' => 'plan_trial',
          'name' => 'Trial 3 Dias',
          'description' => 'Período de teste gratuito de 3 dias',
          'price' => '0.00',
          'duration_days' => 3,
          'is_active' => true,
          'is_trial' => true
        ],
        [
          'id' => 'plan_monthly',
          'name' => 'Plano Mensal',
          'description' => 'Ideal para começar',
          'price' => '39.90',
          'duration_days' => 30,
          'is_active' => true,
          'is_trial' => false
        ],
        [
          'id' => 'plan_semester',
          'name' => 'Plano Semestral',
          'description' => 'Economia de 16%',
          'price' => '200.90',
          'duration_days' => 180,
          'is_active' => true,
          'is_trial' => false
        ],
        [
          'id' => 'plan_annual',
          'name' => 'Plano Anual',
          'description' => 'Melhor custo-benefício',
          'price' => '380.90',
          'duration_days' => 365,
          'is_active' => true,
          'is_trial' => false
        ]
      ];
    }
    
    // Buscar histórico de pagamentos
    $stmt = $pdo->prepare("
      SELECT 
        rph.id,
        rph.amount,
        rph.payment_method,
        rph.payment_date,
        rph.status,
        rph.transaction_id,
        rsp.name as plan_name,
        rsp.duration_days as plan_duration
      FROM reseller_payment_history rph
      JOIN reseller_subscription_plans rsp ON rph.plan_id = rsp.id
      WHERE rph.reseller_id = ?
      ORDER BY rph.created_at DESC
      LIMIT 20
    ");
    
    $stmt->execute([$resellerId]);
    $paymentHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
      'subscription' => $subscription,
      'plans' => $plans,
      'paymentHistory' => $paymentHistory
    ], JSON_NUMERIC_CHECK);
    
  } catch (Exception $e) {
    error_log("Erro ao buscar assinatura: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao buscar assinatura']);
  }
}

/**
 * POST - Criar novo plano (apenas admin)
 */
function handlePost($pdo, $resellerId) {
  try {
    // Verificar se é admin
    $stmt = $pdo->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$resellerId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result || !$result['is_admin']) {
      http_response_code(403);
      echo json_encode(['error' => 'Apenas administradores podem criar planos']);
      return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validações
    if (!isset($data['name']) || !isset($data['price']) || !isset($data['duration_days'])) {
      http_response_code(400);
      echo json_encode(['error' => 'Nome, preço e duração são obrigatórios']);
      return;
    }
    
    // Gerar ID único
    $planId = 'plan_' . time() . '_' . substr(md5(rand()), 0, 8);
    
    // Inserir plano
    $stmt = $pdo->prepare("
      INSERT INTO reseller_subscription_plans 
      (id, name, description, price, duration_days, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
      $planId,
      $data['name'],
      $data['description'] ?? null,
      $data['price'],
      $data['duration_days'],
      $data['is_active'] ?? true
    ]);
    
    echo json_encode([
      'success' => true,
      'plan_id' => $planId,
      'message' => 'Plano criado com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao criar plano: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao criar plano']);
  }
}

/**
 * PUT - Atualizar plano (apenas admin)
 */
function handlePut($pdo, $resellerId) {
  try {
    // Verificar se é admin
    $stmt = $pdo->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$resellerId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result || !$result['is_admin']) {
      http_response_code(403);
      echo json_encode(['error' => 'Apenas administradores podem atualizar planos']);
      return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    error_log("handlePut - Data recebida: " . json_encode($data));
    
    if (!isset($data['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID do plano é obrigatório']);
      return;
    }
    
    $updateFields = [];
    $params = [];
    
    // Campos que podem ser atualizados
    $allowedFields = ['name', 'description', 'price', 'duration_days', 'is_active'];
    
    foreach ($allowedFields as $field) {
      if (isset($data[$field])) {
        $updateFields[] = "$field = ?";
        // Converter boolean para int se for is_active
        if ($field === 'is_active') {
          $params[] = $data[$field] ? 1 : 0;
        } else {
          $params[] = $data[$field];
        }
      }
    }
    
    if (empty($updateFields)) {
      http_response_code(400);
      echo json_encode(['error' => 'Nenhum campo para atualizar']);
      return;
    }
    
    $updateFields[] = "updated_at = NOW()";
    $params[] = $data['id'];
    
    $sql = "UPDATE reseller_subscription_plans SET " . implode(', ', $updateFields) . " WHERE id = ?";
    error_log("SQL: $sql");
    error_log("Params: " . json_encode($params));
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    error_log("Linhas afetadas: " . $stmt->rowCount());
    
    echo json_encode([
      'success' => true,
      'message' => 'Plano atualizado com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao atualizar plano: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao atualizar plano']);
  }
}

/**
 * DELETE - Deletar plano (apenas admin)
 */
function handleDelete($pdo, $resellerId) {
  try {
    // Verificar se é admin
    $stmt = $pdo->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$resellerId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result || !$result['is_admin']) {
      http_response_code(403);
      echo json_encode(['error' => 'Apenas administradores podem deletar planos']);
      return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID do plano é obrigatório']);
      return;
    }
    
    // Verificar se há assinaturas ativas usando este plano
    $stmt = $pdo->prepare("
      SELECT COUNT(*) as count 
      FROM reseller_subscriptions 
      WHERE plan_id = ? AND status = 'active'
    ");
    $stmt->execute([$data['id']]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
      http_response_code(400);
      echo json_encode(['error' => 'Não é possível deletar plano com assinaturas ativas']);
      return;
    }
    
    // Deletar plano
    $stmt = $pdo->prepare("DELETE FROM reseller_subscription_plans WHERE id = ?");
    $stmt->execute([$data['id']]);
    
    echo json_encode([
      'success' => true,
      'message' => 'Plano deletado com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao deletar plano: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao deletar plano']);
  }
}
