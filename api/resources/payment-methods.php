<?php
/**
 * Payment Methods API
 * Gerencia métodos de pagamento (Mercado Pago, Asaas, PIX Manual)
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get global variables from index.php
global $method, $path_parts;

$conn = getDbConnection();

// Remove 'payment-methods' from path_parts
array_shift($path_parts);
$path_parts = array_values($path_parts);

// GET /payment-methods - Listar todos os métodos
if ($method === 'GET' && count($path_parts) === 0) {
    try {
        $stmt = $conn->prepare("
            SELECT 
                id,
                method_type,
                is_active,
                is_default,
                -- Mercado Pago (mascarar tokens)
                CASE WHEN mp_public_key IS NOT NULL 
                    THEN CONCAT(LEFT(mp_public_key, 10), '...') 
                    ELSE NULL END as mp_public_key_masked,
                CASE WHEN mp_access_token IS NOT NULL 
                    THEN '***configured***' 
                    ELSE NULL END as mp_access_token_masked,
                -- Asaas (mascarar chaves)
                CASE WHEN asaas_api_key IS NOT NULL 
                    THEN '***configured***' 
                    ELSE NULL END as asaas_api_key_masked,
                asaas_pix_key,
                asaas_webhook_url,
                -- PIX Manual
                pix_key,
                pix_key_type,
                pix_holder_name,
                created_at,
                updated_at
            FROM payment_methods
            WHERE reseller_id = ?
            ORDER BY is_default DESC, is_active DESC, created_at DESC
        ");
        $stmt->execute([$reseller_id]);
        $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::json($methods);
    } catch (Exception $e) {
        Response::error('Failed to fetch payment methods: ' . $e->getMessage(), 500);
    }
}

// GET /payment-methods/:id - Buscar método específico
if ($method === 'GET' && count($path_parts) === 1) {
    $id = $path_parts[0];
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                id,
                method_type,
                is_active,
                is_default,
                mp_public_key,
                mp_access_token,
                asaas_api_key,
                asaas_pix_key,
                asaas_webhook_url,
                pix_key,
                pix_key_type,
                pix_holder_name,
                created_at,
                updated_at
            FROM payment_methods
            WHERE id = ? AND reseller_id = ?
        ");
        $stmt->execute([$id, $reseller_id]);
        $method_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$method_data) {
            Response::error('Payment method not found', 404);
        }
        
        Response::json($method_data);
    } catch (Exception $e) {
        Response::error('Failed to fetch payment method: ' . $e->getMessage(), 500);
    }
}

// POST /payment-methods - Criar novo método
if ($method === 'POST' && count($path_parts) === 0) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['method_type'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            Response::error("Missing required field: $field", 400);
        }
    }
    
    $valid_types = ['mercadopago', 'asaas'];
    if (!in_array($data['method_type'], $valid_types)) {
        Response::error('Invalid method_type. Use: mercadopago or asaas', 400);
    }
    
    try {
        $conn->beginTransaction();
        
        $id = bin2hex(random_bytes(16));
        $is_active = isset($data['is_active']) ? (bool)$data['is_active'] : false;
        $is_default = isset($data['is_default']) ? (bool)$data['is_default'] : false;
        
        // Se for padrão, desativar outros padrões do mesmo tipo
        if ($is_default) {
            $stmt = $conn->prepare("
                UPDATE payment_methods 
                SET is_default = FALSE 
                WHERE reseller_id = ? AND method_type = ?
            ");
            $stmt->execute([$reseller_id, $data['method_type']]);
        }
        
        // Inserir novo método
        $stmt = $conn->prepare("
            INSERT INTO payment_methods (
                id, reseller_id, method_type, is_active, is_default,
                mp_public_key, mp_access_token,
                asaas_api_key, asaas_pix_key, asaas_webhook_url,
                pix_key, pix_key_type, pix_holder_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $id,
            $reseller_id,
            $data['method_type'],
            $is_active ? 1 : 0,
            $is_default ? 1 : 0,
            $data['mp_public_key'] ?? null,
            $data['mp_access_token'] ?? null,
            $data['asaas_api_key'] ?? null,
            $data['asaas_pix_key'] ?? null,
            $data['asaas_webhook_url'] ?? null,
            $data['pix_key'] ?? null,
            $data['pix_key_type'] ?? null,
            $data['pix_holder_name'] ?? null
        ]);
        
        $conn->commit();
        
        Response::json([
            'success' => true,
            'id' => $id,
            'message' => 'Payment method created successfully'
        ], 201);
    } catch (Exception $e) {
        $conn->rollback();
        Response::error('Failed to create payment method: ' . $e->getMessage(), 500);
    }
}

// PUT /payment-methods/:id - Atualizar método
if ($method === 'PUT' && count($path_parts) === 1) {
    $id = $path_parts[0];
    $data = json_decode(file_get_contents('php://input'), true);
    
    error_log("Payment Method Update - ID: " . $id);
    error_log("Payment Method Update - Data: " . json_encode($data));
    
    try {
        $conn->beginTransaction();
        
        // Verificar se método existe
        $stmt = $conn->prepare("SELECT id FROM payment_methods WHERE id = ? AND reseller_id = ?");
        $stmt->execute([$id, $reseller_id]);
        if (!$stmt->fetch()) {
            error_log("Payment Method Update - Method not found");
            Response::error('Payment method not found', 404);
        }
        
        // Se for padrão, desativar outros padrões do mesmo tipo
        if (isset($data['is_default']) && $data['is_default']) {
            $stmt = $conn->prepare("
                SELECT method_type FROM payment_methods WHERE id = ? AND reseller_id = ?
            ");
            $stmt->execute([$id, $reseller_id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $stmt = $conn->prepare("
                UPDATE payment_methods 
                SET is_default = FALSE 
                WHERE reseller_id = ? AND method_type = ? AND id != ?
            ");
            $stmt->execute([$reseller_id, $current['method_type'], $id]);
        }
        
        // Construir query de atualização dinamicamente
        $updates = [];
        $params = [];
        
        $allowed_fields = [
            'is_active', 'is_default',
            'mp_public_key', 'mp_access_token',
            'asaas_api_key', 'asaas_pix_key', 'asaas_webhook_url',
            'pix_key', 'pix_key_type', 'pix_holder_name'
        ];
        
        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                // Convert boolean fields to 0 or 1
                if ($field === 'is_active' || $field === 'is_default') {
                    $params[] = $data[$field] ? 1 : 0;
                } else {
                    $params[] = $data[$field];
                }
            }
        }
        
        if (empty($updates)) {
            Response::error('No fields to update', 400);
        }
        
        $params[] = $id;
        $params[] = $reseller_id;
        
        $sql = "UPDATE payment_methods SET " . implode(', ', $updates) . " WHERE id = ? AND reseller_id = ?";
        error_log("Payment Method Update - SQL: " . $sql);
        error_log("Payment Method Update - Params: " . json_encode($params));
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        error_log("Payment Method Update - Rows affected: " . $stmt->rowCount());
        
        $conn->commit();
        
        Response::json([
            'success' => true,
            'message' => 'Payment method updated successfully'
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        Response::error('Failed to update payment method: ' . $e->getMessage(), 500);
    }
}

// DELETE /payment-methods/:id - Deletar método
if ($method === 'DELETE' && count($path_parts) === 1) {
    $id = $path_parts[0];
    
    try {
        $stmt = $conn->prepare("DELETE FROM payment_methods WHERE id = ? AND reseller_id = ?");
        $stmt->execute([$id, $reseller_id]);
        
        if ($stmt->rowCount() === 0) {
            Response::error('Payment method not found', 404);
        }
        
        Response::json([
            'success' => true,
            'message' => 'Payment method deleted successfully'
        ]);
    } catch (Exception $e) {
        Response::error('Failed to delete payment method: ' . $e->getMessage(), 500);
    }
}

Response::error('Invalid endpoint', 404);

Response::error('Invalid endpoint', 404);
