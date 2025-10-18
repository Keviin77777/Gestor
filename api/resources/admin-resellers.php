<?php
/**
 * API Resource: Admin - Gerenciar Revendas
 * Apenas administradores podem acessar
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

header('Content-Type: application/json');

// Verificar autenticação
$user = Auth::requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = getDbConnection();
  
  // Verificar se é admin
  if (!isAdmin($pdo, $user['reseller_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado. Apenas administradores.']);
    exit;
  }
  
  switch ($method) {
    case 'GET':
      handleGet($pdo);
      break;
      
    case 'POST':
      handlePost($pdo, $user['reseller_id']);
      break;
      
    case 'PUT':
      handlePut($pdo);
      break;
      
    case 'DELETE':
      handleDelete($pdo);
      break;
      
    default:
      http_response_code(405);
      echo json_encode(['error' => 'Método não permitido']);
  }
  
} catch (Exception $e) {
  error_log("Erro em admin-resellers: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Erro interno do servidor']);
}

/**
 * Verificar se usuário é admin
 */
function isAdmin($pdo, $resellerId) {
  try {
    $stmt = $pdo->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$resellerId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result && $result['is_admin'];
  } catch (Exception $e) {
    return false;
  }
}

/**
 * GET - Listar revendas
 */
function handleGet($pdo) {
  try {
    $stmt = $pdo->prepare("
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.phone,
        r.is_active,
        r.is_admin,
        r.subscription_expiry_date,
        r.subscription_plan_id,
        r.created_at,
        rsp.name as plan_name,
        rsp.price as plan_price,
        rsp.duration_days as plan_duration,
        DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) as days_remaining,
        CASE 
          WHEN r.subscription_expiry_date IS NULL THEN 'no_subscription'
          WHEN r.subscription_expiry_date < DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')) THEN 'expired'
          WHEN DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) <= 7 THEN 'expiring_soon'
          ELSE 'active'
        END as subscription_health,
        COUNT(c.id) as total_clients,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_clients
      FROM resellers r
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      LEFT JOIN clients c ON r.id = c.reseller_id
      GROUP BY r.id, r.email, r.display_name, r.phone, r.is_active, r.is_admin, 
               r.subscription_expiry_date, r.subscription_plan_id, r.created_at,
               rsp.name, rsp.price, rsp.duration_days
      ORDER BY r.created_at DESC
    ");
    
    $stmt->execute();
    $resellers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['resellers' => $resellers]);
    
  } catch (Exception $e) {
    error_log("Erro ao listar revendas: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao listar revendas']);
  }
}

/**
 * POST - Criar nova revenda
 */
function handlePost($pdo, $adminId) {
  try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validações
    if (!isset($data['email']) || !isset($data['password']) || !isset($data['display_name'])) {
      http_response_code(400);
      echo json_encode(['error' => 'Email, senha e nome são obrigatórios']);
      return;
    }
    
    // Verificar se email já existe
    $stmt = $pdo->prepare("SELECT id FROM resellers WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
      http_response_code(400);
      echo json_encode(['error' => 'Email já está em uso']);
      return;
    }
    
    // Gerar ID único
    $resellerId = 'reseller_' . time() . '_' . substr(md5(rand()), 0, 8);
    
    // Hash da senha
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    
    // Inserir revenda
    $stmt = $pdo->prepare("
      INSERT INTO resellers 
      (id, email, password_hash, display_name, phone, is_active, is_admin, subscription_expiry_date, subscription_plan_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
      $resellerId,
      $data['email'],
      $hashedPassword,
      $data['display_name'],
      $data['phone'] ?? null,
      isset($data['is_active']) ? (int)$data['is_active'] : 1,
      isset($data['is_admin']) ? (int)$data['is_admin'] : 0,
      $data['subscription_expiry_date'] ?? null,
      $data['subscription_plan_id'] ?? null
    ]);
    
    // Criar templates padrão para a revenda
    createDefaultTemplates($pdo, $resellerId);
    
    // Enviar WhatsApp de boas-vindas (se tiver telefone)
    if (!empty($data['phone'])) {
      sendWelcomeWhatsApp($pdo, $resellerId, $data['phone'], $data['display_name'], $data['email']);
    }
    
    echo json_encode([
      'success' => true,
      'reseller_id' => $resellerId,
      'message' => 'Revenda criada com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao criar revenda: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao criar revenda']);
  }
}

/**
 * PUT - Atualizar revenda
 */
function handlePut($pdo) {
  try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID da revenda é obrigatório']);
      return;
    }
    
    $updateFields = [];
    $params = [];
    
    // Campos que podem ser atualizados
    $allowedFields = ['email', 'display_name', 'phone', 'is_active', 'is_admin', 'subscription_expiry_date', 'subscription_plan_id'];
    
    foreach ($allowedFields as $field) {
      if (isset($data[$field])) {
        $updateFields[] = "$field = ?";
        $params[] = $data[$field];
      }
    }
    
    // Atualizar senha se fornecida
    if (!empty($data['password'])) {
      $updateFields[] = "password_hash = ?";
      $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    if (empty($updateFields)) {
      http_response_code(400);
      echo json_encode(['error' => 'Nenhum campo para atualizar']);
      return;
    }
    
    $updateFields[] = "updated_at = NOW()";
    $params[] = $data['id'];
    
    $sql = "UPDATE resellers SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
      'success' => true,
      'message' => 'Revenda atualizada com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao atualizar revenda: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao atualizar revenda']);
  }
}

/**
 * DELETE - Deletar revenda
 */
function handleDelete($pdo) {
  try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'ID da revenda é obrigatório']);
      return;
    }
    
    // Não permitir deletar admin
    $stmt = $pdo->prepare("SELECT is_admin FROM resellers WHERE id = ?");
    $stmt->execute([$data['id']]);
    $reseller = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($reseller && $reseller['is_admin']) {
      http_response_code(400);
      echo json_encode(['error' => 'Não é possível deletar administrador']);
      return;
    }
    
    // Deletar revenda (CASCADE vai deletar clientes, faturas, etc.)
    $stmt = $pdo->prepare("DELETE FROM resellers WHERE id = ?");
    $stmt->execute([$data['id']]);
    
    echo json_encode([
      'success' => true,
      'message' => 'Revenda deletada com sucesso'
    ]);
    
  } catch (Exception $e) {
    error_log("Erro ao deletar revenda: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao deletar revenda']);
  }
}

/**
 * Criar templates padrão para nova revenda
 */
function createDefaultTemplates($pdo, $resellerId) {
  try {
    $templates = [
      [
        'name' => 'Boas-vindas ao Cliente',
        'type' => 'welcome',
        'trigger_event' => 'user_created',
        'message' => "🎉 *Bem-vindo!*\n\nOlá {{cliente_nome}}! 👋\n\nSua conta foi criada com sucesso!\n\n📱 *Seus Dados de Acesso:*\n👤 Usuário: {{cliente_usuario}}\n🔑 Senha: {{senha}}\n📦 Plano: {{plano}}\n💰 Valor: R$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\nQualquer dúvida, estamos à disposição! 😊",
        'days_offset' => null,
      ],
      [
        'name' => 'Link de Pagamento',
        'type' => 'payment_link',
        'trigger_event' => 'invoice_generated',
        'message' => "💳 *Link de Pagamento*\n\nOlá {{cliente_nome}}!\n\nSua fatura está disponível:\n\n💰 Valor: R$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\n🔗 *Pagar agora:*\n{{link_pagamento}}\n\nPague com PIX, Cartão ou Boleto! 🚀",
        'days_offset' => null,
      ],
      [
        'name' => 'Lembrete 7 Dias Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *7 dias* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏",
        'days_offset' => 7,
      ],
      [
        'name' => 'Lembrete 3 Dias Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *3 dias* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏",
        'days_offset' => 3,
      ],
      [
        'name' => 'Lembrete 1 Dia Antes',
        'type' => 'reminder_before',
        'trigger_event' => 'scheduled',
        'message' => "⚠️ *Último Dia!*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence *amanhã* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRealize o pagamento hoje para evitar interrupções!\n\nNão perca o acesso! ⚡",
        'days_offset' => 1,
      ],
      [
        'name' => 'Lembrete Dia do Vencimento',
        'type' => 'reminder_due',
        'trigger_event' => 'scheduled',
        'message' => "📅 *Vencimento Hoje*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence *hoje* ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRealize o pagamento para manter seu acesso ativo.\n\nEvite interrupções no serviço! ⚡",
        'days_offset' => 0,
      ],
      [
        'name' => 'Lembrete 1 Dia Após Vencimento',
        'type' => 'reminder_after',
        'trigger_event' => 'scheduled',
        'message' => "⚠️ *Assinatura Vencida*\n\nOlá {{cliente_nome}},\n\nSua assinatura venceu ontem ({{data_vencimento}}).\n\n💰 Valor: R$ {{valor}}\n\nRegularize seu pagamento para reativar seu acesso.\n\nEstamos aguardando! 🙏",
        'days_offset' => -1,
      ],
      [
        'name' => 'Lembrete 3 Dias Após Vencimento',
        'type' => 'reminder_after',
        'trigger_event' => 'scheduled',
        'message' => "🔴 *Assinatura Vencida há 3 dias*\n\nOlá {{cliente_nome}},\n\nSua assinatura venceu em {{data_vencimento}}.\n\n💰 Valor: R$ {{valor}}\n\nRegularize seu pagamento urgentemente para reativar seu acesso.\n\nNão perca seus dados! ⚠️",
        'days_offset' => -3,
      ],
    ];
    
    foreach ($templates as $template) {
      $templateId = 'tpl_' . time() . '_' . substr(md5(rand()), 0, 8);
      
      $stmt = $pdo->prepare("
        INSERT INTO whatsapp_templates 
        (id, reseller_id, name, type, trigger_event, message, is_active, days_offset, send_hour, send_minute, use_global_schedule)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, 9, 0, TRUE)
      ");
      
      $stmt->execute([
        $templateId,
        $resellerId,
        $template['name'],
        $template['type'],
        $template['trigger_event'],
        $template['message'],
        $template['days_offset']
      ]);
      
      // Pequeno delay para garantir IDs únicos
      usleep(1000);
    }
    
    error_log("Templates padrão criados para revenda: {$resellerId}");
  } catch (Exception $e) {
    error_log("Erro ao criar templates padrão: " . $e->getMessage());
    // Não falhar a criação da revenda se os templates falharem
  }
}

/**
 * Enviar WhatsApp de boas-vindas
 */
function sendWelcomeWhatsApp($pdo, $resellerId, $phone, $name, $email) {
  try {
    // Buscar template de boas-vindas
    $stmt = $pdo->prepare("
      SELECT message FROM reseller_whatsapp_templates
      WHERE trigger_type = 'welcome' AND is_active = TRUE
      LIMIT 1
    ");
    $stmt->execute();
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$template) return;
    
    // Substituir variáveis
    $message = str_replace([
      '{{revenda_nome}}',
      '{{revenda_email}}',
      '{{data_vencimento}}'
    ], [
      $name,
      $email,
      'Não definido'
    ], $template['message']);
    
    // Salvar log
    $logId = 'rwlog_' . time() . '_' . substr(md5(rand()), 0, 8);
    $stmt = $pdo->prepare("
      INSERT INTO reseller_whatsapp_logs
      (id, reseller_id, phone, message, trigger_type, status)
      VALUES (?, ?, ?, ?, 'welcome', 'pending')
    ");
    $stmt->execute([$logId, $resellerId, $phone, $message]);
    
    // Aqui você pode integrar com sua API de WhatsApp
    // Por enquanto, apenas marca como enviado
    $stmt = $pdo->prepare("
      UPDATE reseller_whatsapp_logs
      SET status = 'sent', sent_at = NOW()
      WHERE id = ?
    ");
    $stmt->execute([$logId]);
    
  } catch (Exception $e) {
    error_log("Erro ao enviar WhatsApp de boas-vindas: " . $e->getMessage());
  }
}
