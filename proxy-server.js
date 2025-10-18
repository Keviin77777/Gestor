#!/usr/bin/env node

/**
 * Proxy Server para rotear entre Next.js e PHP
 * Rota /checkout/* para Next.js (3000)
 * Rota /api/* para PHP (8080)
 * Outras rotas para Next.js (3000)
 */

const http = require('http');
const httpProxy = require('http-proxy');

// Criar proxy
const proxy = httpProxy.createProxyServer({});

// Configurações
const NEXTJS_PORT = 9002; // Next.js está rodando na porta 9002
const PHP_PORT = 8080;
const PROXY_PORT = 9000;

// Criar servidor proxy
const server = http.createServer((req, res) => {
  const url = req.url;
  
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${url}`);
  
  // Adicionar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Tratar OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Rotear para PHP se for API
  if (url.startsWith('/api/')) {
    console.log(`  → PHP (${PHP_PORT})`);
    proxy.web(req, res, {
      target: `http://localhost:${PHP_PORT}`,
      changeOrigin: true,
      timeout: 30000
    });
  }
  // Rotear para Next.js para checkout e outras rotas
  else {
    console.log(`  → Next.js (${NEXTJS_PORT})`);
    proxy.web(req, res, {
      target: `http://localhost:${NEXTJS_PORT}`,
      changeOrigin: true,
      timeout: 30000
    });
  }
});

// Tratar erros do proxy
proxy.on('error', (err, req, res) => {
  const target = req.url.startsWith('/api/') ? `PHP (${PHP_PORT})` : `Next.js (${NEXTJS_PORT})`;
  console.error(`❌ Erro no proxy para ${target}:`, err.message);
  console.error(`   URL: ${req.method} ${req.url}`);
  
  if (err.code === 'ECONNREFUSED') {
    console.error(`   💡 Solução: Verifique se o servidor ${target} está rodando`);
  }
  
  if (!res.headersSent) {
    res.writeHead(502, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      error: 'Proxy Error',
      message: `Não foi possível conectar ao servidor ${target}`,
      details: err.message,
      target: target
    }));
  }
});

// Função para verificar se um serviço está rodando
async function checkService(port, name) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      method: 'GET',
      path: '/',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

// Iniciar servidor
server.listen(PROXY_PORT, async () => {
  console.log('🚀 Servidor Proxy Iniciado');
  console.log('========================');
  console.log(`📱 Next.js: http://localhost:${NEXTJS_PORT}`);
  console.log(`🐘 PHP: http://localhost:${PHP_PORT}`);
  console.log(`🔄 Proxy: http://localhost:${PROXY_PORT}`);
  console.log('');
  
  // Verificar serviços
  console.log('🔍 Verificando serviços...');
  const nextjsRunning = await checkService(NEXTJS_PORT, 'Next.js');
  const phpRunning = await checkService(PHP_PORT, 'PHP');
  
  console.log(`  Next.js (${NEXTJS_PORT}): ${nextjsRunning ? '✅ Rodando' : '❌ Não encontrado'}`);
  console.log(`  PHP (${PHP_PORT}): ${phpRunning ? '✅ Rodando' : '❌ Não encontrado'}`);
  
  if (!nextjsRunning) {
    console.log('  💡 Para iniciar Next.js: npm run dev');
  }
  if (!phpRunning) {
    console.log('  💡 Para iniciar PHP: php -S localhost:8080 -t api');
  }
  
  console.log('');
  console.log('📋 Roteamento:');
  console.log('  /api/* → PHP (8080)');
  console.log('  /checkout/* → Next.js (9002)');
  console.log('  /* → Next.js (9002)');
  console.log('');
  console.log('🌐 Configure o ngrok:');
  console.log('  ngrok http 9000');
  console.log('');
  
  if (nextjsRunning && phpRunning) {
    console.log('✅ Todos os serviços estão rodando! Proxy pronto.');
  } else {
    console.log('⚠️  Alguns serviços não estão rodando. Inicie-os antes de usar o proxy.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PROXY_PORT} já está em uso`);
    console.error('💡 Solução: pare o processo ou use outra porta');
  } else {
    console.error('❌ Erro ao iniciar servidor:', err.message);
  }
  process.exit(1);
});