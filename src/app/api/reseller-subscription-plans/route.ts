import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * API para buscar planos de assinatura (requer autenticação)
 * Retorna TODOS os planos (globais + customizados)
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
    
    const response = await fetch(`${apiUrl}/api/reseller-subscription-plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Erro ao buscar planos:', response.status);
      return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
