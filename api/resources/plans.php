<?php
/**
 * Plans Resource Handler
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Require authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get ID from path if present
$id = $path_parts[1] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            // Get single plan
            $stmt = executeQuery(
                "SELECT * FROM plans WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            
            if ($plan = $stmt->fetch()) {
                // Converter tipos numéricos
                $plan['value'] = floatval($plan['value']);
                $plan['duration_days'] = intval($plan['duration_days']);
                $plan['is_active'] = boolval($plan['is_active']);
                Response::success(['plan' => $plan]);
            } else {
                Response::error('Plano não encontrado', 404);
            }
        } else {
            // Get all plans for this reseller
            error_log("DEBUG - Buscando planos para reseller_id: $reseller_id");
            
            $stmt = executeQuery(
                "SELECT * FROM plans WHERE reseller_id = ? ORDER BY name",
                [$reseller_id]
            );
            
            $plans = [];
            while ($row = $stmt->fetch()) {
                // Converter tipos numéricos
                $row['value'] = floatval($row['value']);
                $row['duration_days'] = intval($row['duration_days']);
                $row['is_active'] = boolval($row['is_active']);
                $plans[] = $row;
            }
            
            error_log("DEBUG - Encontrados " . count($plans) . " planos");
            Response::success(['plans' => $plans]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validar dados obrigatórios
        if (empty($data['name'])) {
            Response::error('Nome é obrigatório');
        }
        
        // Gerar UUID para o plano
        $plan_id = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        
        try {
            executeQuery(
                "INSERT INTO plans (id, reseller_id, panel_id, name, value, duration_days, is_active, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $plan_id,
                    $reseller_id,
                    $data['panel_id'] ?? null,
                    $data['name'],
                    floatval($data['value'] ?? 0),
                    intval($data['duration_days'] ?? 30),
                    1 // is_active = true
                ]
            );
            
            Response::success(['id' => $plan_id, 'message' => 'Plano criado com sucesso'], 201);
        } catch (Exception $e) {
            error_log('Error creating plan: ' . $e->getMessage());
            Response::error('Erro ao criar plano', 500);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('ID do plano é obrigatório', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            executeQuery(
                "UPDATE plans SET name = ?, value = ?, duration_days = ?, panel_id = ?, is_active = ?, updated_at = NOW() 
                 WHERE id = ? AND reseller_id = ?",
                [
                    $data['name'],
                    floatval($data['value'] ?? 0),
                    intval($data['duration_days'] ?? 30),
                    $data['panel_id'] ?? null,
                    1, // is_active
                    $id,
                    $reseller_id
                ]
            );
            
            Response::success(['message' => 'Plano atualizado com sucesso']);
        } catch (Exception $e) {
            error_log('Error updating plan: ' . $e->getMessage());
            Response::error('Erro ao atualizar plano', 500);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            Response::error('ID do plano é obrigatório', 400);
        }
        
        try {
            executeQuery(
                "DELETE FROM plans WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            
            Response::success(['message' => 'Plano excluído com sucesso']);
        } catch (Exception $e) {
            error_log('Error deleting plan: ' . $e->getMessage());
            Response::error('Erro ao excluir plano', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
