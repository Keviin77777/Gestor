import { NextResponse } from 'next/server';

/**
 * API pública para buscar planos de assinatura
 * Retorna TODOS os planos (globais + customizados)
 */
export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
    
    const response = await fetch(`${apiUrl}/api/reseller-subscription-plans/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Erro ao buscar planos:', response.status);
      // Retornar planos fallback
      return NextResponse.json({
        plans: [
          {
            id: 'plan_trial',
            name: 'Trial 3 Dias',
            description: 'Período de teste gratuito de 3 dias',
            price: 0,
            duration_days: 3,
            is_trial: true,
            is_active: true
          },
          {
            id: 'plan_monthly',
            name: 'Plano Mensal',
            description: 'Ideal para começar',
            price: 39.90,
            duration_days: 30,
            is_trial: false,
            is_active: true
          },
          {
            id: 'plan_semester',
            name: 'Plano Semestral',
            description: 'Economia de 16%',
            price: 200.90,
            duration_days: 180,
            is_trial: false,
            is_active: true
          },
          {
            id: 'plan_annual',
            name: 'Plano Anual',
            description: 'Melhor custo-benefício',
            price: 380.90,
            duration_days: 365,
            is_trial: false,
            is_active: true
          }
        ]
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    // Retornar planos fallback em caso de erro
    return NextResponse.json({
      plans: [
        {
          id: 'plan_trial',
          name: 'Trial 3 Dias',
          description: 'Período de teste gratuito de 3 dias',
          price: 0,
          duration_days: 3,
          is_trial: true,
          is_active: true
        },
        {
          id: 'plan_monthly',
          name: 'Plano Mensal',
          description: 'Ideal para começar',
          price: 39.90,
          duration_days: 30,
          is_trial: false,
          is_active: true
        },
        {
          id: 'plan_semester',
          name: 'Plano Semestral',
          description: 'Economia de 16%',
          price: 200.90,
          duration_days: 180,
          is_trial: false,
          is_active: true
        },
        {
          id: 'plan_annual',
          name: 'Plano Anual',
          description: 'Melhor custo-benefício',
          price: 380.90,
          duration_days: 365,
          is_trial: false,
          is_active: true
        }
      ]
    });
  }
}
