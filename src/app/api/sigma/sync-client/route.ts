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
        // Validar userId antes de criar
        if (!sigmaConfig.userId) {
          return NextResponse.json({ 
            success: false, 
            error: 'User ID não configurado. Por favor, teste a conexão primeiro para obter o User ID correto do seu usuário no Sigma.'
          }, { status: 400 });
        }
        
        console.log('Creating customer with config:', {
          userId: sigmaConfig.userId,
          username: sigmaConfig.username,
          packageId: clientData.packageId,
          customerUsername: clientData.username
        });
        
        // Check if customer already exists
        const existingCustomer = await sigmaAPI.getCustomer(clientData.username);
        if (existingCustomer) {
          console.log('Customer already exists:', existingCustomer);
          return NextResponse.json({ 
            success: false, 
            error: `Cliente '${clientData.username}' já existe no Sigma IPTV. Use a opção de sincronizar para atualizar os dados.`,
            existingCustomer 
          }, { status: 400 });
        }
        
        console.log('Customer does not exist, creating...');
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
        console.log('✅ Customer created successfully under user:', sigmaConfig.username);
        console.log('Customer data:', newCustomer);
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