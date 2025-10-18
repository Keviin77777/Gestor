<?php
/**
 * API Resource: Reseller Subscription Payment
 * Processa pagamentos de assinaturas via PIX
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';
require_once __DIR__ . '/../lib/pix-generator.php';

header('Content-Type: application/json');

// Verificar autenticação
$user = Auth::requireAuth();
$resellerId = $user['reseller_id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = getDbConnection();
  
  // Usar as variáveis globais do index.php
  global $path_parts;
  
  // Remover 'reseller-subscription-payment' das partes da URL
  $localPathParts = $path_parts;
  array_shift($localPathParts); // Remove 'reseller-subscription-payment'
  $localPathParts = array_values($localPathParts);
  
  error_log("RESELLER API - Local path parts: " . json_encode($localPathParts));
  
  // Verificar se é para limpar histórico
  $isClearHistory = isset($localPathParts[0]) && $localPathParts[0] === 'clear-history';
  error_log("RESELLER API - Is clear history: " . ($isClearHistory ? 'true' : 'false'));
  
  // Pegar ID do pagamento da URL se não for clear-history
  $paymentId = $isClearHistory ? null : ($localPathParts[0] ?? null);
  error_log("RESELLER API - Payment ID: " . ($paymentId ?? 'null'));
  
  switch ($method) {
    case 'POST':
      handlePost($pdo, $resellerId);
      break;
    
    case 'DELETE':
      if ($isClearHistory) {
        handleClearHistory($pdo, $resellerId);
      } else {
        handleDelete($pdo, $resellerId, $paymentId);
      }
      break;
      
    default:
      http_response_code(405);
      echo json_encode(['error' => 'Método não permitido']);
  }
  
} catch (Exception $e) {
  error_log("Erro em reseller-subscription-payment: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * POST - Criar pagamento PIX para assinatura
 */
function handlePost($pdo, $resellerId) {
  try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['plan_id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID do plano é obrigatório']);
      return;
    }
    
    $planId = $data['plan_id'];
    
    // Buscar informações do plano
    $stmt = $pdo->prepare("
      SELECT id, name, price, duration_days
      FROM reseller_subscription_plans
      WHERE id = ? AND is_active = TRUE
    ");
    
    $stmt->execute([$planId]);
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$plan) {
      http_response_code(404);
      echo json_encode(['error' => 'Plano não encontrado']);
      return;
    }
    
    // Buscar informações do revenda
    $stmt = $pdo->prepare("
      SELECT id, email, display_name
      FROM resellers
      WHERE id = ?
    ");
    
    $stmt->execute([$resellerId]);
    $reseller = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reseller) {
      http_response_code(404);
      echo json_encode(['error' => 'Revenda não encontrado']);
      return;
    }
    
    // Buscar o ADMIN (is_admin = 1)
    $stmt = $pdo->prepare("
      SELECT id FROM resellers WHERE is_admin = 1 LIMIT 1
    ");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
      http_response_code(500);
      echo json_encode(['error' => 'Admin não encontrado no sistema']);
      return;
    }
    
    $adminId = $admin['id'];
    
    // Buscar método de pagamento do ADMIN (Mercado Pago ou Asaas)
    $stmt = $pdo->prepare("
      SELECT 
        id, 
        method_type,
        mp_public_key, 
        mp_access_token,
        asaas_api_key,
        asaas_pix_key
      FROM payment_methods
      WHERE reseller_id = ? 
        AND method_type IN ('mercadopago', 'asaas')
        AND is_active = TRUE
        AND is_default = TRUE
      LIMIT 1
    ");
    
    $stmt->execute([$adminId]);
    $paymentMethod = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$paymentMethod) {
      http_response_code(400);
      echo json_encode(['error' => 'Nenhum método de pagamento configurado pelo administrador']);
      return;
    }
    
    // Gerar IDs do pagamento ANTES de chamar as funções
    $paymentId = 'pay_' . time() . '_' . substr(md5(rand()), 0, 8);
    $transactionId = 'TXN' . strtoupper(substr(md5($paymentId), 0, 16));
    $description = "Assinatura {$plan['name']} - {$reseller['display_name']}";
    
    error_log("=== GERANDO PIX ===");
    error_log("Método: " . $paymentMethod['method_type']);
    error_log("Plano: " . $plan['name'] . " - R$ " . $plan['price']);
    error_log("Revenda: " . $reseller['display_name']);
    error_log("Transaction ID: " . $transactionId);
    
    // Processar pagamento baseado no método configurado
    if ($paymentMethod['method_type'] === 'mercadopago') {
      error_log("Chamando generateMercadoPagoPix...");
      $pixData = generateMercadoPagoPix($paymentMethod, $plan, $reseller, $transactionId);
      error_log("Resultado generateMercadoPagoPix: " . ($pixData ? 'OK' : 'FALHOU'));
    } else if ($paymentMethod['method_type'] === 'asaas') {
      error_log("Chamando generateAsaasPix...");
      $pixData = generateAsaasPix($paymentMethod, $plan, $reseller, $transactionId);
      error_log("Resultado generateAsaasPix: " . ($pixData ? 'OK' : 'FALHOU'));
    } else {
      error_log("Método não suportado: " . $paymentMethod['method_type']);
      http_response_code(400);
      echo json_encode(['error' => 'Método de pagamento não suportado']);
      return;
    }
    
    if (!$pixData) {
      error_log("ERRO: pixData está vazio/null");
      http_response_code(500);
      echo json_encode(['error' => 'Erro ao gerar código PIX']);
      return;
    }
    
    error_log("PIX gerado com sucesso!");
    
    // Salvar pagamento no banco - expira em 15 minutos
    $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    $externalId = isset($pixData['external_id']) ? $pixData['external_id'] : null;
    
    // Verificar se a coluna external_id existe na tabela
    $stmt = $pdo->prepare("
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reseller_payment_history'
        AND COLUMN_NAME = 'external_id'
    ");
    $stmt->execute();
    $columnExists = $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
    
    if ($columnExists) {
      $stmt = $pdo->prepare("
        INSERT INTO reseller_payment_history 
        (id, reseller_id, plan_id, amount, payment_method, status, transaction_id, external_id, pix_code, qr_code, expires_at, notes)
        VALUES (?, ?, ?, ?, 'pix', 'pending', ?, ?, ?, ?, ?, ?)
      ");
      
      $stmt->execute([
        $paymentId,
        $resellerId,
        $planId,
        $plan['price'],
        $transactionId,
        $externalId,
        $pixData['payload'],
        $pixData['qrcode'],
        $expiresAt,
        $description
      ]);
    } else {
      $stmt = $pdo->prepare("
        INSERT INTO reseller_payment_history 
        (id, reseller_id, plan_id, amount, payment_method, status, transaction_id, pix_code, qr_code, expires_at, notes)
        VALUES (?, ?, ?, ?, 'pix', 'pending', ?, ?, ?, ?, ?)
      ");
      
      $stmt->execute([
        $paymentId,
        $resellerId,
        $planId,
        $plan['price'],
        $transactionId,
        $pixData['payload'],
        $pixData['qrcode'],
        $expiresAt,
        $description
      ]);
    }
    
    echo json_encode([
      'success' => true,
      'payment_id' => $paymentId,
      'transaction_id' => $transactionId,
      'pix_code' => $pixData['payload'],
      'qr_code' => $pixData['qrcode'],
      'amount' => $plan['price'],
      'plan_name' => $plan['name'],
      'expires_at' => $expiresAt
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao criar pagamento: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao processar pagamento']);
  }
}

/**
 * Gerar PIX via Mercado Pago
 */
function generateMercadoPagoPix($paymentMethod, $plan, $reseller, $transactionId) {
  try {
    error_log("=== MERCADO PAGO: Iniciando ===");
    
    $accessToken = $paymentMethod['mp_access_token'];
    
    if (empty($accessToken)) {
      error_log("ERRO: Access Token vazio!");
      return null;
    }
    
    error_log("Access Token: " . substr($accessToken, 0, 20) . "...");
    
    $paymentData = [
      'transaction_amount' => floatval($plan['price']),
      'description' => "Assinatura {$plan['name']} - {$reseller['display_name']}",
      'payment_method_id' => 'pix',
      'external_reference' => $transactionId,
      'payer' => [
        'email' => $reseller['email'],
        'first_name' => $reseller['display_name']
      ]
    ];
    
    error_log("Dados do pagamento: " . json_encode($paymentData));
    
    $ch = curl_init('https://api.mercadopago.com/v1/payments');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    
    // Desabilitar verificação SSL apenas em desenvolvimento
    if (getenv('APP_ENV') === 'development') {
      curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
      curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'Authorization: Bearer ' . $accessToken,
      'Content-Type: application/json',
      'X-Idempotency-Key: ' . uniqid('sub_', true)
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    
    error_log("Fazendo requisição para Mercado Pago...");
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
      $error = curl_error($ch);
      error_log("ERRO CURL: " . $error);
      curl_close($ch);
      return null;
    }
    
    curl_close($ch);
    
    error_log("HTTP Code: " . $httpCode);
    error_log("Resposta: " . substr($response, 0, 500));
    
    if ($httpCode !== 201) {
      error_log("ERRO: HTTP Code diferente de 201");
      error_log("Resposta completa: " . $response);
      return null;
    }
    
    $result = json_decode($response, true);
    
    if (!$result) {
      error_log("ERRO: Não foi possível decodificar JSON");
      return null;
    }
    
    if (!isset($result['point_of_interaction']['transaction_data'])) {
      error_log("ERRO: Estrutura da resposta inválida");
      error_log("Chaves disponíveis: " . implode(', ', array_keys($result)));
      return null;
    }
    
    $pixData = $result['point_of_interaction']['transaction_data'];
    
    error_log("PIX gerado com sucesso! ID: " . $result['id']);
    
    // Garantir que o QR Code tem o prefixo data:image
    $qrCodeBase64 = $pixData['qr_code_base64'];
    error_log("QR Code ANTES do prefixo (primeiros 50 chars): " . substr($qrCodeBase64, 0, 50));
    
    if (strpos($qrCodeBase64, 'data:image') !== 0) {
      error_log("Adicionando prefixo data:image/png;base64,");
      $qrCodeBase64 = 'data:image/png;base64,' . $qrCodeBase64;
    } else {
      error_log("QR Code já tem prefixo data:image");
    }
    
    error_log("QR Code DEPOIS do prefixo (primeiros 100 chars): " . substr($qrCodeBase64, 0, 100));
    
    return [
      'payload' => $pixData['qr_code'],
      'qrcode' => $qrCodeBase64,
      'external_id' => $result['id']
    ];
    
  } catch (Exception $e) {
    error_log("EXCEÇÃO ao gerar PIX Mercado Pago: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    return null;
  }
}

/**
 * Gerar PIX via Asaas
 */
function generateAsaasPix($paymentMethod, $plan, $reseller, $transactionId) {
  try {
    $apiKey = $paymentMethod['asaas_api_key'];
    
    $paymentData = [
      'customer' => [
        'name' => $reseller['display_name'],
        'email' => $reseller['email']
      ],
      'billingType' => 'PIX',
      'value' => floatval($plan['price']),
      'dueDate' => date('Y-m-d', strtotime('+1 day')),
      'description' => "Assinatura {$plan['name']} - {$reseller['display_name']}",
      'externalReference' => $transactionId
    ];
    
    $ch = curl_init('https://www.asaas.com/api/v3/payments');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    
    // Desabilitar verificação SSL apenas em desenvolvimento
    if (getenv('APP_ENV') === 'development') {
      curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
      curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'access_token: ' . $apiKey,
      'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 && $httpCode !== 201) {
      error_log("Erro Asaas: " . $response);
      return null;
    }
    
    $result = json_decode($response, true);
    
    if (!isset($result['id'])) {
      error_log("Resposta Asaas inválida: " . $response);
      return null;
    }
    
    // Buscar QR Code PIX
    $paymentId = $result['id'];
    $ch = curl_init("https://www.asaas.com/api/v3/payments/{$paymentId}/pixQrCode");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Desabilitar verificação SSL apenas em desenvolvimento
    if (getenv('APP_ENV') === 'development') {
      curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
      curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'access_token: ' . $apiKey
    ]);
    
    $qrResponse = curl_exec($ch);
    curl_close($ch);
    
    $qrData = json_decode($qrResponse, true);
    
    if (!isset($qrData['payload'])) {
      error_log("Erro ao buscar QR Code Asaas: " . $qrResponse);
      return null;
    }
    
    return [
      'payload' => $qrData['payload'],
      'qrcode' => $qrData['encodedImage'],
      'external_id' => $paymentId
    ];
    
  } catch (Exception $e) {
    error_log("Erro ao gerar PIX Asaas: " . $e->getMessage());
    return null;
  }
}


/**
 * DELETE - Deletar pagamento expirado
 */
function handleDelete($pdo, $resellerId, $paymentId) {
  try {
    // Verificar se o pagamento pertence ao revenda e está pendente
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
    
    // Só permite deletar se estiver pendente
    if ($payment['status'] !== 'pending') {
      http_response_code(400);
      echo json_encode(['error' => 'Apenas pagamentos pendentes podem ser deletados']);
      return;
    }
    
    // Deletar pagamento
    $stmt = $pdo->prepare("DELETE FROM reseller_payment_history WHERE id = ?");
    $stmt->execute([$paymentId]);
    
    echo json_encode([
      'success' => true,
      'message' => 'Pagamento expirado deletado com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao deletar pagamento: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao deletar pagamento']);
  }
}

/**
 * DELETE - Limpar todo histórico de pagamentos do revendedor
 */
function handleClearHistory($pdo, $resellerId) {
  try {
    // Deletar todos os pagamentos do revendedor
    $stmt = $pdo->prepare("DELETE FROM reseller_payment_history WHERE reseller_id = ?");
    $stmt->execute([$resellerId]);
    
    $deletedCount = $stmt->rowCount();
    
    echo json_encode([
      'success' => true,
      'message' => "Histórico limpo com sucesso! $deletedCount pagamento(s) removido(s).",
      'deleted_count' => $deletedCount
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao limpar histórico: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao limpar histórico']);
  }
}
