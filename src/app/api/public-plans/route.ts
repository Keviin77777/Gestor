import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
    
    console.log('🔍 Buscando planos de:', `${apiUrl}/api/public-plans`);
    
    // Buscar planos da API PHP (sem autenticação para landing page pública)
    const response = await fetch(`${apiUrl}/api/public-plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Sempre buscar dados frescos
    });

    console.log('📥 Resposta da API PHP:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API PHP:', errorText);
      throw new Error('Erro ao buscar planos');
    }

    const data = await response.json();
    console.log('✅ Planos recebidos:', data.plans?.length || 0);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Erro ao buscar planos públicos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao buscar planos',
        plans: [] 
      },
      { status: 200 } // Retornar 200 com array vazio para usar fallback
    );
  }
}
