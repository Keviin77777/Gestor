'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Moon, Sun, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        setMounted(true);
        validateToken();
    }, []);

    const validateToken = async () => {
        if (!token) {
            setValidating(false);
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/password-reset?token=${token}`);
            const data = await response.json();

            if (response.ok) {
                setTokenValid(true);
                setUserEmail(data.email);
            } else {
                toast({
                    title: 'Token inválido',
                    description: data.error || 'Este link expirou ou já foi utilizado',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            toast({
                title: 'Senha fraca',
                description: 'A senha deve ter no mínimo 8 caracteres',
                variant: 'destructive',
            });
            return;
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
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
            const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/password-reset`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                toast({
                    title: 'Sucesso!',
                    description: 'Senha redefinida com sucesso',
                });
                setTimeout(() => router.push('/login'), 3000);
            } else {
                throw new Error(data.error || 'Erro ao redefinir senha');
            }
        } catch (error) {
            console.error('Reset error:', error);
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao redefinir senha',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="w-full max-w-md mx-auto">
                <Card className="border-2 shadow-xl">
                    <CardContent className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!token || !tokenValid) {
        return (
            <div className="w-full max-w-md mx-auto">
                <Card className="border-2 shadow-xl">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Link Inválido</CardTitle>
                        <CardDescription>Este link expirou ou já foi utilizado</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-4">
                        <Link href="/forgot-password" className="w-full">
                            <Button className="w-full">Solicitar Novo Link</Button>
                        </Link>
                        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para login
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="w-full max-w-md mx-auto">
                <Card className="border-2 shadow-xl">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Senha Redefinida!</CardTitle>
                        <CardDescription>Redirecionando para login...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            <div className="flex justify-end">
                {mounted && (
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg hover:bg-accent/10">
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                )}
            </div>

            <Card className="border-2 shadow-xl">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center space-y-4 pb-8">
                        <div className="flex justify-center">
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-4 shadow-lg">
                                <Image src="/logo-icon.png" alt="UltraGestor" fill className="object-contain p-2" priority />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Nova Senha
                            </CardTitle>
                            <CardDescription className="text-base">
                                Digite sua nova senha para {userEmail}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-11" required />
                            <p className="text-xs text-muted-foreground">Deve conter letras e números</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <Input id="confirmPassword" type="password" placeholder="Digite novamente" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-11" required />
                        </div>

                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Redefinindo...</> : 'Redefinir Senha'}
                        </Button>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para login
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
