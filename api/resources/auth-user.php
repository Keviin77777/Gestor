<?php
/**
 * API Resource: Auth User
 * Retorna informações do usuário autenticado
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');

// Verificar autenticação
$user = Auth::requireAuth();

try {
  $pdo = getDbConnection();
  
  // Buscar informações completas do usuário
  $stmt = $pdo->prepare("
    SELECT 
      id,
      email,
      display_name,
      is_admin,
      is_active,
      subscription_expiry_date
    FROM resellers 
    WHERE id = ?
  ");
  
  $stmt->execute([$user['reseller_id']]);
  $userData = $stmt->fetch(PDO::FETCH_ASSOC);
  
  if (!$userData) {
    http_response_code(404);
    echo json_encode(['error' => 'Usuário não encontrado']);
    exit;
  }
  
  echo json_encode([
    'user' => [
      'reseller_id' => $userData['id'],
      'email' => $userData['email'],
      'display_name' => $userData['display_name'],
      'is_admin' => (bool)$userData['is_admin'],
      'is_active' => (bool)$userData['is_active'],
      'subscription_expiry_date' => $userData['subscription_expiry_date']
    ]
  ]);
  
} catch (Exception $e) {
  error_log("Erro ao buscar usuário: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}
