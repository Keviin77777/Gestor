import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, token } = body;

    // Basic validation
    if (!url || !username || !token) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Mock success response
    return NextResponse.json({
      success: true,
      userId: 'mock-user-id-123',
      message: 'Conexão testada com sucesso (mock)'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}