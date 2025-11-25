
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Esta página atua como um roteador central após o login.
 * Ela é invisível para o usuário e sua única função é redirecionar
 * para a tela correta com base no perfil do usuário, ou exibir uma
 * tela de espera para usuários pendentes.
 */
export default function DashboardPage() {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;

        if (!user || !profile) {
            router.replace('/');
            return;
        }

        // Redirecionamento baseado no perfil (não se aplica a 'pendente')
        if (profile.role === 'paciente') {
            router.replace('/portal/welcome');
        } else if (profile.role !== 'pendente') {
            // Redireciona todos os outros perfis da equipe (não pendentes) para a visão geral.
            router.replace('/overview');
        }
        // Se o perfil for 'pendente', o componente de espera será renderizado.

    }, [authLoading, user, profile, router]);

    // Se o usuário estiver pendente, mostre a tela de espera.
    if (!authLoading && profile?.role === 'pendente') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle>Cadastro em Análise</CardTitle>
                        <CardDescription>
                            Sua conta foi criada com sucesso e está aguardando a aprovação de um administrador.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Você receberá um email assim que seu acesso for liberado. Isso geralmente leva algumas horas. Agradecemos a sua paciência!
                        </p>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <p className="text-xs text-muted-foreground">
                            Se a aprovação demorar mais de 24 horas, entre em contato com o suporte da clínica.
                        </p>
                        <Button variant="outline" onClick={signOut} className="w-full">
                            Sair
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Exibe uma tela de carregamento enquanto a lógica de autenticação/redirecionamento é executada.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Redirecionando...</h1>
                <p className="text-muted-foreground">Verificando seu perfil e preparando seu dashboard.</p>
            </div>
        </div>
    );
}
