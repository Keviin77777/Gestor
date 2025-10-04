import { NextRequest, NextResponse } from 'next/server';
import { createSigmaAPI, validateSigmaConfig } from '@/lib/sigma-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, token, testMode } = body;

    // Validate input
    const errors = validateSigmaConfig({ url, username, token });
    
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Test mode for development/demo
    if (testMode === true) {
      return NextResponse.json({
        success: true,
        userId: 'test-user-id'
      });
    }

    // Test connection with Sigma API
    const sigmaAPI = createSigmaAPI({ url, username, token });
    const result = await sigmaAPI.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sigma connection test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}