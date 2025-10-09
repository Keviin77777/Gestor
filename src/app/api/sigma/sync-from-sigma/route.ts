import { NextRequest, NextResponse } from 'next/server';
import { createSigmaAPI } from '@/lib/sigma-api';
import { useClients } from '@/hooks/use-clients';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, currentRenewalDate, sigmaConfig } = body;

    if (!username || !currentRenewalDate || !sigmaConfig) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros obrigatórios: username, currentRenewalDate, sigmaConfig' },
        { status: 400 }
      );
    }

    // Validate username
    if (typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Username inválido' },
        { status: 400 }
      );
    }

    // Get customer data from Sigma
    const sigmaAPI = createSigmaAPI(sigmaConfig);
    
    let sigmaCustomer;
    try {
      sigmaCustomer = await sigmaAPI.getCustomerDetails(username);
    } catch (error) {
      // Check if it's a 400 error (client not found)
      if (error instanceof Error && error.message.includes('400')) {
        return NextResponse.json(
          { success: false, error: `Cliente "${username}" não existe no Sigma IPTV` },
          { status: 404 }
        );
      }
      
      // For other errors, try alternative method
      try {
        const renewResult = await sigmaAPI.renewCustomer(
          sigmaConfig.userId,
          username,
          sigmaConfig.userId
        );
        
        if (renewResult && (renewResult as any).data) {
          sigmaCustomer = (renewResult as any).data;
        } else {
          throw new Error('No data in renewal response');
        }
      } catch (renewError) {
        return NextResponse.json(
          { success: false, error: `Cliente "${username}" não encontrado no Sigma IPTV` },
          { status: 404 }
        );
      }
    }

    if (!sigmaCustomer) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado no Sigma' },
        { status: 404 }
      );
    }

    // Extract expiration date from Sigma response
    let sigmaExpirationDate = null;
    
    // Try different possible paths for the expiration date
    if (sigmaCustomer.expires_at_tz) {
      sigmaExpirationDate = sigmaCustomer.expires_at_tz;
    } else if (sigmaCustomer.expires_at) {
      sigmaExpirationDate = sigmaCustomer.expires_at;
    } else if (sigmaCustomer.data?.expires_at_tz) {
      sigmaExpirationDate = sigmaCustomer.data.expires_at_tz;
    } else if (sigmaCustomer.data?.expires_at) {
      sigmaExpirationDate = sigmaCustomer.data.expires_at;
    }
    
    if (!sigmaExpirationDate) {
      return NextResponse.json(
        { success: false, error: 'Data de expiração não encontrada no Sigma' },
        { status: 400 }
      );
    }

    // Convert Sigma date to our format (YYYY-MM-DD)
    const sigmaDate = new Date(sigmaExpirationDate);
    const localRenewalDate = sigmaDate.toISOString().split('T')[0];

    // Compare dates
    const datesAreDifferent = currentRenewalDate !== localRenewalDate;
    return NextResponse.json({
      success: true,
      updated: datesAreDifferent,
      oldDate: currentRenewalDate,
      newDate: localRenewalDate,
      sigmaData: {
        expirationDate: sigmaExpirationDate,
        status: sigmaCustomer.status,
        fullData: sigmaCustomer
      }
    });

  } catch (error) {
    console.error('Sync from Sigma error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}