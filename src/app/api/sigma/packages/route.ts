import { NextRequest, NextResponse } from 'next/server';
import { createSigmaAPI } from '@/lib/sigma-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, token } = body;

    if (!url || !username || !token) {
      return NextResponse.json(
        { success: false, error: 'Configuração incompleta' },
        { status: 400 }
      );
    }

    const sigmaAPI = createSigmaAPI({ url, username, token });
    const packages = await sigmaAPI.getPackages();

    return NextResponse.json({ success: true, data: packages });
  } catch (error) {
    console.error('Sigma packages error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao buscar pacotes' 
      },
      { status: 500 }
    );
  }
}