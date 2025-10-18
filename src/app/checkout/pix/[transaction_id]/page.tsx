'use client';

// Página pública - não precisa de autenticação

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, QrCode as QrCodeIcon } from 'lucide-react';
import QRCode from 'qrcode';
import Image from 'next/image';

interface Transaction {
  id: string;
  invoice_number: string;
  final_value: number;
  amount?: number;
  description: string;
  due_date: string;
  client_name: string;
  pix_code: string;
  qr_code: string | null;
  pix_holder_name: string;
  pix_key_type: string;
  status: string;
  method_type: string;
}

export default function PixCheckoutPage() {
  const params = useParams();
  const transaction_id = params.transaction_id as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string>('');

  useEffect(() => {
    fetchTransaction();
    
    // Polling a cada 5 segundos para verificar status
    const interval = setInterval(() => {
      fetchTransaction();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [transaction_id]);

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`/api/payment-checkout/${transaction_id}`);
      
      if (!response.ok) {
        throw new Error('Transação não encontrada');
      }

      const data = await response.json();
      
      // Detectar mudança de status para aprovado
      if (previousStatus && previousStatus === 'pending' && (data.status === 'paid' || data.status === 'approved')) {
        setShowSuccess(true);
        // Confetes!
        setTimeout(() => {
          // Aqui você pode adicionar uma biblioteca de confetes se quiser
        }, 100);
      }
      
      setPreviousStatus(data.status);
      setTransaction(data);

      // Usar QR Code do banco se disponível, senão gerar
      if (data.qr_code) {
        // QR Code já vem em base64 do Mercado Pago
        setQrCodeUrl(`data:image/png;base64,${data.qr_code}`);
      } else if (data.pix_code) {
        // Gerar QR Code a partir do código PIX
        const qr = await QRCode.toDataURL(data.pix_code, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qr);
      }
    } catch (error) {
      console.error('Erro ao carregar transação:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar transação');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixCode = () => {
    if (transaction?.pix_code) {
      navigator.clipboard.writeText(transaction.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCodeIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-700 font-semibold text-lg">Carregando pagamento...</p>
          <p className="text-slate-500 text-sm mt-1">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-4xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h3>
            <p className="text-slate-600 mb-4">
              {error || 'Transação não encontrada'}
            </p>
            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
              Verifique o link e tente novamente ou entre em contato com o suporte
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const valor = Number(transaction.final_value || transaction.amount || 0).toFixed(2).replace('.', ',');
  const isPaid = transaction.status === 'paid' || transaction.status === 'approved';

  // Tela de sucesso animada - sempre mostrar se estiver pago
  if (isPaid) {
    return (
      <div className="light">
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center animate-in fade-in zoom-in duration-500">
            {/* Emoji animado */}
            <div className="mb-8 animate-bounce">
              <span className="text-9xl">🎉</span>
            </div>
            
            {/* Mensagem principal */}
            <h1 className="text-4xl md:text-5xl font-black text-emerald-600 mb-4 animate-in slide-in-from-bottom duration-700">
              Pagamento Aprovado!
            </h1>
            
            <p className="text-xl text-slate-700 mb-8 animate-in slide-in-from-bottom duration-700 delay-100">
              Obrigado, <strong>{transaction.client_name}</strong>!
            </p>
            
            {/* Card de informações */}
            <Card className="border-2 border-emerald-200 bg-white shadow-2xl animate-in slide-in-from-bottom duration-700 delay-200">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-emerald-600 mb-6">
                    <Check className="w-16 h-16" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-slate-600">Valor pago</p>
                    <p className="text-4xl font-black text-emerald-600">R$ {valor}</p>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-200 space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Fatura:</span>
                      <span className="font-semibold">#{transaction.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data:</span>
                      <span className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-emerald-800 text-center">
                        ✅ Seu acesso foi renovado automaticamente!<br/>
                        📱 Você receberá uma confirmação via WhatsApp
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.location.href = '/'}
                    className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
                  >
                    Voltar para o início
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Mensagem adicional */}
            <p className="mt-8 text-slate-500 text-sm animate-in fade-in duration-700 delay-300">
              Obrigado por escolher nossos serviços! 💚
            </p>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="light">
      <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Simples */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <QrCodeIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pagamento via PIX</h1>
          <p className="text-slate-600">Escaneie o QR Code ou copie o código para pagar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - QR Code */}
          <div className="space-y-4">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                {qrCodeUrl && (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
                      <Image 
                        src={qrCodeUrl} 
                        alt="QR Code PIX" 
                        width={280} 
                        height={280}
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Aponte a câmera do seu celular para o QR Code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Informações */}
          <div className="space-y-4">

            {/* Informações da Fatura */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Fatura</span>
                  <span className="font-bold text-gray-900">#{transaction.invoice_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Cliente</span>
                  <span className="font-semibold text-gray-900">{transaction.client_name}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Vencimento</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900">Valor Total</span>
                  <span className="text-3xl font-black text-emerald-600">
                    R$ {valor}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Código PIX */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6 space-y-3">
                <label className="text-sm font-bold text-gray-900 block">
                  Código PIX (Copia e Cola)
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="font-mono text-xs break-all text-gray-700 leading-relaxed">{transaction.pix_code}</p>
                </div>
                <Button
                  size="lg"
                  onClick={copyPixCode}
                  className={`w-full ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Código Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copiar Código PIX
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instruções e Avisos - Full Width */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Instruções de Pagamento */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
                <span>📱</span>
                Como pagar
              </h3>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Abra o app do seu banco</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Escolha <strong>Pagar com PIX</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Escaneie o QR Code ou cole o código</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Confirme o valor de <strong className="text-emerald-600">R$ {valor}</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>Finalize o pagamento</span>
                </li>
              </ol>
            </CardContent>
          </Card>

            {/* Status */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  <Badge 
                    className={`text-sm px-6 py-2 font-semibold ${
                      transaction.status === 'pending' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : (transaction.status === 'paid' || transaction.status === 'approved')
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {transaction.status === 'pending' && '⏳ Aguardando Pagamento'}
                    {(transaction.status === 'paid' || transaction.status === 'approved') && '✅ Pago'}
                    {transaction.status === 'cancelled' && '❌ Cancelado'}
                  </Badge>                </div>
              </CardContent>
            </Card>

          {/* Avisos */}
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 text-amber-800 flex items-center gap-2">
                <span>⚠️</span>
                Importante
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold text-lg">✓</span>
                  <span>O pagamento é processado <strong>instantaneamente</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold text-lg">✓</span>
                  <span>Após o pagamento, você receberá a confirmação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold text-lg">⏰</span>
                  <span>Este código PIX expira em <strong>24 horas</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold text-lg">💬</span>
                  <span>Em caso de dúvidas, entre em contato com o suporte</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <span className="text-xl">🔒</span>
            <span className="text-sm font-medium">
              Pagamento seguro via PIX
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
