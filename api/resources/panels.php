<?php
/**
 * Panels Resource Handler
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
            // Get single panel
            $stmt = executeQuery(
                "SELECT * FROM panels WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            
            if ($panel = $stmt->fetch()) {
                Response::success(['panel' => $panel]);
            } else {
                Response::error('Painel não encontrado', 404);
            }
        } else {
            // Get all panels for this reseller
            error_log("DEBUG - Buscando painéis para reseller_id: $reseller_id");
            
            $stmt = executeQuery(
                "SELECT * FROM panels WHERE reseller_id = ? ORDER BY name",
                [$reseller_id]
            );
            
            $panels = [];
            while ($row = $stmt->fetch()) {
                $panels[] = $row;
            }
            
            error_log("DEBUG - Encontrados " . count($panels) . " painéis");
            Response::success(['panels' => $panels]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validar dados obrigatórios
        if (empty($data['name'])) {
            Response::error('Nome é obrigatório');
        }
        
        // Gerar UUID para o painel
        $panel_id = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        
        try {
            executeQuery(
                "INSERT INTO panels (id, reseller_id, name, monthly_cost, renewal_date, 
                                    sigma_connected, sigma_url, sigma_username, sigma_token, sigma_user_id, 
                                    sigma_default_package_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $panel_id,
                    $reseller_id,
                    $data['name'],
                    floatval($data['monthly_cost'] ?? 0),
                    $data['renewal_date'] ?? null,
                    isset($data['sigma_connected']) ? (bool)$data['sigma_connected'] : false,
                    $data['sigma_url'] ?? null,
                    $data['sigma_username'] ?? null,
                    $data['sigma_token'] ?? null,
                    $data['sigma_user_id'] ?? null,
                    $data['sigma_default_package_id'] ?? null
                ]
            );
            
            Response::success(['id' => $panel_id, 'message' => 'Painel criado com sucesso'], 201);
        } catch (Exception $e) {
            error_log('Error creating panel: ' . $e->getMessage());
            Response::error('Erro ao criar painel', 500);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            Response::error('ID do painel é obrigatório', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Build dynamic update query based on provided fields
            $updates = [];
            $params = [];
            
            if (isset($data['name'])) {
                $updates[] = "name = ?";
                $params[] = $data['name'];
            }
            if (isset($data['monthly_cost'])) {
                $updates[] = "monthly_cost = ?";
                $params[] = floatval($data['monthly_cost']);
            }
            if (isset($data['renewal_date'])) {
                $updates[] = "renewal_date = ?";
                $params[] = $data['renewal_date'];
            }
            if (isset($data['sigma_connected'])) {
                $updates[] = "sigma_connected = ?";
                $params[] = (bool)$data['sigma_connected'];
            }
            if (isset($data['sigma_url'])) {
                $updates[] = "sigma_url = ?";
                $params[] = $data['sigma_url'];
            }
            if (isset($data['sigma_username'])) {
                $updates[] = "sigma_username = ?";
                $params[] = $data['sigma_username'];
            }
            if (isset($data['sigma_token'])) {
                $updates[] = "sigma_token = ?";
                $params[] = $data['sigma_token'];
            }
            if (isset($data['sigma_user_id'])) {
                $updates[] = "sigma_user_id = ?";
                $params[] = $data['sigma_user_id'];
            }
            if (isset($data['sigma_default_package_id'])) {
                $updates[] = "sigma_default_package_id = ?";
                $params[] = $data['sigma_default_package_id'];
            }
            
            $updates[] = "updated_at = NOW()";
            $params[] = $id;
            $params[] = $reseller_id;
            
            $sql = "UPDATE panels SET " . implode(", ", $updates) . " WHERE id = ? AND reseller_id = ?";
            
            executeQuery($sql, $params);
            
            Response::success(['message' => 'Painel atualizado com sucesso']);
        } catch (Exception $e) {
            error_log('Error updating panel: ' . $e->getMessage());
            Response::error('Erro ao atualizar painel', 500);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            Response::error('ID do painel é obrigatório', 400);
        }
        
        try {
            executeQuery(
                "DELETE FROM panels WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            
            Response::success(['message' => 'Painel excluído com sucesso']);
        } catch (Exception $e) {
            error_log('Error deleting panel: ' . $e->getMessage());
            Response::error('Erro ao excluir painel', 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}
