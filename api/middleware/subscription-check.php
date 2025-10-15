<?php
/**
 * Middleware: Verificação de Assinatura
 * Bloqueia acesso se a assinatura estiver expirada
 */

if (!defined('APP_INIT')) {
    die('Direct access forbidden');
}

class SubscriptionMiddleware {
    /**
     * Verificar se o usuário tem assinatura ativa
     */
    public static function checkSubscription(array $user): array {
        if ($user['is_admin']) {
            // Admin sempre tem acesso
            return [
                'allowed' => true,
                'status' => 'active',
                'is_admin' => true
            ];
        }
        
        $pdo = getDbConnection();
        
        // Buscar informações da assinatura
        $stmt = $pdo->prepare("
            SELECT 
                r.id,
                r.subscription_plan_id,
                r.subscription_expiry_date,
                r.account_status,
                r.trial_used,
                p.name as plan_name,
                p.is_trial,
                DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) as days_remaining
            FROM resellers r
            LEFT JOIN reseller_subscription_plans p ON r.subscription_plan_id = p.id
            WHERE r.id = ?
        ");
        
        $stmt->execute([$user['reseller_id']]);
        $subscription = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$subscription) {
            return [
                'allowed' => false,
                'status' => 'not_found',
                'message' => 'Usuário não encontrado'
            ];
        }
        
        // Verificar se tem assinatura
        if (!$subscription['subscription_expiry_date']) {
            return [
                'allowed' => false,
                'status' => 'no_subscription',
                'message' => 'Nenhuma assinatura ativa',
                'redirect' => '/dashboard/subscription'
            ];
        }
        
        // Verificar se expirou
        $now = new DateTime();
        $expiryDate = new DateTime($subscription['subscription_expiry_date']);
        
        if ($now > $expiryDate) {
            // Atualizar status para expirado
            $pdo->prepare("UPDATE resellers SET account_status = 'expired' WHERE id = ?")
                ->execute([$user['reseller_id']]);
            
            return [
                'allowed' => false,
                'status' => 'expired',
                'message' => 'Sua assinatura expirou',
                'expired_at' => $subscription['subscription_expiry_date'],
                'plan_name' => $subscription['plan_name'],
                'was_trial' => (bool)$subscription['is_trial'],
                'redirect' => '/dashboard/subscription'
            ];
        }
        
        // Assinatura ativa
        return [
            'allowed' => true,
            'status' => $subscription['is_trial'] ? 'trial' : 'active',
            'plan_name' => $subscription['plan_name'],
            'days_remaining' => (int)$subscription['days_remaining'],
            'expiry_date' => $subscription['subscription_expiry_date'],
            'is_trial' => (bool)$subscription['is_trial']
        ];
    }
    
    /**
     * Bloquear acesso se expirado
     */
    public static function requireActiveSubscription(array $user): void {
        $check = self::checkSubscription($user);
        
        if (!$check['allowed']) {
            http_response_code(403);
            echo json_encode([
                'error' => 'subscription_expired',
                'message' => $check['message'] ?? 'Assinatura expirada',
                'redirect' => $check['redirect'] ?? '/dashboard/subscription',
                'details' => $check
            ]);
            exit;
        }
    }
}
