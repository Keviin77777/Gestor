import { NextRequest, NextResponse } from 'next/server';
import { createSigmaAPI } from '@/lib/sigma-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sigmaConfig, 
      action, 
      clientData 
    } = body;

    if (!sigmaConfig?.url || !sigmaConfig?.username || !sigmaConfig?.token) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Sigma IPTV não encontrada' },
        { status: 400 }
      );
    }

    const sigmaAPI = createSigmaAPI(sigmaConfig);

    switch (action) {
      case 'create':
        const newCustomer = await sigmaAPI.createCustomer(
          sigmaConfig.userId,
          clientData.packageId,
          {
            username: clientData.username,
            password: clientData.password,
            name: clientData.name,
            email: clientData.email,
            whatsapp: clientData.whatsapp,
            note: clientData.note
          }
        );
        return NextResponse.json({ success: true, data: newCustomer });

      case 'renew':
        console.log('Renewing customer with data:', {
          userId: sigmaConfig.userId,
          username: clientData.username,
          packageId: clientData.packageId
        });
        
        const renewedCustomer = await sigmaAPI.renewCustomer(
          sigmaConfig.userId,
          clientData.username,
          clientData.packageId
        );
        
        console.log('Renew result:', renewedCustomer);
        return NextResponse.json({ success: true, data: renewedCustomer });

      case 'status':
        await sigmaAPI.updateCustomerStatus(
          sigmaConfig.userId,
          clientData.username,
          clientData.status
        );
        return NextResponse.json({ success: true });

      case 'delete':
        await sigmaAPI.deleteCustomer(
          sigmaConfig.userId,
          clientData.username
        );
        return NextResponse.json({ success: true });

      case 'get':
        const customer = await sigmaAPI.getCustomer(clientData.username);
        return NextResponse.json({ success: true, data: customer });

      default:
        return NextResponse.json(
          { success: false, error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sigma sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}