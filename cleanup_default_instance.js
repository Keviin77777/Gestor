#!/usr/bin/env node

/**
 * Script para limpar instância "reseller_default" criada incorretamente
 */

const fetch = require('node-fetch');

const WHATSAPP_API_URL = 'http://localhost:3002';
const API_KEY = 'gestplay-api-key-2024';

async function cleanupDefaultInstance() {
    console.log('🧹 Limpando instância "reseller_default"...\n');

    try {
        // 1. Verificar se existe
        console.log('1️⃣ Verificando se instância existe...');
        const statusResponse = await fetch(
            `${WHATSAPP_API_URL}/instance/connectionState/reseller_default`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                },
            }
        );

        const statusData = await statusResponse.json();
        console.log('   Status:', statusData.instance?.state || 'não encontrada');

        // 2. Fazer logout
        console.log('\n2️⃣ Fazendo logout da instância...');
        const logoutResponse = await fetch(
            `${WHATSAPP_API_URL}/instance/logout/reseller_default`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                },
            }
        );

        if (logoutResponse.ok) {
            console.log('   ✅ Logout realizado com sucesso');
        } else {
            const errorData = await logoutResponse.json();
            console.log('   ⚠️ Erro no logout:', errorData.message || 'Desconhecido');
        }

        // 3. Limpar completamente
        console.log('\n3️⃣ Limpando completamente...');
        const clearResponse = await fetch(
            `${WHATSAPP_API_URL}/instance/clear/reseller_default`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                },
            }
        );

        if (clearResponse.ok) {
            const clearData = await clearResponse.json();
            console.log('   ✅', clearData.message);
        } else {
            const errorData = await clearResponse.json();
            console.log('   ⚠️ Erro ao limpar:', errorData.error || 'Desconhecido');
        }

        // 4. Executar cleanup geral
        console.log('\n4️⃣ Executando cleanup geral...');
        const cleanupResponse = await fetch(
            `${WHATSAPP_API_URL}/instance/cleanup`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                },
            }
        );

        if (cleanupResponse.ok) {
            const cleanupData = await cleanupResponse.json();
            console.log('   ✅ Cleanup concluído');
            console.log('   📊 Instâncias limpas:', cleanupData.cleaned);
            console.log('   📊 Instâncias mantidas:', cleanupData.kept);

            if (cleanupData.details?.cleaned?.length > 0) {
                console.log('\n   Removidas:');
                cleanupData.details.cleaned.forEach(name => {
                    console.log(`   - ${name}`);
                });
            }

            if (cleanupData.details?.kept?.length > 0) {
                console.log('\n   Mantidas:');
                cleanupData.details.kept.forEach(name => {
                    console.log(`   - ${name}`);
                });
            }
        } else {
            const errorData = await cleanupResponse.json();
            console.log('   ⚠️ Erro no cleanup:', errorData.error || 'Desconhecido');
        }

        // 5. Listar instâncias restantes
        console.log('\n5️⃣ Instâncias restantes:');
        const listResponse = await fetch(
            `${WHATSAPP_API_URL}/instance/fetchInstances`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                },
            }
        );

        if (listResponse.ok) {
            const instances = await listResponse.json();
            if (instances.length === 0) {
                console.log('   ℹ️ Nenhuma instância ativa');
            } else {
                instances.forEach(inst => {
                    const name = inst.instance.instanceName;
                    const status = inst.instance.status;
                    console.log(`   - ${name}: ${status}`);
                });
            }
        }

        console.log('\n✅ Limpeza concluída!');
        console.log('\n💡 Próximos passos:');
        console.log('   1. Recarregue a página do WhatsApp no navegador (F5)');
        console.log('   2. Clique em "Conectar WhatsApp"');
        console.log('   3. Escaneie o QR Code');
        console.log('   4. Aguarde a conexão');

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        console.log('\n💡 Certifique-se de que o servidor WhatsApp está rodando:');
        console.log('   cd scripts && node whatsapp-server.js');
    }
}

cleanupDefaultInstance();
