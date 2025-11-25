
"use client";

import { useState, FormEvent, FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CuidarMeLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const handleAuthError = (error: any, toast: ReturnType<typeof useToast>['toast']) => {
    let title = "Erro de autenticação";
    let description = "Ocorreu um erro inesperado.";

    // Erros do Supabase
    if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
            title = "Credenciais Inválidas";
            description = "Email ou senha incorretos. Por favor, tente novamente.";
        } else if (error.message.includes('User already registered')) {
            title = "Email já cadastrado";
            description = "Este email já possui uma conta. Tente fazer login.";
        } else if (error.message.includes('Password should be at least 6 characters')) {
            title = "Senha Fraca";
            description = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.message.includes('Email not confirmed')) {
            title = "Email não confirmado";
            description = "Por favor, confirme seu email antes de fazer login.";
        } else {
            description = error.message;
        }
    }

    console.error("Authentication Error:", error);
    toast({ variant: "destructive", title, description });
};


const LoginForm: FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signIn } = useAuth();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            await signIn(email, password);
            // O redirecionamento é tratado pelo hook useAuth e pelo useEffect da página.
        } catch (error: any) {
            handleAuthError(error, toast);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isPending} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isPending} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Aguarde...' : 'Entrar'}
            </Button>
        </form>
    );
};

const RegisterForm: FC<{ userType: 'staff' | 'patient' }> = ({ userType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signUp } = useAuth();

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/\D/g, '');
        const phoneNumberLength = phoneNumber.length;

        if (phoneNumberLength < 3) return `(${phoneNumber}`;
        if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedPhoneNumber = formatPhoneNumber(e.target.value);
        setPhone(formattedPhoneNumber);
    };

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast({ variant: 'destructive', title: 'Nome é obrigatório' });
            return;
        }

        const rawPhone = phone.replace(/\D/g, '');

        if (userType === 'patient' && (rawPhone.length < 10 || rawPhone.length > 11)) {
            toast({ variant: 'destructive', title: 'WhatsApp inválido', description: 'O número deve ter 10 ou 11 dígitos, incluindo o DDD.' });
            return;
        }

        setIsPending(true);
        try {
            const roleToAssign = userType === 'patient' ? 'paciente' : 'pendente';

            await signUp(email, password, {
                displayName: name,
                role: roleToAssign,
                phone: rawPhone,
            });

        } catch (error: any) {
            handleAuthError(error, toast);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleRegister} className="space-y-4 pt-4">
            <div className="space-y-2 pt-2">
                <Label htmlFor="register-name">Nome Completo</Label>
                <Input id="register-name" type="text" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} required disabled={isPending} />
            </div>
            {userType === 'patient' && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="register-phone">WhatsApp (com DDD)</Label>
                        <Input id="register-phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={handlePhoneChange} required disabled={isPending} maxLength={15} />
                    </div>
                </>
            )}
            <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isPending} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <Input id="register-password" type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isPending} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Criando conta...' : 'Cadastrar'}
            </Button>
        </form>
    );
}



export default function RootPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        // A lógica de redirecionamento é simples: se o usuário estiver logado e
        // o perfil dele carregado, o app deve ir para o /dashboard, que atuará como roteador.
        if (!loading && user && profile) {
            router.replace('/dashboard');
        }
    }, [user, profile, loading, router]);

    // Mostra a tela de carregamento se a autenticação estiver em progresso
    // ou se o usuário já estiver logado e o redirecionamento estiver prestes a acontecer.
    if (loading || (user && profile)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <p>Carregando...</p>
            </div>
        );
    }

    // Mostra o formulário de login/registro se não houver usuário logado e
    // a verificação de autenticação já tiver sido concluída.
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <CuidarMeLogo />
                    </div>
                    <CardTitle>Acesso à Plataforma</CardTitle>
                    <CardDescription>
                        Faça login ou crie sua conta para começar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Entrar</TabsTrigger>
                            <TabsTrigger value="register">Criar Conta</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm />
                        </TabsContent>

                        <TabsContent value="register">
                            <Tabs defaultValue="staff">
                                <TabsList className="grid w-full grid-cols-2 mt-4">
                                    <TabsTrigger value="staff">Sou da Equipe</TabsTrigger>
                                    <TabsTrigger value="patient">Sou Paciente</TabsTrigger>
                                </TabsList>
                                <TabsContent value="staff">
                                    <RegisterForm userType="staff" />
                                </TabsContent>
                                <TabsContent value="patient">
                                    <RegisterForm userType="patient" />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
