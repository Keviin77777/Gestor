<?php
/**
 * Teste Rápido de Configuração de Email
 */

echo "<h1>🧪 Teste de Configuração de Email</h1>";
echo "<hr>";

// Carregar .env
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

echo "<h2>1. Verificando Configurações</h2>";

$configs = [
    'MAIL_USE_SMTP' => getenv('MAIL_USE_SMTP'),
    'MAIL_HOST' => getenv('MAIL_HOST'),
    'MAIL_PORT' => getenv('MAIL_PORT'),
    'MAIL_USERNAME' => getenv('MAIL_USERNAME'),
    'MAIL_PASSWORD' => getenv('MAIL_PASSWORD') ? '***' . substr(getenv('MAIL_PASSWORD'), -4) : 'NÃO CONFIGURADO',
    'MAIL_ENCRYPTION' => getenv('MAIL_ENCRYPTION'),
    'MAIL_FROM_ADDRESS' => getenv('MAIL_FROM_ADDRESS'),
    'MAIL_FROM_NAME' => getenv('MAIL_FROM_NAME'),
];

echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
echo "<tr><th>Variável</th><th>Valor</th><th>Status</th></tr>";

foreach ($configs as $key => $value) {
    $status = $value ? '✅' : '❌';
    $color = $value ? '#e8f5e9' : '#ffebee';
    echo "<tr style='background: $color;'>";
    echo "<td><strong>$key</strong></td>";
    echo "<td>$value</td>";
    echo "<td>$status</td>";
    echo "</tr>";
}

echo "</table>";

echo "<hr>";
echo "<h2>2. Verificando PHPMailer</h2>";

$phpMailerPath = __DIR__ . '/vendor/autoload.php';

if (file_exists($phpMailerPath)) {
    echo "<p style='color: green;'>✅ PHPMailer instalado</p>";
    echo "<p><code>$phpMailerPath</code></p>";
} else {
    echo "<p style='color: red;'>❌ PHPMailer NÃO instalado</p>";
    echo "<p>Execute: <code>composer require phpmailer/phpmailer</code></p>";
    exit;
}

echo "<hr>";
echo "<h2>3. Testando Envio de Email</h2>";

// Pedir email para teste
$testEmail = $_GET['email'] ?? '';

if (!$testEmail) {
    echo "<form method='GET'>";
    echo "<p>Digite seu email para receber um email de teste:</p>";
    echo "<input type='email' name='email' placeholder='seu@email.com' required style='padding: 10px; width: 300px;'>";
    echo "<button type='submit' style='padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;'>Enviar Email de Teste</button>";
    echo "</form>";
} else {
    require_once __DIR__ . '/api/lib/email-sender.php';
    
    echo "<p>Enviando email de teste para: <strong>$testEmail</strong></p>";
    
    try {
        $emailSender = new EmailSender();
        $sent = $emailSender->sendPasswordResetEmail(
            $testEmail,
            'Teste',
            'token-fake-' . bin2hex(random_bytes(16)),
            60
        );
        
        if ($sent) {
            echo "<div style='background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0;'>";
            echo "<h3 style='color: #2e7d32; margin: 0 0 10px 0;'>✅ Email Enviado com Sucesso!</h3>";
            echo "<p>Verifique sua caixa de entrada e pasta de spam.</p>";
            echo "<p><em>Se não receber, verifique as configurações acima.</em></p>";
            echo "</div>";
        } else {
            echo "<div style='background: #ffebee; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0;'>";
            echo "<h3 style='color: #c62828; margin: 0 0 10px 0;'>❌ Falha ao Enviar Email</h3>";
            echo "<p>Verifique:</p>";
            echo "<ul>";
            echo "<li>Credenciais SMTP no .env</li>";
            echo "<li>Porta e encryption corretos</li>";
            echo "<li>Firewall não está bloqueando</li>";
            echo "</ul>";
            echo "</div>";
        }
    } catch (Exception $e) {
        echo "<div style='background: #ffebee; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0;'>";
        echo "<h3 style='color: #c62828;'>❌ Erro:</h3>";
        echo "<p>" . $e->getMessage() . "</p>";
        echo "</div>";
    }
    
    echo "<p><a href='?'>← Testar outro email</a></p>";
}

echo "<hr>";
echo "<h2>4. Próximos Passos</h2>";

if (!getenv('MAIL_USE_SMTP') || getenv('MAIL_USE_SMTP') !== 'true') {
    echo "<div style='background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0;'>";
    echo "<h3>⚠️ SMTP não está ativado</h3>";
    echo "<p>Configure as variáveis no arquivo <code>.env</code>:</p>";
    echo "<pre style='background: #f5f5f5; padding: 15px; border-radius: 4px;'>";
    echo "MAIL_USE_SMTP=true\n";
    echo "MAIL_HOST=smtp.gmail.com\n";
    echo "MAIL_PORT=587\n";
    echo "MAIL_USERNAME=seu-email@gmail.com\n";
    echo "MAIL_PASSWORD=sua-senha-de-app\n";
    echo "MAIL_ENCRYPTION=tls\n";
    echo "MAIL_FROM_ADDRESS=noreply@seudominio.com\n";
    echo "MAIL_FROM_NAME=UltraGestor";
    echo "</pre>";
    echo "<p>📖 Veja o guia completo: <code>CONFIGURAR_EMAIL_PRODUCAO.md</code></p>";
    echo "</div>";
}

?>

<style>
    body {
        font-family: Arial, sans-serif;
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
    }
    h1, h2, h3 {
        color: #333;
    }
    table {
        background: white;
        width: 100%;
    }
    th {
        background: #3b82f6;
        color: white;
        text-align: left;
    }
    code {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
    }
    pre {
        overflow-x: auto;
    }
</style>
