#!/usr/bin/env node

/**
 * WhatsApp Server usando Baileys
 * Implementação real do WhatsApp Web usando @whiskeysockets/baileys
 * Compatible com Evolution API endpoints
 */

const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Armazenamento de sessões WhatsApp
const sessions = new Map();
const qrCodes = new Map();

// Logger
const logger = pino({ level: 'error' });

// Diretório para armazenar sessões
const sessionsDir = path.join(__dirname, 'whatsapp-sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Criar sessão WhatsApp real usando Baileys
async function createWhatsAppSession(instanceName) {
  const sessionPath = path.join(sessionsDir, instanceName);

  try {
    console.log(`🔧 [${instanceName}] Iniciando criação de sessão...`);

    // Limpar sessão anterior se houver problemas
    if (sessions.has(instanceName)) {
      const oldSession = sessions.get(instanceName);
      if (oldSession.sock) {
        try {
          oldSession.sock.end();
        } catch (e) {
          // Ignorar erros ao fechar sessão antiga
        }
      }
      sessions.delete(instanceName);
      qrCodes.delete(instanceName);
    }

    // Usar autenticação multi-arquivo
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Criar socket WhatsApp com configurações otimizadas para estabilidade
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: logger,
      browser: ['GestPlay', 'Chrome', '110.0.0.0'],
      defaultQueryTimeoutMs: 120000, // Aumentado para 2 minutos
      connectTimeoutMs: 120000, // Aumentado para 2 minutos
      keepAliveIntervalMs: 25000, // Reduzido para manter conexão mais ativa
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      retryRequestDelayMs: 1000, // Aumentado delay entre tentativas
      maxMsgRetryCount: 5, // Mais tentativas
      emitOwnEvents: false,
      fireInitQueries: true,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => false,
      linkPreviewImageThumbnailWidth: 192,
      transactionOpts: {
        maxCommitRetries: 10,
        delayBetweenTriesMs: 3000
      },
      getMessage: async (key) => {
        return undefined;
      }
    });

    // Armazenar referência do socket
    sessions.set(instanceName, {
      sock,
      connected: false,
      instanceName,
      status: 'connecting',
      qrCode: null
    });

    // Event listeners
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      console.log(`📱 [${instanceName}] Connection update:`, connection);

      if (qr) {
        // Gerar QR Code real
        try {
          const qrCodeDataURL = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          // Armazenar QR Code
          qrCodes.set(instanceName, {
            qrCode: qrCodeDataURL,
            timestamp: Date.now()
          });

          // Atualizar status da sessão
          const session = sessions.get(instanceName);
          if (session) {
            session.status = 'qr';
            session.qrCode = qrCodeDataURL;
          }

          console.log(`📱 [${instanceName}] QR Code gerado`);
        } catch (error) {
          console.error(`❌ [${instanceName}] Erro ao gerar QR Code:`, error);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`🔌 [${instanceName}] Conexão fechada. Status: ${statusCode}, Reconectar: ${shouldReconnect}`);

        // Atualizar status da sessão
        const session = sessions.get(instanceName);
        if (session) {
          session.connected = false;
          session.status = 'close';
          session.reconnectAttempts = (session.reconnectAttempts || 0) + 1;
        }

        // Estratégia de reconexão inteligente baseada no código de erro
        if (statusCode === DisconnectReason.badSession || statusCode === 401) {
          const errorType = lastDisconnect?.error?.output?.payload?.error;
          const isDeviceRemoved = errorType === 'device_removed' ||
            JSON.stringify(lastDisconnect).includes('device_removed');

          if (isDeviceRemoved) {
            console.log(`📱 [${instanceName}] Dispositivo removido pelo WhatsApp (401)`);
            console.log(`⚠️ [${instanceName}] ATENÇÃO: Este número foi conectado em outra instância!`);
            console.log(`💡 [${instanceName}] Cada número só pode estar conectado em UMA instância por vez.`);
          } else {
            console.log(`🧹 [${instanceName}] Sessão inválida (${statusCode}) - Limpando completamente...`);
          }

          // Limpar keep-alive se existir
          if (session.keepAliveInterval) {
            clearInterval(session.keepAliveInterval);
          }

          // Limpar pasta de sessão
          try {
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
              console.log(`🗑️ [${instanceName}] Pasta de sessão removida`);
            }
          } catch (e) {
            console.log(`⚠️ [${instanceName}] Erro ao limpar pasta:`, e.message);
          }

          sessions.delete(instanceName);
          qrCodes.delete(instanceName);
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === 515) {
          // Erro de conexão - reconectar com delay progressivo
          const attempts = session?.reconnectAttempts || 0;
          const delay = Math.min(5000 + (attempts * 2000), 30000); // Max 30 segundos

          console.log(`⏳ [${instanceName}] Erro de conexão (${statusCode}). Tentativa ${attempts + 1}. Aguardando ${delay / 1000}s...`);

          if (attempts < 10) { // Máximo 10 tentativas
            setTimeout(() => {
              console.log(`🔄 [${instanceName}] Tentando reconectar (tentativa ${attempts + 1})...`);
              createWhatsAppSession(instanceName);
            }, delay);
          } else {
            console.log(`❌ [${instanceName}] Muitas tentativas de reconexão. Parando...`);
            sessions.delete(instanceName);
            qrCodes.delete(instanceName);
          }
        } else if (shouldReconnect && statusCode !== DisconnectReason.loggedOut) {
          // Outros erros - reconexão padrão
          console.log(`⏳ [${instanceName}] Aguardando 5 segundos para reconectar...`);
          setTimeout(() => {
            console.log(`🔄 [${instanceName}] Tentando reconectar...`);
            createWhatsAppSession(instanceName);
          }, 5000);
        } else {
          console.log(`❌ [${instanceName}] Não reconectando (Status: ${statusCode}). Limpando sessão...`);
          sessions.delete(instanceName);
          qrCodes.delete(instanceName);
        }
      } else if (connection === 'open') {
        console.log(`✅ [${instanceName}] WhatsApp conectado com sucesso!`);

        // Atualizar status da sessão IMEDIATAMENTE
        const session = sessions.get(instanceName);
        if (session) {
          session.connected = true;
          session.status = 'open';
          session.qrCode = null;
          session.reconnectAttempts = 0; // Reset contador de tentativas
          session.connectedAt = new Date().toISOString();
          console.log(`🔓 [${instanceName}] Sessão marcada como conectada e pronta para uso`);
        }

        // Remover QR Code
        qrCodes.delete(instanceName);

        // Obter informações do usuário
        try {
          const user = sock.user;
          if (user) {
            session.phoneNumber = `+${user.id.split(':')[0]}`;
            session.profileName = user.name || 'WhatsApp User';
            console.log(`👤 [${instanceName}] Usuário: ${session.profileName} (${session.phoneNumber})`);
          }
        } catch (error) {
          console.log(`⚠️ [${instanceName}] Erro ao obter info do usuário:`, error);
        }

        // Implementar keep-alive para manter conexão estável
        if (session.keepAliveInterval) {
          clearInterval(session.keepAliveInterval);
        }

        session.keepAliveInterval = setInterval(async () => {
          try {
            // Verificar se o socket ainda está aberto antes de enviar keep-alive
            if (sock.ws?.readyState === 1) {
              // Ping simples para manter conexão ativa
              await sock.query({
                tag: 'iq',
                attrs: {
                  id: sock.generateMessageTag(),
                  type: 'get',
                  xmlns: 'w:p',
                  to: 's.whatsapp.net'
                }
              });
              console.log(`💓 [${instanceName}] Keep-alive enviado`);
            } else {
              console.log(`⚠️ [${instanceName}] Socket não está aberto, pulando keep-alive`);
            }
          } catch (error) {
            console.log(`⚠️ [${instanceName}] Erro no keep-alive:`, error.message);
            // Se o erro for de conexão fechada, limpar o intervalo
            if (error.message.includes('Connection Closed') || error.message.includes('closed')) {
              clearInterval(session.keepAliveInterval);
              console.log(`🔌 [${instanceName}] Keep-alive desativado devido a conexão fechada`);
            }
          }
        }, 60000); // A cada 1 minuto
      }
    });

    // Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Monitoramento de mensagens para detectar problemas
    sock.ev.on('messages.upsert', (m) => {
      const session = sessions.get(instanceName);
      if (session) {
        session.lastMessageReceived = new Date().toISOString();
      }
    });

    // Monitoramento de presença para detectar atividade
    sock.ev.on('presence.update', (presence) => {
      const session = sessions.get(instanceName);
      if (session) {
        session.lastPresenceUpdate = new Date().toISOString();
      }
    });

    // Tratamento de erros não capturados
    sock.ev.on('connection.error', (error) => {
      console.log(`❌ [${instanceName}] Erro de conexão:`, error);
    });

    return sock;
  } catch (error) {
    console.error(`❌ [${instanceName}] Erro ao criar sessão:`, error);
    throw error;
  }
}

// Middleware de autenticação
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['apikey'] || req.headers['authorization'];
  const expectedApiKey = 'gestplay-api-key-2024';

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  next();
};

// Aplicar autenticação em todas as rotas da API (exceto health)
app.use('/instance', authenticateApiKey);
app.use('/message', authenticateApiKey);

// Rotas da Evolution API

// Criar instância
app.post('/instance/create', async (req, res) => {
  const { instanceName, token, qrcode = true } = req.body;

  if (!instanceName) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'instanceName is required'
    });
  }

  try {
    // Verificar se instância já existe
    if (sessions.has(instanceName)) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Instance already exists'
      });
    }

    console.log(`🔄 Criando instância: ${instanceName}`);

    // Criar sessão WhatsApp real
    await createWhatsAppSession(instanceName);

    res.json({
      instance: {
        instanceName,
        status: 'created'
      },
      hash: {
        apikey: token
      }
    });
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Conectar instância (obter QR Code)
app.get('/instance/connect/:instanceName', async (req, res) => {
  const { instanceName } = req.params;

  try {
    const session = sessions.get(instanceName);

    if (!session) {
      // Criar nova sessão se não existir
      await createWhatsAppSession(instanceName);

      // Aguardar um pouco para o QR Code ser gerado
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const qrData = qrCodes.get(instanceName);

    if (!qrData) {
      return res.status(202).json({
        message: 'QR Code being generated, please wait...',
        status: 'generating'
      });
    }

    res.json({
      base64: qrData.qrCode,
      code: qrData.qrCode,
      count: 1
    });
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Verificar status da conexão
app.get('/instance/connectionState/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);

  if (!session) {
    return res.json({
      instance: {
        instanceName,
        state: 'close'
      }
    });
  }

  let state = 'close';
  if (session.connected) {
    state = 'open';
  } else if (session.status === 'qr') {
    state = 'qr';
  }

  res.json({
    instance: {
      instanceName,
      state: state,
      status: session.status || 'close'
    }
  });
});



// Limpar sessão completamente (nova rota)
app.post('/instance/clear/:instanceName', async (req, res) => {
  const { instanceName } = req.params;

  try {
    console.log(`🧹 [${instanceName}] Limpando sessão completamente...`);

    // Fechar socket se existir
    const session = sessions.get(instanceName);
    if (session && session.sock) {
      try {
        session.sock.end();
      } catch (e) {
        // Ignorar erros ao fechar
      }
    }

    // Limpar da memória
    sessions.delete(instanceName);
    qrCodes.delete(instanceName);

    // Limpar pasta de sessão
    const sessionPath = path.join(sessionsDir, instanceName);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`🗑️ [${instanceName}] Pasta de sessão removida`);
    }

    res.json({
      success: true,
      message: 'Sessão limpa com sucesso'
    });
  } catch (error) {
    console.error(`❌ [${instanceName}] Erro ao limpar sessão:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Logout da instância
app.delete('/instance/logout/:instanceName', async (req, res) => {
  const { instanceName } = req.params;

  try {
    const session = sessions.get(instanceName);

    if (session && session.sock) {
      // Fazer logout real do WhatsApp
      await session.sock.logout();
    }

    // Limpar dados da sessão
    sessions.delete(instanceName);
    qrCodes.delete(instanceName);

    // Remover arquivos de sessão
    const sessionPath = path.join(sessionsDir, instanceName);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    console.log(`🔌 [${instanceName}] Instância desconectada e limpa`);

    res.json({
      error: false,
      message: 'Instance logged out successfully'
    });
  } catch (error) {
    console.error(`❌ [${instanceName}] Erro ao fazer logout:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Enviar mensagem de texto
app.post('/message/sendText/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const { number, text } = req.body;

  const session = sessions.get(instanceName);

  // Verificação mais robusta do status da conexão
  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Instance '${instanceName}' not found. Please create the instance first.`
    });
  }

  if (!session.sock) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Instance socket not initialized. Please reconnect.'
    });
  }

  // Verificar se o socket está realmente aberto
  const socketState = session.sock.ws?.readyState;

  // Verificação mais flexível: aceitar se connected=true OU se socketState=1 (OPEN)
  // Isso resolve o problema de timing onde o socket está pronto mas connected ainda não foi setado
  const isSocketOpen = socketState === 1; // WebSocket.OPEN
  const isMarkedConnected = session.connected && session.status === 'open';
  const isReady = isMarkedConnected || isSocketOpen;

  if (!isReady) {
    console.log(`⚠️ [${instanceName}] Tentativa de envio com instância não conectada:`);
    console.log(`   - session.connected: ${session.connected}`);
    console.log(`   - session.status: ${session.status}`);
    console.log(`   - socketState: ${socketState} (${socketState === 1 ? 'OPEN' : 'NOT OPEN'})`);

    return res.status(400).json({
      error: 'Bad Request',
      message: 'Instance not connected. Please scan QR code and wait for connection.',
      details: {
        connected: session.connected,
        status: session.status,
        socketState: socketState
      }
    });
  }

  console.log(`✅ [${instanceName}] Instância pronta para enviar mensagem`);
  console.log(`   - connected: ${session.connected}, status: ${session.status}, socketState: ${socketState}`);

  // Validar dados
  if (!number || !text) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'number and text are required'
    });
  }

  try {
    // Formatar número para WhatsApp
    const formattedNumber = number.includes('@') ? number : `${number}@s.whatsapp.net`;

    // Enviar mensagem real
    const result = await session.sock.sendMessage(formattedNumber, { text });

    console.log(`📤 [${instanceName}] Mensagem enviada:`);
    console.log(`   Para: ${number}`);
    console.log(`   Texto: ${text}`);
    console.log(`   ID: ${result.key.id}`);
    console.log('---');

    res.json({
      key: result.key,
      message: {
        conversation: text
      },
      messageTimestamp: result.messageTimestamp,
      status: 'PENDING'
    });
  } catch (error) {
    console.error(`❌ [${instanceName}] Erro ao enviar mensagem:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Listar instâncias
app.get('/instance/fetchInstances', (req, res) => {
  const instances = Array.from(sessions.entries()).map(([name, session]) => ({
    instance: {
      instanceName: name,
      status: session.connected ? 'open' : 'close'
    }
  }));

  res.json(instances);
});

// Obter informações da instância
app.get('/instance/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);

  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Instance not found'
    });
  }

  res.json({
    instance: {
      instanceName,
      status: session.connected ? 'open' : session.status || 'close',
      profileName: session.profileName || 'WhatsApp User',
      profilePictureUrl: session.profilePictureUrl || null,
      phoneNumber: session.phoneNumber || null,
      integration: 'WHATSAPP-BAILEYS'
    }
  });
});

// Webhook para eventos (simulado)
app.post('/webhook/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const event = req.body;

  console.log(`📡 Webhook recebido para ${instanceName}:`, event);

  res.json({
    error: false,
    message: 'Webhook received successfully'
  });
});

// Rota de saúde detalhada
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessions: {
      total: sessions.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      details: []
    }
  };

  // Analisar status das sessões
  sessions.forEach((session, instanceName) => {
    const sessionInfo = {
      instanceName,
      status: session.status,
      connected: session.connected,
      connectedAt: session.connectedAt,
      reconnectAttempts: session.reconnectAttempts || 0,
      lastMessageReceived: session.lastMessageReceived,
      lastPresenceUpdate: session.lastPresenceUpdate,
      phoneNumber: session.phoneNumber,
      profileName: session.profileName
    };

    healthData.sessions.details.push(sessionInfo);

    if (session.connected) {
      healthData.sessions.connected++;
    } else if (session.status === 'connecting' || session.status === 'qr') {
      healthData.sessions.connecting++;
    } else {
      healthData.sessions.disconnected++;
    }
  });

  res.json(healthData);
});

// Rota de health check simples
app.get('/ping', (req, res) => {
  res.json({
    status: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Rota de diagnóstico detalhado de instância
app.get('/instance/diagnose/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);

  if (!session) {
    return res.json({
      exists: false,
      message: `Instance '${instanceName}' not found`,
      availableInstances: Array.from(sessions.keys())
    });
  }

  const socketState = session.sock?.ws?.readyState;
  const socketStateNames = {
    0: 'CONNECTING',
    1: 'OPEN',
    2: 'CLOSING',
    3: 'CLOSED'
  };

  res.json({
    exists: true,
    instanceName,
    diagnosis: {
      connected: session.connected,
      status: session.status,
      socketExists: !!session.sock,
      socketState: socketState,
      socketStateName: socketStateNames[socketState] || 'UNKNOWN',
      phoneNumber: session.phoneNumber,
      profileName: session.profileName,
      connectedAt: session.connectedAt,
      reconnectAttempts: session.reconnectAttempts || 0,
      lastMessageReceived: session.lastMessageReceived,
      lastPresenceUpdate: session.lastPresenceUpdate,
      hasKeepAlive: !!session.keepAliveInterval
    },
    recommendation: session.connected && socketState === 1
      ? 'Instance is ready to send messages'
      : 'Instance is not ready. Please reconnect or wait for connection to stabilize.'
  });
});

// Rota para verificar números conectados (evitar duplicação)
app.get('/instance/connectedNumbers', (req, res) => {
  const connectedNumbers = [];

  sessions.forEach((session, instanceName) => {
    if (session.connected && session.phoneNumber) {
      connectedNumbers.push({
        instanceName,
        phoneNumber: session.phoneNumber,
        profileName: session.profileName,
        connectedAt: session.connectedAt
      });
    }
  });

  res.json({
    total: connectedNumbers.length,
    numbers: connectedNumbers
  });
});

// Rota para limpar instâncias duplicadas/órfãs
app.post('/instance/cleanup', async (req, res) => {
  try {
    const cleaned = [];
    const kept = [];

    // Agrupar instâncias por reseller ID base
    const resellerGroups = new Map();

    sessions.forEach((session, instanceName) => {
      // Extrair ID base (ex: reseller_123_abc → 123)
      const match = instanceName.match(/reseller_(\d+)/);
      if (match) {
        const baseId = match[1];
        if (!resellerGroups.has(baseId)) {
          resellerGroups.set(baseId, []);
        }
        resellerGroups.get(baseId).push({ instanceName, session });
      }
    });

    // Para cada grupo, manter apenas a instância conectada ou a mais recente
    resellerGroups.forEach((instances, baseId) => {
      if (instances.length > 1) {
        console.log(`🔍 [Cleanup] Encontradas ${instances.length} instâncias para reseller ${baseId}`);

        // Ordenar: conectadas primeiro, depois por data de conexão
        instances.sort((a, b) => {
          if (a.session.connected && !b.session.connected) return -1;
          if (!a.session.connected && b.session.connected) return 1;

          const dateA = new Date(a.session.connectedAt || 0).getTime();
          const dateB = new Date(b.session.connectedAt || 0).getTime();
          return dateB - dateA;
        });

        // Manter a primeira (melhor), limpar as outras
        const toKeep = instances[0];
        const toClean = instances.slice(1);

        kept.push(toKeep.instanceName);

        toClean.forEach(({ instanceName, session }) => {
          console.log(`🧹 [Cleanup] Removendo instância duplicada: ${instanceName}`);

          // Limpar keep-alive
          if (session.keepAliveInterval) {
            clearInterval(session.keepAliveInterval);
          }

          // Fechar socket
          if (session.sock) {
            try {
              session.sock.end();
            } catch (e) {
              // Ignorar erros
            }
          }

          // Remover da memória
          sessions.delete(instanceName);
          qrCodes.delete(instanceName);

          // Limpar pasta de sessão
          const sessionPath = path.join(sessionsDir, instanceName);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }

          cleaned.push(instanceName);
        });
      } else {
        kept.push(instances[0].instanceName);
      }
    });

    res.json({
      success: true,
      cleaned: cleaned.length,
      kept: kept.length,
      details: {
        cleaned,
        kept
      }
    });
  } catch (error) {
    console.error('❌ Erro ao limpar instâncias:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware de erro
app.use((error, req, res, next) => {
  console.error('Erro na API:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Evolution API Compatible Server rodando na porta ${PORT}`);
  console.log(`📱 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔑 API Key: gestplay-evolution-api-key-2024`);
  console.log('');
  console.log('📋 Endpoints Evolution API:');
  console.log(`   POST /instance/create                    - Criar instância`);
  console.log(`   GET  /instance/connect/:instanceName     - Conectar (QR Code)`);
  console.log(`   GET  /instance/connectionState/:instanceName - Status`);
  console.log(`   DELETE /instance/logout/:instanceName    - Desconectar`);
  console.log(`   POST /message/sendText/:instanceName     - Enviar mensagem`);
  console.log(`   GET  /instance/fetchInstances            - Listar instâncias`);
  console.log('');
  console.log('🔧 Configuração GestPlay:');
  console.log(`   NEXT_PUBLIC_WHATSAPP_API_URL=http://localhost:${PORT}`);
  console.log(`   NEXT_PUBLIC_WHATSAPP_API_KEY=gestplay-evolution-api-key-2024`);
  console.log('');
  console.log('✅ Servidor pronto para uso com GestPlay!');
});

// Limpeza automática de sessões órfãs
setInterval(() => {
  const now = Date.now();
  const maxInactiveTime = 10 * 60 * 1000; // 10 minutos

  sessions.forEach((session, instanceName) => {
    if (!session.connected && session.status === 'close') {
      const lastActivity = session.lastMessageReceived || session.connectedAt;
      if (lastActivity) {
        const inactiveTime = now - new Date(lastActivity).getTime();
        if (inactiveTime > maxInactiveTime) {
          console.log(`🧹 [${instanceName}] Limpando sessão inativa há ${Math.round(inactiveTime / 60000)} minutos`);

          // Limpar keep-alive se existir
          if (session.keepAliveInterval) {
            clearInterval(session.keepAliveInterval);
          }

          // Fechar socket se existir
          if (session.sock) {
            try {
              session.sock.end();
            } catch (e) {
              // Ignorar erros
            }
          }

          sessions.delete(instanceName);
          qrCodes.delete(instanceName);
        }
      }
    }
  });
}, 5 * 60 * 1000); // Verificar a cada 5 minutos

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Encerrando servidor graciosamente...');

  // Fechar todas as sessões
  sessions.forEach((session, instanceName) => {
    console.log(`🔌 [${instanceName}] Fechando sessão...`);

    if (session.keepAliveInterval) {
      clearInterval(session.keepAliveInterval);
    }

    if (session.sock) {
      try {
        session.sock.end();
      } catch (e) {
        // Ignorar erros
      }
    }
  });

  sessions.clear();
  qrCodes.clear();

  console.log('✅ Servidor encerrado com sucesso');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);