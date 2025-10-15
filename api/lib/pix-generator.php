<?php
/**
 * PIX BR Code Generator
 * Gera código PIX copia e cola no padrão do Banco Central
 */

class PixGenerator {
    
    /**
     * Gera código PIX copia e cola (BR Code)
     * 
     * @param string $pixKey Chave PIX (CPF, CNPJ, email, telefone ou aleatória)
     * @param string $description Descrição do pagamento
     * @param string $merchantName Nome do beneficiário
     * @param string $merchantCity Cidade do beneficiário
     * @param float $amount Valor (opcional, se não informado gera PIX sem valor fixo)
     * @param string $txid ID da transação (opcional)
     * @return string Código PIX copia e cola
     */
    public static function generate($pixKey, $description, $merchantName, $merchantCity = 'SAO PAULO', $amount = null, $txid = null) {
        // Payload do PIX
        $payload = self::buildPayload($pixKey, $description, $merchantName, $merchantCity, $amount, $txid);
        
        // Adicionar CRC16
        $payload .= self::getCRC16($payload);
        
        return $payload;
    }
    
    /**
     * Constrói o payload do PIX
     */
    private static function buildPayload($pixKey, $description, $merchantName, $merchantCity, $amount, $txid) {
        $payload = '';
        
        // 00: Payload Format Indicator
        $payload .= self::buildTLV('00', '01');
        
        // 01: Point of Initiation Method (12 = QR Code estático, 11 = dinâmico)
        $payload .= self::buildTLV('01', $amount ? '12' : '11');
        
        // 26: Merchant Account Information
        $merchantAccount = '';
        $merchantAccount .= self::buildTLV('00', 'BR.GOV.BCB.PIX'); // GUI
        $merchantAccount .= self::buildTLV('01', $pixKey); // Chave PIX
        
        if ($description) {
            $merchantAccount .= self::buildTLV('02', $description); // Descrição
        }
        
        $payload .= self::buildTLV('26', $merchantAccount);
        
        // 52: Merchant Category Code
        $payload .= self::buildTLV('52', '0000');
        
        // 53: Transaction Currency (986 = BRL)
        $payload .= self::buildTLV('53', '986');
        
        // 54: Transaction Amount (opcional)
        if ($amount && $amount > 0) {
            $payload .= self::buildTLV('54', number_format($amount, 2, '.', ''));
        }
        
        // 58: Country Code
        $payload .= self::buildTLV('58', 'BR');
        
        // 59: Merchant Name
        $payload .= self::buildTLV('59', self::sanitizeString($merchantName));
        
        // 60: Merchant City
        $payload .= self::buildTLV('60', self::sanitizeString($merchantCity));
        
        // 62: Additional Data Field Template
        if ($txid) {
            $additionalData = self::buildTLV('05', substr($txid, 0, 25)); // Transaction ID
            $payload .= self::buildTLV('62', $additionalData);
        }
        
        // 63: CRC16 (será adicionado depois)
        $payload .= '6304';
        
        return $payload;
    }
    
    /**
     * Constrói um campo TLV (Tag-Length-Value)
     */
    private static function buildTLV($tag, $value) {
        $length = strlen($value);
        return $tag . str_pad($length, 2, '0', STR_PAD_LEFT) . $value;
    }
    
    /**
     * Calcula CRC16 CCITT
     */
    private static function getCRC16($payload) {
        $polynomial = 0x1021;
        $crc = 0xFFFF;
        
        $length = strlen($payload);
        for ($i = 0; $i < $length; $i++) {
            $crc ^= (ord($payload[$i]) << 8);
            
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = ($crc << 1) ^ $polynomial;
                } else {
                    $crc = $crc << 1;
                }
            }
        }
        
        $crc = $crc & 0xFFFF;
        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }
    
    /**
     * Remove acentos e caracteres especiais
     */
    private static function sanitizeString($string) {
        // Converter para maiúsculas
        $string = strtoupper($string);
        
        // Remover acentos
        $string = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $string);
        
        // Remover caracteres especiais, manter apenas letras, números e espaços
        $string = preg_replace('/[^A-Z0-9 ]/', '', $string);
        
        // Limitar tamanho
        $string = substr($string, 0, 25);
        
        return $string;
    }
    
    /**
     * Valida chave PIX
     */
    public static function validatePixKey($key, $type) {
        switch ($type) {
            case 'cpf':
                $key = preg_replace('/\D/', '', $key);
                return strlen($key) === 11;
                
            case 'cnpj':
                $key = preg_replace('/\D/', '', $key);
                return strlen($key) === 14;
                
            case 'email':
                return filter_var($key, FILTER_VALIDATE_EMAIL) !== false;
                
            case 'phone':
                $key = preg_replace('/\D/', '', $key);
                return strlen($key) >= 10 && strlen($key) <= 13;
                
            case 'random':
                return strlen($key) === 32 || strlen($key) === 36; // UUID com ou sem hífens
                
            default:
                return false;
        }
    }
}
