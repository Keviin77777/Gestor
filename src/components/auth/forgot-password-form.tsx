'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Moon, Sun, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Erro',
        description: 'Por favor, digite seu email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada',
        });
      } else {
        throw new Error(data.error || 'Erro ao enviar email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
          <CardHeader className="text-center space-y-4 pb-8">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                Email Enviado!
              </CardTitle>
              <CardDescription className="text-base">
                Verifique sua caixa de entrada
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm text-center">
                Enviamos um link de recuperação para:
              </p>
              <p className="text-sm font-semibold text-center text-primary">
                {email}
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• O link expira em 60 minutos</p>
              <p>• Verifique também a pasta de spam</p>
              <p>• Se não receber, tente novamente</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <Link 
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
                Esqueceu a senha?
              </CardTitle>
              <CardDescription className="text-base">
                Digite seu email para receber instruções
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pl-10"
                  required 
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-base font-semibold" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <div className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{' '}
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
