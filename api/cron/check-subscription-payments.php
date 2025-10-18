<?php
/**
 * Cron Job: Verificar Pagamentos de Assinatura
 * Verifica pagamentos pendentes e atualiza status
 * Executar a cada 5 minutos
 */

require_once __DIR__ . '/../../database/config.php';

// Permitir execução via CLI ou com chave de API
if (php_sapi_name() !== 'cli') {
  $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
  $expectedKey = getenv('CRON_API_KEY') ?: 'your-secret-cron-key';
  
  if ($apiKey !== $expectedKey) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit;
  }
}

try {
  $pdo = getDBConnection();
  
  // Buscar pagamentos pendentes que expiraram
  $stmt = $pdo->prepare("
    SELECT id, reseller_id, expires_at
    FROM reseller_payment_history
    WHERE status = 'pending' AND expires_at < NOW()
  ");
  
  $stmt->execute();
  $expiredPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  $expiredCount = 0;
  
  foreach ($expiredPayments as $payment) {
    // Marcar como expirado
    $stmt = $pdo->prepare("
      UPDATE reseller_payment_history
      SET status = 'cancelled', notes = CONCAT(COALESCE(notes, ''), ' - Expirado automaticamente')
      WHERE id = ?
    ");
    
    $stmt->execute([$payment['id']]);
    $expiredCount++;
  }
  
  // Log de execução
  $logMessage = sprintf(
    "[%s] Verificação de pagamentos: %d pagamentos expirados\n",
    date('Y-m-d H:i:s'),
    $expiredCount
  );
  
  error_log($logMessage);
  
  echo json_encode([
    'success' => true,
    'expired_payments' => $expiredCount,
    'timestamp' => date('Y-m-d H:i:s')
  ]);
  
} catch (Exception $e) {
  error_log("Erro ao verificar pagamentos: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro ao processar verificação']);
}
