import { NextRequest, NextResponse } from 'next/server';

// Webhook para receber eventos da Evolution API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log do evento recebido (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 WhatsApp Webhook Event:', {
        event: body.event,
        instance: body.instance,
        timestamp: new Date().toISOString(),
      });
    }

    // Processar diferentes tipos de eventos
    switch (body.event) {
      case 'qrcode.updated':
        // QR Code foi atualizado
        console.log('🔄 QR Code atualizado para instância:', body.instance);
        break;

      case 'connection.update':
        // Status da conexão mudou
        console.log('🔗 Status da conexão:', body.data?.state, 'para instância:', body.instance);
        
        if (body.data?.state === 'open') {
          console.log('✅ WhatsApp conectado com sucesso!');
        } else if (body.data?.state === 'close') {
          console.log('❌ WhatsApp desconectado');
        }
        break;

      case 'messages.upsert':
        // Nova mensagem recebida
        const messages = body.data?.messages || [];
        messages.forEach((message: any) => {
          if (!message.key?.fromMe) {
            console.log('📨 Mensagem recebida de:', message.key?.remoteJid);
            console.log('💬 Conteúdo:', message.message?.conversation || 'Mídia/Outro');
          }
        });
        break;

      case 'messages.update':
        // Status da mensagem atualizado (entregue, lida, etc.)
        const updates = body.data?.messages || [];
        updates.forEach((update: any) => {
          if (update.update?.status) {
            console.log('📊 Status da mensagem atualizado:', update.update.status);
          }
        });
        break;

      case 'presence.update':
        // Status de presença atualizado (online, offline, digitando, etc.)
        console.log('👤 Presença atualizada:', body.data?.presences);
        break;

      case 'chats.upsert':
        // Novo chat criado
        console.log('💬 Novo chat criado');
        break;

      case 'contacts.upsert':
        // Novo contato adicionado
        console.log('👥 Contato atualizado');
        break;

      default:
        console.log('❓ Evento desconhecido:', body.event);
        break;
    }

    // Aqui você pode implementar lógica adicional, como:
    // - Salvar eventos no banco de dados
    // - Enviar notificações para o frontend via WebSocket
    // - Processar respostas automáticas
    // - Atualizar status de mensagens enviadas

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no webhook do WhatsApp:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Método GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'WhatsApp Webhook',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}