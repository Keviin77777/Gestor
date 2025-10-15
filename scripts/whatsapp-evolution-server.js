#!/usr/bin/env node

/**
 * WhatsApp Server usando Evolution API
 * Solução profissional e estável para produção
 */

// Carregar variáveis de ambiente do arquivo .env na raiz do projeto
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuração Evolution API
const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'gestplay-whatsapp-2024';

// Middleware
app.use(cors());
app.use(express.json());

// Armazenamento de instâncias
const instances = new Map();

console.log('🚀 Servidor WhatsApp Evolution API');
console.log(`📡 Evolution URL: ${EVOLUTION_URL}`);
console.log(`🔑 API Key: ${EVOLUTION_KEY}`);

// Helper: Fazer requisição para Evolution API
async function evolutionRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${EVOLUTION_URL}${endpoint}`,
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Evolution API Error:`, error.response?.data || error.message);
    throw error;
  }
}

// Criar instância
app.post('/instance/create', async (req, res) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({
        error: true,
        message: 'instanceName é obrigatório'
      });
    }

    console.log(`🔄 Criando instância: ${instanceName}`);

    // Criar instância na Evolution API
    const result = await evolutionRequest('POST', '/instance/create', {
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    });

    instances.set(instanceName, {
      name: instanceName,
      status: 'created',
      createdAt: new Date()
    });

    console.log(`✅ Instância criada: ${instanceName}`);

    res.json({
      error: false,
      message: 'Instância criada com sucesso',
      instance: result
    });

  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({
      error: true,
      message: error.response?.data?.message || error.message
    });
  }
});

// Conectar instância e obter QR Code
app.get('/instance/connect/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;

    console.log(`📱 Conectando instância: ${instanceName}`);

    const result = await evolutionRequest('GET', `/instance/connect/${instanceName}`);

    res.json({
      error: false,
      qrcode: result.qrcode || result.base64,
      message: 'QR Code gerado'
    });

  } catch (error) {
    console.error('Erro ao conectar:', error);
    res.status(500).json({
      error: true,
      message: error.response?.data?.message || error.message
    });
  }
});

// Status da instância
app.get('/instance/connectionState/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;

    const result = await evolutionRequest('GET', `/instance/connectionState/${instanceName}`);

    // A Evolution API retorna: { instance: { instanceName, state } }
    const state = result.instance?.state || result.state;
    const statusReason = result.instance?.statusReason || result.statusReason;

    res.json({
      error: false,
      state: state,
      statusReason: statusReason,
      instance: result.instance // Retornar o objeto completo também
    });

  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.response?.data?.message || error.message
    });
  }
});

// Enviar mensagem de texto
app.post('/message/sendText/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { number, text } = req.body;

    if (!number || !text) {
      return res.status(400).json({
        error: true,
        message: 'number e text são obrigatórios'
      });
    }

    console.log(`📤 Enviando mensagem para ${number}`);

    const result = await evolutionRequest('POST', `/message/sendText/${instanceName}`, {
      number: number,
      textMessage: {
        text: text
      }
    });

    res.json({
      error: false,
      message: 'Mensagem enviada',
      result: result
    });

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: true,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
});

// Desconectar instância
app.delete('/instance/logout/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;

    console.log(`🔌 Desconectando instância: ${instanceName}`);

    await evolutionRequest('DELETE', `/instance/logout/${instanceName}`);

    instances.delete(instanceName);

    res.json({
      error: false,
      message: 'Instância desconectada'
    });

  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.response?.data?.message || error.message
    });
  }
});

// Deletar instância
app.delete('/instance/delete/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;

    console.log(`🗑️ Deletando instância: ${instanceName}`);

    await evolutionRequest('DELETE', `/instance/delete/${instanceName}`);

    instances.delete(instanceName);

    res.json({
      error: false,
      message: 'Instância deletada'
    });

  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.response?.data?.message || error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    instances: instances.size,
    evolutionUrl: EVOLUTION_URL,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📡 Proxy para Evolution API: ${EVOLUTION_URL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});
