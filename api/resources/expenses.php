<?php
/**
 * Expenses Resource Handler (MySQL, scoped by reseller)
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// ID from path if present
$id = $path_parts[1] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = executeQuery(
                "SELECT * FROM expenses WHERE id = ? AND reseller_id = ?",
                [$id, $reseller_id]
            );
            $expense = $stmt->fetch();
            if (!$expense) {
                Response::error('Expense not found', 404);
            }
            // Normalize numeric
            if (isset($expense['value'])) $expense['value'] = floatval($expense['value']);
            Response::success(['expense' => $expense]);
        } else {
            $stmt = executeQuery(
                "SELECT * FROM expenses WHERE reseller_id = ? ORDER BY date DESC",
                [$reseller_id]
            );
            $expenses = [];
            while ($row = $stmt->fetch()) {
                if (isset($row['value'])) $row['value'] = floatval($row['value']);
                $expenses[] = $row;
            }
            Response::success(['expenses' => $expenses]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $new_id = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $description = Validator::sanitizeString($data['description'] ?? '');
        $type = $data['type'] ?? 'other';
        $date = $data['date'] ?? date('Y-m-d');
        $value = isset($data['value']) ? (float)$data['value'] : 0.0;
        $category = Validator::sanitizeString($data['category'] ?? '');

        try {
            executeQuery(
            "INSERT INTO expenses (id, reseller_id, date, value, type, category, description, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [$new_id, $reseller_id, $date, $value, $type, $category !== '' ? $category : null, $description]
        );

            Response::success(['expense' => [
                'id' => $new_id,
                'reseller_id' => $reseller_id,
                'date' => $date,
                'value' => $value,
                'type' => $type,
                'category' => $category !== '' ? $category : null,
                'description' => $description,
            ]], 'Expense created');
        } catch (Exception $e) {
            error_log('Create expense error: ' . $e->getMessage());
            Response::error('Failed to create expense', 500);
        }
        break;

    case 'PUT':
        if (!$id) { Response::error('Expense ID required', 400); }
        $data = json_decode(file_get_contents('php://input'), true);

        executeQuery(
            "UPDATE expenses SET date = ?, value = ?, type = ?, category = ?, description = ?, updated_at = NOW() 
             WHERE id = ? AND reseller_id = ?",
            [
                $data['date'] ?? date('Y-m-d'),
                isset($data['value']) ? (float)$data['value'] : 0.0,
                $data['type'] ?? 'other',
                $data['category'] ?? null,
                Validator::sanitizeString($data['description'] ?? ''),
                $id,
                $reseller_id
            ]
        );
        Response::success(['message' => 'Expense updated']);
        break;

    case 'DELETE':
        if (!$id) { Response::error('Expense ID required', 400); }
        executeQuery(
            "DELETE FROM expenses WHERE id = ? AND reseller_id = ?",
            [$id, $reseller_id]
        );
        Response::success(['message' => 'Expense deleted']);
        break;

    default:
        Response::error('Method not allowed', 405);
}
