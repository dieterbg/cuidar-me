'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// O middleware encaminha os perfis com acesso ao painel ou ao portal.
export default function DashboardPage() {
    const { signOut } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle>Acesso pendente</CardTitle>
                    <CardDescription>
                        Sua conta ainda não tem acesso ao painel ou ao portal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Se você acabou de se cadastrar, aguarde a aprovação da clínica.
                        Se já tinha acesso ou está aguardando há mais de 24 horas, entre em contato com o suporte.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={signOut} className="w-full">
                        Sair
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
