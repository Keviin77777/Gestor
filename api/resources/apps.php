<?php
/**
 * Apps Resource Handler (MySQL, scoped by reseller)
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get ID from path if present
$id = $path_parts[1] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = executeQuery(
                "SELECT * FROM apps WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            $app = $stmt->fetch();
            if ($app) {
                // Back-compat: expose description field mirroring notes
                if (!isset($app['description'])) {
                    $app['description'] = $app['notes'] ?? null;
                }
                Response::success(['app' => $app]);
            } else {
                Response::error('App não encontrado', 404);
            }
        } else {
            $stmt = executeQuery(
                "SELECT * FROM apps WHERE reseller_id = ? ORDER BY name",
                [$reseller_id]
            );
            $apps = [];
            while ($row = $stmt->fetch()) {
                if (!isset($row['description'])) {
                    $row['description'] = $row['notes'] ?? null;
                }
                $apps[] = $row;
            }
            Response::success(['apps' => $apps]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $name = Validator::sanitizeString($data['name'] ?? '');
        $notes = Validator::sanitizeString($data['description'] ?? ($data['notes'] ?? ''));
        if (!$name) {
            Response::error('Nome é obrigatório');
        }

        executeQuery(
            "INSERT INTO apps (id, reseller_id, name, notes, is_active, created_at) 
             VALUES (?, ?, ?, ?, 1, NOW())",
            [$id, $reseller_id, $name, $notes]
        );

        Response::success(['app' => [
            'id' => $id,
            'reseller_id' => $reseller_id,
            'name' => $name,
            'notes' => $notes,
            'description' => $notes,
            'is_active' => true,
        ]], 'App criado com sucesso');
        break;

    case 'PUT':
        if (!$id) { Response::error('ID do app é obrigatório', 400); }
        $data = json_decode(file_get_contents('php://input'), true);
        $name = Validator::sanitizeString($data['name'] ?? '');
        $notes = Validator::sanitizeString($data['description'] ?? ($data['notes'] ?? ''));

        executeQuery(
            "UPDATE apps SET name = ?, notes = ?, updated_at = NOW() WHERE id = ? AND reseller_id = ?",
            [$name, $notes, $id, $reseller_id]
        );
        Response::success(['message' => 'App atualizado com sucesso']);
        break;

    case 'DELETE':
        if (!$id) { Response::error('ID do app é obrigatório', 400); }
        executeQuery(
            "DELETE FROM apps WHERE id = ? AND reseller_id = ?",
            [$id, $reseller_id]
        );
        Response::success(['message' => 'App excluído com sucesso']);
        break;

    default:
        Response::error('Method not allowed', 405);
}
