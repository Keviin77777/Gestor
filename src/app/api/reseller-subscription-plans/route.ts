import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Tentar buscar do banco de dados via API PHP
    const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
    const fullUrl = `${apiUrl}/api/reseller-subscription-plans`;
    
    console.log('Tentando buscar planos de:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Status da resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos da API PHP:', data);
        return NextResponse.json(data);
      } else {
        console.log('API PHP retornou erro:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.log('Erro ao buscar da API PHP, usando fallback:', fetchError);
    }

    // Fallback: retornar planos padrão se a API falhar
    console.log('Usando planos fallback');
    const fallbackPlans = [
      { id: 'plan_trial', name: 'Trial 3 Dias', price: '0.00', duration_days: 3 },
      { id: 'plan_monthly', name: 'Plano Mensal', price: '39.90', duration_days: 30 },
      { id: 'plan_semester', name: 'Plano Semestral', price: '200.00', duration_days: 180 },
      { id: 'plan_annual', name: 'Plano Anual', price: '380.00', duration_days: 365 }
    ];

    return NextResponse.json({ plans: fallbackPlans });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}