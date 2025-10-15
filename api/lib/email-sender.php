<?php
/**
 * Email Sender Library
 * Envia emails usando PHPMailer ou função mail() nativa
 */

class EmailSender {
    private $fromEmail;
    private $fromName;
    private $useSMTP;
    
    public function __construct() {
        $this->fromEmail = getenv('MAIL_FROM_ADDRESS') ?: 'noreply@ultragestor.com';
        $this->fromName = getenv('MAIL_FROM_NAME') ?: 'UltraGestor';
        $this->useSMTP = getenv('MAIL_USE_SMTP') === 'true';
    }
    
    /**
     * Enviar email de recuperação de senha
     */
    public function sendPasswordResetEmail($toEmail, $toName, $resetToken, $expiresIn = 60) {
        $frontendUrl = getenv('FRONTEND_URL') ?: 'http://localhost:9002';
        $resetLink = "$frontendUrl/reset-password?token=$resetToken";
        
        $subject = 'Recuperação de Senha - UltraGestor';
        
        $htmlBody = $this->getPasswordResetTemplate($toName, $resetLink, $expiresIn);
        $textBody = $this->getPasswordResetTextTemplate($toName, $resetLink, $expiresIn);
        
        return $this->send($toEmail, $toName, $subject, $htmlBody, $textBody);
    }
    
    /**
     * Enviar email genérico
     */
    public function send($toEmail, $toName, $subject, $htmlBody, $textBody = null) {
        if ($this->useSMTP) {
            return $this->sendViaSMTP($toEmail, $toName, $subject, $htmlBody, $textBody);
        } else {
            return $this->sendViaMail($toEmail, $toName, $subject, $htmlBody, $textBody);
        }
    }
    
    /**
     * Enviar via função mail() nativa do PHP
     */
    private function sendViaMail($toEmail, $toName, $subject, $htmlBody, $textBody) {
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            "From: {$this->fromName} <{$this->fromEmail}>",
            "Reply-To: {$this->fromEmail}",
            'X-Mailer: PHP/' . phpversion()
        ];
        
        $success = mail(
            $toEmail,
            $subject,
            $htmlBody,
            implode("\r\n", $headers)
        );
        
        if ($success) {
            error_log("Email enviado com sucesso para: $toEmail");
        } else {
            error_log("Falha ao enviar email para: $toEmail");
        }
        
        return $success;
    }
    
    /**
     * Enviar via SMTP usando PHPMailer
     */
    private function sendViaSMTP($toEmail, $toName, $subject, $htmlBody, $textBody) {
        // Verificar se PHPMailer está disponível
        $phpMailerPath = __DIR__ . '/../../vendor/autoload.php';
        
        if (!file_exists($phpMailerPath)) {
            error_log("PHPMailer não encontrado, usando mail() nativo");
            return $this->sendViaMail($toEmail, $toName, $subject, $htmlBody, $textBody);
        }
        
        require_once $phpMailerPath;
        
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // Configurações do servidor SMTP
            $mail->isSMTP();
            $mail->Host = getenv('MAIL_HOST') ?: 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME');
            $mail->Password = getenv('MAIL_PASSWORD');
            $mail->SMTPSecure = getenv('MAIL_ENCRYPTION') ?: PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = getenv('MAIL_PORT') ?: 587;
            $mail->CharSet = 'UTF-8';
            
            // Remetente
            $mail->setFrom($this->fromEmail, $this->fromName);
            
            // Destinatário
            $mail->addAddress($toEmail, $toName);
            
            // Conteúdo
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $textBody ?: strip_tags($htmlBody);
            
            $mail->send();
            error_log("Email SMTP enviado com sucesso para: $toEmail");
            return true;
            
        } catch (Exception $e) {
            error_log("Erro ao enviar email via SMTP: {$mail->ErrorInfo}");
            return false;
        }
    }
    
    /**
     * Template HTML para recuperação de senha
     */
    private function getPasswordResetTemplate($name, $resetLink, $expiresIn) {
        return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">UltraGestor</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Olá, {$name}!</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Recebemos uma solicitação para redefinir a senha da sua conta no UltraGestor.
                            </p>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Clique no botão abaixo para criar uma nova senha:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{$resetLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                                            Redefinir Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                <strong>Este link expira em {$expiresIn} minutos.</strong>
                            </p>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                            </p>
                            
                            <!-- Link alternativo -->
                            <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0;">
                                    Se o botão não funcionar, copie e cole este link no seu navegador:
                                </p>
                                <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
                                    {$resetLink}
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                © 2025 UltraGestor. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    /**
     * Template de texto simples para recuperação de senha
     */
    private function getPasswordResetTextTemplate($name, $resetLink, $expiresIn) {
        return <<<TEXT
Olá, {$name}!

Recebemos uma solicitação para redefinir a senha da sua conta no UltraGestor.

Para criar uma nova senha, acesse o link abaixo:
{$resetLink}

Este link expira em {$expiresIn} minutos.

Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.

---
© 2025 UltraGestor. Todos os direitos reservados.
TEXT;
    }
}
