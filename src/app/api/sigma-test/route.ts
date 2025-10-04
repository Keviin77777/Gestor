import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Sigma API funcionando!' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      success: true, 
      message: 'POST recebido com sucesso',
      data: body 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao processar POST' 
    }, { status: 500 });
  }
}