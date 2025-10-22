const axios = require('axios');
const readline = require('readline');

const PROXY_URL = 'http://localhost:3002';
const instanceName = 'reseller_1552';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function sendTestMessage() {
    console.log('📱 Teste de Envio de Mensagem\n');

    rl.question('Digite o número com DDD (ex: 11987654321): ', async (phoneInput) => {
        try {
            // Formatar número: adicionar 55 se não tiver
            let phone = phoneInput.replace(/\D/g, ''); // Remove tudo que não é número

            if (!phone.startsWith('55')) {
                phone = '55' + phone;
            }

            console.log('\n📤 Enviando mensagem para:', phone);
            console.log('');

            const message = '🧪 Mensagem de teste do GestPlay!\n\nSe você recebeu esta mensagem, a integração está funcionando perfeitamente! ✅';

            const response = await axios.post(
                `${PROXY_URL}/message/sendText/${instanceName}`,
                {
                    number: phone,
                    text: message
                }
            );

            console.log('✅ Mensagem enviada com sucesso!');
            console.log('');
            console.log('Resposta:', JSON.stringify(response.data, null, 2));
            console.log('');
            console.log('🎉 Verifique o WhatsApp do destinatário!');

        } catch (error) {
            console.error('\n❌ Erro ao enviar mensagem:');
            console.error('Status:', error.response?.status);
            console.error('Erro:', error.response?.data);
            console.log('');

            if (error.response?.status === 400) {
                console.log('💡 Dicas:');
                console.log('1. Verifique se o número está correto');
                console.log('2. O número deve estar no formato: 5511987654321');
                console.log('3. Certifique-se que o WhatsApp está conectado');
                console.log('4. O número precisa ter WhatsApp ativo');
            }
        }

        rl.close();
    });
}

// Verificar se está conectado primeiro
async function checkConnection() {
    try {
        const response = await axios.get(`${PROXY_URL}/instance/connectionState/${instanceName}`);
        const state = response.data.instance?.state || response.data.state;

        if (state !== 'open') {
            console.log('❌ WhatsApp não está conectado!');
            console.log('');
            console.log('Status atual:', state);
            console.log('');
            console.log('Conecte o WhatsApp primeiro:');
            console.log('1. Acesse o frontend');
            console.log('2. Vá em WhatsApp');
            console.log('3. Clique em "Conectar WhatsApp"');
            console.log('4. Escaneie o QR Code');
            process.exit(1);
        }

        console.log('✅ WhatsApp conectado!\n');
        sendTestMessage();

    } catch (error) {
        console.error('❌ Erro ao verificar conexão:', error.message);
        process.exit(1);
    }
}

checkConnection();
