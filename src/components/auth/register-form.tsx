'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useMySQL } from '@/lib/mysql-provider';
import { useToast } from '@/hooks/use-toast';
import { mysqlApi } from '@/lib/mysql-api-client';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useMySQL();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!name || !email || !password || !confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 8 caracteres',
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
      // Registrar via API usando o cliente compartilhado (salva token imediatamente)
      await mysqlApi.register(email, password, name);

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
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className="bg-primary p-2 rounded-lg">
              <FileText className="text-primary-foreground size-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para criar sua conta de revenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Seu nome completo" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Fazer login
            </Link>
          </div>

          <Link 
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
