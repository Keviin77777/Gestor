<?php
/**
 * Reports API Resource
 * Handles all report-related operations with advanced analytics
 */

require_once __DIR__ . '/../security.php';
require_once __DIR__ . '/../../database/config.php';

// Verify authentication
$user = Auth::requireAuth();
$reseller_id = $user['reseller_id'];

// Get method and action
global $method, $path_parts;

// Debug log
error_log('Reports API called - Method: ' . $method . ', Path parts: ' . print_r($path_parts, true));

$action = $path_parts[1] ?? '';

// Get database connection
try {
    $db = getDbConnection();
} catch (Exception $e) {
    error_log('Database connection error: ' . $e->getMessage());
    Response::error('Database connection failed', 500);
    exit;
}

try {
    if ($method === 'GET') {
        handleGet($db, $reseller_id, $action);
    } else {
        Response::error('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log('Reports API Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Response::error($e->getMessage(), 500);
}

// Se chegou aqui sem retornar nada, retorne erro
error_log('Reports API: No response was sent');
Response::error('No response generated', 500);

/**
 * Handle GET requests
 */
function handleGet($db, $reseller_id, $action) {
    
    // Parse query parameters
    $start_date = $_GET['start_date'] ?? date('Y-m-01');
    $end_date = $_GET['end_date'] ?? date('Y-m-t');
    
    // Handle empty action (default to overview)
    if (empty($action)) {
        $action = 'overview';
    }
    
    switch ($action) {
        case 'overview':
            getOverviewReport($db, $reseller_id, $start_date, $end_date);
            break;
        case 'clients':
            getClientsReport($db, $reseller_id, $start_date, $end_date);
            break;
        case 'financial':
            getFinancialReport($db, $reseller_id, $start_date, $end_date);
            break;
        case 'defaulters':
            getDefaultersReport($db, $reseller_id);
            break;
        case 'plans':
            getPlansReport($db, $reseller_id, $start_date, $end_date);
            break;
        case 'expenses':
            getExpensesReport($db, $reseller_id, $start_date, $end_date);
            break;
        case 'comparative':
            getComparativeReport($db, $reseller_id, $start_date, $end_date);
            break;
        default:
            Response::error("Invalid report type: $action", 400);
    }
}

/**
 * Visão Geral - Overview Report
 */
function getOverviewReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Total revenue from active clients (potential monthly revenue)
        $stmt = $db->prepare("
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
                COALESCE(SUM(CASE WHEN status = 'active' THEN value ELSE 0 END), 0) as monthly_revenue,
                COALESCE(AVG(CASE WHEN status = 'active' THEN value ELSE NULL END), 0) as average_ticket
            FROM clients 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Actual revenue from paid invoices in the period
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(value), 0) as actual_revenue
            FROM invoices 
            WHERE reseller_id = ? 
            AND status = 'paid'
            AND payment_date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $actual_revenue_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Total expenses
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(value), 0) as total_expenses
            FROM expenses 
            WHERE reseller_id = ? 
            AND date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $expenses_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Panel costs
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(monthly_cost), 0) as panel_costs
            FROM panels 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $panel_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // New clients in period
        $stmt = $db->prepare("
            SELECT COUNT(*) as new_clients
            FROM clients 
            WHERE reseller_id = ? 
            AND start_date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $new_clients_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate metrics
        $monthly_revenue = floatval($result['monthly_revenue'] ?? 0);
        $actual_revenue = floatval($actual_revenue_data['actual_revenue'] ?? 0);
        
        // Use actual revenue if available, otherwise use potential monthly revenue
        $revenue_to_use = $actual_revenue > 0 ? $actual_revenue : $monthly_revenue;
        
        $total_expenses = floatval($expenses_data['total_expenses'] ?? 0);
        $panel_costs = floatval($panel_data['panel_costs'] ?? 0);
        $total_costs = $total_expenses + $panel_costs;
        $net_profit = $revenue_to_use - $total_costs;
        $profit_margin = $revenue_to_use > 0 ? ($net_profit / $revenue_to_use) * 100 : 0;
        
        Response::json([
            'success' => true,
            'data' => [
                'active_clients' => intval($result['active_clients'] ?? 0),
                'inactive_clients' => intval($result['inactive_clients'] ?? 0),
                'new_clients' => intval($new_clients_data['new_clients'] ?? 0),
                'monthly_revenue' => $revenue_to_use, // Use actual or potential revenue
                'potential_revenue' => $monthly_revenue, // Potential monthly revenue
                'actual_revenue' => $actual_revenue, // Actual revenue from paid invoices
                'total_expenses' => $total_expenses,
                'panel_costs' => $panel_costs,
                'total_costs' => $total_costs,
                'net_profit' => $net_profit,
                'profit_margin' => round($profit_margin, 2),
                'average_ticket' => floatval($result['average_ticket'] ?? 0),
                'period' => [
                    'start' => $start_date,
                    'end' => $end_date
                ]
            ]
        ]);
    } catch (Exception $e) {
        error_log('Overview Report Error: ' . $e->getMessage());
        Response::error('Error generating overview report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório de Clientes
 */
function getClientsReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Clients by status
        $stmt = $db->prepare("
            SELECT 
                status,
                COUNT(*) as count,
                COALESCE(SUM(value), 0) as total_value
            FROM clients 
            WHERE reseller_id = ?
            GROUP BY status
        ");
        $stmt->execute([$reseller_id]);
        $by_status = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // New clients trend (last 6 months)
        $stmt = $db->prepare("
            SELECT 
                DATE_FORMAT(start_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM clients 
            WHERE reseller_id = ? 
            AND start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(start_date, '%Y-%m')
            ORDER BY month ASC
        ");
        $stmt->execute([$reseller_id]);
        $new_clients_trend = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Churn analysis
        $stmt = $db->prepare("
            SELECT COUNT(*) as churned_clients
            FROM clients 
            WHERE reseller_id = ? 
            AND status = 'inactive'
            AND updated_at BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $churn_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Top clients by value
        $stmt = $db->prepare("
            SELECT id, name, value, status, start_date, renewal_date
            FROM clients 
            WHERE reseller_id = ? 
            AND status = 'active'
            ORDER BY value DESC
            LIMIT 10
        ");
        $stmt->execute([$reseller_id]);
        $top_clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::json([
            'success' => true,
            'data' => [
                'by_status' => $by_status,
                'new_clients_trend' => $new_clients_trend,
                'churned_clients' => intval($churn_data['churned_clients'] ?? 0),
                'top_clients' => $top_clients
            ]
        ]);
    } catch (Exception $e) {
        error_log('Clients Report Error: ' . $e->getMessage());
        Response::error('Error generating clients report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório Financeiro Avançado
 */
function getFinancialReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Revenue trend (last 12 months) - based on actual revenue
        $revenue_trend = [];
        $expenses_trend = [];
        
        for ($i = 11; $i >= 0; $i--) {
            $month = date('Y-m', strtotime("-$i months"));
            $month_start = date('Y-m-01', strtotime("-$i months"));
            $month_end = date('Y-m-t', strtotime("-$i months"));
            
            // Revenue from paid invoices in this month
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(value), 0) as revenue
                FROM invoices 
                WHERE reseller_id = ? 
                AND status = 'paid'
                AND payment_date BETWEEN ? AND ?
            ");
            $stmt->execute([$reseller_id, $month_start, $month_end]);
            $rev_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // If no paid invoices, use potential revenue from active clients
            $revenue = floatval($rev_data['revenue'] ?? 0);
            if ($revenue == 0) {
                $stmt = $db->prepare("
                    SELECT COALESCE(SUM(value), 0) as potential_revenue
                    FROM clients 
                    WHERE reseller_id = ? 
                    AND status = 'active'
                ");
                $stmt->execute([$reseller_id]);
                $potential_data = $stmt->fetch(PDO::FETCH_ASSOC);
                $revenue = floatval($potential_data['potential_revenue'] ?? 0);
            }
            
            // Expenses for this month
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(value), 0) as expenses
                FROM expenses 
                WHERE reseller_id = ? 
                AND date BETWEEN ? AND ?
            ");
            $stmt->execute([$reseller_id, $month_start, $month_end]);
            $exp_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Panel costs (monthly)
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(monthly_cost), 0) as panel_costs
                FROM panels 
                WHERE reseller_id = ?
            ");
            $stmt->execute([$reseller_id]);
            $panel_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $total_expenses = floatval($exp_data['expenses'] ?? 0) + floatval($panel_data['panel_costs'] ?? 0);
            
            $revenue_trend[] = [
                'month' => $month,
                'revenue' => $revenue
            ];
            
            $expenses_trend[] = [
                'month' => $month,
                'expenses' => $total_expenses
            ];
        }
        
        // Calculate current metrics
        $current_revenue = floatval($revenue_trend[11]['revenue'] ?? 0); // Last month
        $current_expenses = floatval($expenses_trend[11]['expenses'] ?? 0); // Last month
        
        // Get current client data
        $stmt = $db->prepare("
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COALESCE(AVG(CASE WHEN status = 'active' THEN value ELSE NULL END), 0) as avg_value
            FROM clients 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $client_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get new clients in the last 3 months
        $stmt = $db->prepare("
            SELECT COUNT(*) as new_clients
            FROM clients 
            WHERE reseller_id = ? 
            AND start_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        ");
        $stmt->execute([$reseller_id]);
        $new_clients_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $active_clients = intval($client_data['active_clients'] ?? 0);
        $avg_client_value = floatval($client_data['avg_value'] ?? 0);
        $new_clients = intval($new_clients_data['new_clients'] ?? 0);
        
        // Calculate KPIs
        // ROI = (Revenue - Investment) / Investment * 100
        $roi = $current_expenses > 0 ? (($current_revenue - $current_expenses) / $current_expenses) * 100 : 0;
        
        // CAC = Marketing/Acquisition Costs / New Customers
        // Using total expenses as proxy for acquisition costs
        $cac = $new_clients > 0 ? $current_expenses / $new_clients : 0;
        
        // LTV = Average Revenue Per User * Average Customer Lifespan (estimated 12 months)
        $ltv = $avg_client_value * 12;
        
        // LTV/CAC Ratio
        $ltv_cac_ratio = $cac > 0 ? $ltv / $cac : 0;
        
        Response::json([
            'success' => true,
            'data' => [
                'revenue_trend' => $revenue_trend,
                'expenses_trend' => $expenses_trend,
                'roi' => round($roi, 2),
                'cac' => round($cac, 2),
                'ltv' => round($ltv, 2),
                'ltv_cac_ratio' => round($ltv_cac_ratio, 2),
                'current_metrics' => [
                    'revenue' => $current_revenue,
                    'expenses' => $current_expenses,
                    'active_clients' => $active_clients,
                    'new_clients' => $new_clients,
                    'avg_client_value' => $avg_client_value
                ]
            ]
        ]);
    } catch (Exception $e) {
        error_log('Financial Report Error: ' . $e->getMessage());
        Response::error('Error generating financial report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório de Inadimplência
 */
function getDefaultersReport($db, $reseller_id) {
    try {
        // Clients with expired renewal dates
        $stmt = $db->prepare("
            SELECT 
                id, name, email, phone, value, renewal_date, status,
                DATEDIFF(CURDATE(), renewal_date) as days_overdue
            FROM clients 
            WHERE reseller_id = ? 
            AND renewal_date < CURDATE()
            AND status IN ('active', 'expired')
            ORDER BY renewal_date ASC
        ");
        $stmt->execute([$reseller_id]);
        $defaulters = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Summary
        $total_defaulters = count($defaulters);
        $total_overdue_value = array_sum(array_column($defaulters, 'value'));
        
        // Group by overdue period
        $overdue_groups = [
            '0-7' => ['count' => 0, 'value' => 0],
            '8-15' => ['count' => 0, 'value' => 0],
            '16-30' => ['count' => 0, 'value' => 0],
            '30+' => ['count' => 0, 'value' => 0]
        ];
        
        foreach ($defaulters as $client) {
            $days = intval($client['days_overdue']);
            $value = floatval($client['value']);
            
            if ($days <= 7) {
                $overdue_groups['0-7']['count']++;
                $overdue_groups['0-7']['value'] += $value;
            } elseif ($days <= 15) {
                $overdue_groups['8-15']['count']++;
                $overdue_groups['8-15']['value'] += $value;
            } elseif ($days <= 30) {
                $overdue_groups['16-30']['count']++;
                $overdue_groups['16-30']['value'] += $value;
            } else {
                $overdue_groups['30+']['count']++;
                $overdue_groups['30+']['value'] += $value;
            }
        }
        
        Response::json([
            'success' => true,
            'data' => [
                'total_defaulters' => $total_defaulters,
                'total_overdue_value' => $total_overdue_value,
                'defaulters' => $defaulters,
                'overdue_groups' => $overdue_groups
            ]
        ]);
    } catch (Exception $e) {
        error_log('Defaulters Report Error: ' . $e->getMessage());
        Response::error('Error generating defaulters report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório de Planos
 */
function getPlansReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Distribution of clients by plan
        $stmt = $db->prepare("
            SELECT 
                p.id,
                p.name as plan_name,
                p.value as plan_value,
                COUNT(c.id) as client_count,
                COALESCE(SUM(c.value), 0) as total_revenue
            FROM plans p
            LEFT JOIN clients c ON p.id = c.plan_id AND c.reseller_id = p.reseller_id AND c.status = 'active'
            WHERE p.reseller_id = ?
            GROUP BY p.id, p.name, p.value
            ORDER BY client_count DESC
        ");
        $stmt->execute([$reseller_id]);
        $plan_distribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add profitability calculations
        foreach ($plan_distribution as &$plan) {
            $plan['operational_cost'] = 0;
            $plan['net_profit'] = floatval($plan['total_revenue']);
            $plan['profit_margin'] = 100;
        }
        
        Response::json([
            'success' => true,
            'data' => [
                'plan_distribution' => $plan_distribution,
                'most_popular' => array_slice($plan_distribution, 0, 5)
            ]
        ]);
    } catch (Exception $e) {
        error_log('Plans Report Error: ' . $e->getMessage());
        Response::error('Error generating plans report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório de Despesas Detalhadas
 */
function getExpensesReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Expenses by category
        $stmt = $db->prepare("
            SELECT 
                type,
                category,
                COUNT(*) as count,
                COALESCE(SUM(value), 0) as total
            FROM expenses 
            WHERE reseller_id = ? 
            AND date BETWEEN ? AND ?
            GROUP BY type, category
            ORDER BY total DESC
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $by_category = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Recent expenses
        $stmt = $db->prepare("
            SELECT id, date, value, type, category, description
            FROM expenses 
            WHERE reseller_id = ? 
            AND date BETWEEN ? AND ?
            ORDER BY date DESC
            LIMIT 50
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $recent_expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Panel costs
        $stmt = $db->prepare("
            SELECT id, name, monthly_cost, type
            FROM panels 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $panel_costs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::json([
            'success' => true,
            'data' => [
                'by_category' => $by_category,
                'monthly_breakdown' => [],
                'recent_expenses' => $recent_expenses,
                'panel_costs' => $panel_costs
            ]
        ]);
    } catch (Exception $e) {
        error_log('Expenses Report Error: ' . $e->getMessage());
        Response::error('Error generating expenses report: ' . $e->getMessage(), 500);
    }
}

/**
 * Relatório Comparativo
 */
function getComparativeReport($db, $reseller_id, $start_date, $end_date) {
    try {
        // Calculate previous period dates
        $start_date_obj = new DateTime($start_date);
        $end_date_obj = new DateTime($end_date);
        $period_diff = $start_date_obj->diff($end_date_obj)->days + 1;
        
        $prev_end_date = clone $start_date_obj;
        $prev_end_date->modify('-1 day');
        $prev_start_date = clone $prev_end_date;
        $prev_start_date->modify('-' . ($period_diff - 1) . ' days');
        
        $prev_start = $prev_start_date->format('Y-m-d');
        $prev_end = $prev_end_date->format('Y-m-d');
        
        // Current period metrics
        // Revenue from active clients
        $stmt = $db->prepare("
            SELECT 
                COALESCE(SUM(value), 0) as revenue, 
                COUNT(*) as clients
            FROM clients 
            WHERE reseller_id = ? 
            AND status = 'active'
        ");
        $stmt->execute([$reseller_id]);
        $current_revenue = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Current period expenses
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(value), 0) as expenses
            FROM expenses 
            WHERE reseller_id = ? 
            AND date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $current_expenses = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Current period panel costs
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(monthly_cost), 0) as panel_costs
            FROM panels 
            WHERE reseller_id = ?
        ");
        $stmt->execute([$reseller_id]);
        $current_panel_costs = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Current period new clients
        $stmt = $db->prepare("
            SELECT COUNT(*) as new_clients
            FROM clients 
            WHERE reseller_id = ? 
            AND start_date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $start_date, $end_date]);
        $current_new_clients = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Previous period expenses
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(value), 0) as expenses
            FROM expenses 
            WHERE reseller_id = ? 
            AND date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $prev_start, $prev_end]);
        $prev_expenses = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Previous period new clients
        $stmt = $db->prepare("
            SELECT COUNT(*) as new_clients
            FROM clients 
            WHERE reseller_id = ? 
            AND start_date BETWEEN ? AND ?
        ");
        $stmt->execute([$reseller_id, $prev_start, $prev_end]);
        $prev_new_clients = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate metrics
        $current_revenue_val = floatval($current_revenue['revenue'] ?? 0);
        $current_expenses_val = floatval($current_expenses['expenses'] ?? 0);
        $current_panel_costs_val = floatval($current_panel_costs['panel_costs'] ?? 0);
        $current_total_expenses = $current_expenses_val + $current_panel_costs_val;
        $current_profit = $current_revenue_val - $current_total_expenses;
        
        $prev_revenue_val = $current_revenue_val; // Same as current for revenue (monthly recurring)
        $prev_expenses_val = floatval($prev_expenses['expenses'] ?? 0);
        $prev_total_expenses = $prev_expenses_val + $current_panel_costs_val;
        $prev_profit = $prev_revenue_val - $prev_total_expenses;
        
        $current_metrics = [
            'revenue' => $current_revenue_val,
            'expenses' => $current_total_expenses,
            'profit' => $current_profit,
            'clients' => intval($current_revenue['clients'] ?? 0),
            'new_clients' => intval($current_new_clients['new_clients'] ?? 0)
        ];
        
        $prev_metrics = [
            'revenue' => $prev_revenue_val,
            'expenses' => $prev_total_expenses,
            'profit' => $prev_profit,
            'clients' => intval($current_revenue['clients'] ?? 0), // Same as current
            'new_clients' => intval($prev_new_clients['new_clients'] ?? 0)
        ];
        
        // Calculate percentage changes
        $calculateChange = function($current, $previous) {
            if ($previous == 0) return $current > 0 ? 100 : 0;
            return (($current - $previous) / $previous) * 100;
        };
        
        Response::json([
            'success' => true,
            'data' => [
                'current_period' => [
                    'start' => $start_date,
                    'end' => $end_date,
                    'metrics' => $current_metrics
                ],
                'previous_period' => [
                    'start' => $prev_start,
                    'end' => $prev_end,
                    'metrics' => $prev_metrics
                ],
                'comparison' => [
                    'revenue' => round($calculateChange($current_metrics['revenue'], $prev_metrics['revenue']), 2),
                    'expenses' => round($calculateChange($current_metrics['expenses'], $prev_metrics['expenses']), 2),
                    'profit' => round($calculateChange($current_metrics['profit'], $prev_metrics['profit']), 2),
                    'clients' => round($calculateChange($current_metrics['clients'], $prev_metrics['clients']), 2),
                    'new_clients' => round($calculateChange($current_metrics['new_clients'], $prev_metrics['new_clients']), 2)
                ]
            ]
        ]);
    } catch (Exception $e) {
        error_log('Comparative Report Error: ' . $e->getMessage());
        Response::error('Error generating comparative report: ' . $e->getMessage(), 500);
    }
}
