'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Phone, Moon, Sun, CheckCircle2 } from 'lucide-react';
import { useMySQL } from '@/lib/mysql-provider';
import { useToast } from '@/hooks/use-toast';
import { mysqlApi } from '@/lib/mysql-api-client';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { refreshUser } = useMySQL();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Formatar WhatsApp enquanto digita
  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (55) 99 99999-9999
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 9) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 4)} ${numbers.slice(4)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 4)} ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
    }
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!name || !email || !whatsapp || !password || !confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    // Validar WhatsApp (mínimo 10 dígitos sem formatação)
    const whatsappNumbers = whatsapp.replace(/\D/g, '');
    if (whatsappNumbers.length < 10) {
      toast({
        title: 'Erro',
        description: 'WhatsApp inválido. Digite um número completo com DDD',
        variant: 'destructive',
      });
      return;
    }

    // Validação de senha forte
    if (password.length < 8) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve ter no mínimo 8 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se tem pelo menos uma letra e um número
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve conter letras e números',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Remover formatação do WhatsApp antes de enviar
      const whatsappNumbers = whatsapp.replace(/\D/g, '');
      
      // Registrar via API usando o cliente compartilhado (salva token imediatamente)
      await mysqlApi.register(email, password, name, whatsappNumbers);

      toast({
        title: 'Sucesso!',
        description: 'Conta criada com sucesso. Fazendo login...',
      });

      // Atualizar usuário no contexto
      await refreshUser();
      router.push('/dashboard');

    } catch (error) {
      console.error('Register error:', error);
      toast({
        title: 'Erro ao criar conta',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Theme Toggle */}
      <div className="flex justify-end">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <Card className="border-2 shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center space-y-4 pb-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-4 shadow-lg">
                <Image
                  src="/logo-icon.png"
                  alt="UltraGestor"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Criar Conta
              </CardTitle>
              <CardDescription className="text-base">
                Comece seu teste grátis de 3 dias agora
              </CardDescription>
            </div>

            {/* Trial Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                3 dias grátis • Sem cartão de crédito
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome
              </Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Seu nome" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-11"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium">
                WhatsApp <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="whatsapp" 
                  type="tel" 
                  placeholder="(00) 00 00000-0000" 
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  disabled={isLoading}
                  className="pl-10 h-11"
                  maxLength={19}
                  required 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite com DDD. Ex: (11) 99999-9999
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11"
                required 
              />
              <p className="text-xs text-muted-foreground">
                Deve conter letras e números
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Senha
              </Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-11"
                required 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-base font-semibold" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta Grátis'
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link 
                href="/login" 
                className="text-primary hover:underline font-semibold"
              >
                Fazer login
              </Link>
            </div>

            <Link 
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para home
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
