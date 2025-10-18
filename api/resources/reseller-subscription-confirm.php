<?php
/**
 * API Resource: Confirmar Pagamento de Assinatura
 * Permite confirmar pagamento manualmente (admin)
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
    case 'POST':
      handlePost($pdo, $resellerId);
      break;
      
    default:
      http_response_code(405);
      echo json_encode(['error' => 'Método não permitido']);
  }
  
} catch (Exception $e) {
  error_log("Erro em reseller-subscription-confirm: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * POST - Confirmar pagamento de assinatura
 */
function handlePost($pdo, $resellerId) {
  try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['payment_id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID do pagamento é obrigatório']);
      return;
    }
    
    $paymentId = $data['payment_id'];
    
    // Verificar se o pagamento existe e pertence ao revenda
    $stmt = $pdo->prepare("
      SELECT id, status
      FROM reseller_payment_history
      WHERE id = ? AND reseller_id = ?
    ");
    
    $stmt->execute([$paymentId, $resellerId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
      http_response_code(404);
      echo json_encode(['error' => 'Pagamento não encontrado']);
      return;
    }
    
    if ($payment['status'] !== 'pending') {
      http_response_code(400);
      echo json_encode(['error' => 'Pagamento já foi processado']);
      return;
    }
    
    // Ativar assinatura usando stored procedure
    $stmt = $pdo->prepare("CALL sp_activate_reseller_subscription(?, ?)");
    $stmt->execute([$paymentId, $resellerId]);
    
    echo json_encode([
      'success' => true,
      'message' => 'Assinatura ativada com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao confirmar pagamento: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao processar confirmação']);
  }
}
