'use client';

import { useState, FormEvent, useEffect, FC } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const handleAuthError = (error: any, toast: any) => {
    let title = "Erro na autenticação";
    let description = "Ocorreu um erro inesperado. Tente novamente.";

    if (error.message) {
        if (error.message.includes("Invalid login credentials")) {
            title = "Credenciais inválidas";
            description = "Email ou senha incorretos. Verifique e tente novamente.";
        } else if (error.message.includes("Email not confirmed")) {
            title = "Email não confirmado";
            description = "Por favor, verifique seu email para confirmar sua conta antes de fazer login.";
        } else if (error.message.includes("User already registered")) {
            title = "Email já cadastrado";
            description = "Este email já possui uma conta. Tente fazer login.";
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
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isPending}
                        className="pl-9 h-12 bg-white/50"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isPending}
                        className="pl-9 h-12 bg-white/50"
                    />
                </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base rounded-xl bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 transition-all hover:-translate-y-0.5" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar na Plataforma'}
            </Button>
        </form>
    );
};

const RegisterForm: FC<{ userType: 'staff' | 'patient' }> = ({ userType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signUp } = useAuth();

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();

        setIsPending(true);
        try {
            const roleToAssign = userType === 'patient' ? 'paciente' : 'pendente';

            await signUp(email.toLowerCase().trim(), password, {
                displayName: '', // Será preenchido na ativação
                role: roleToAssign,
                phone: '', // Será preenchido na ativação
            });

        } catch (error: any) {
            handleAuthError(error, toast);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleRegister} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isPending}
                        className="pl-9 h-12 bg-white/50"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="register-password"
                        type="password"
                        placeholder="Mínimo de 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isPending}
                        className="pl-9 h-12 bg-white/50"
                    />
                </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base rounded-xl bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 transition-all hover:-translate-y-0.5" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Conta Gratuita'}
            </Button>
        </form>
    );
};

export default function RootPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && profile) {
            if (profile.role === 'paciente') {
                router.replace('/portal/welcome');
            } else if (profile.role === 'pendente') {
                router.replace('/dashboard');
            } else {
                router.replace('/overview');
            }
        }
    }, [user, profile, loading, router]);

    if (loading || (user && profile)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#899d5e]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Side - Hero/Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#F9FAF6] relative flex-col justify-center items-center text-center p-12 overflow-hidden border-r border-[#EBECE8]">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative h-72 w-full max-w-[50rem] mb-12">
                        <Image
                            src="/logo_v2.svg"
                            alt="Cuidar.me Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground max-w-lg leading-tight">
                        Transformando o cuidado com a saúde através da tecnologia e empatia.
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
                        Acompanhamento personalizado, protocolos inteligentes e uma equipe dedicada ao seu bem-estar.
                    </p>
                </div>

                <div className="relative z-10 mt-12">
                    <div className="flex flex-col items-center gap-4 text-sm font-medium text-muted-foreground">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 w-12 rounded-full border-4 border-[#F9FAF6] bg-muted flex items-center justify-center text-xs overflow-hidden shadow-sm">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Avatar" width={48} height={48} className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <p>Junte-se a mais de 2.000 pacientes</p>
                    </div>
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#899d5e]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#899d5e]/5 rounded-full blur-3xl" />
            </div>

            {/* Right Side - Auth Forms */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-white">
                <Card className="w-full max-w-md border-none shadow-none lg:shadow-2xl lg:shadow-[#899d5e]/5 lg:border bg-white rounded-3xl">
                    <CardHeader className="text-center lg:text-left space-y-1 pb-2">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="relative h-48 w-full max-w-[20rem]">
                                <Image
                                    src="/logo_v2.svg"
                                    alt="Cuidar.me Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-[#899d5e]">Bem-vindo de volta</CardTitle>
                        <CardDescription>
                            Acesse sua conta para gerenciar sua saúde ou acompanhar seus pacientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted/30 p-1">
                                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm h-full">Entrar</TabsTrigger>
                                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm h-full">Criar Conta</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="mt-0">
                                <LoginForm />
                            </TabsContent>

                            <TabsContent value="register" className="mt-0">
                                <Tabs defaultValue="patient" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 h-10 rounded-lg p-1">
                                        <TabsTrigger value="patient" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm">Sou Paciente</TabsTrigger>
                                        <TabsTrigger value="staff" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm">Sou Profissional</TabsTrigger>
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
                <Link
                    href="/clinica"
                    className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-[#899d5e] transition-colors"
                >
                    <Building2 className="h-4 w-4" />
                    Conheça a Clínica Dornelles
                </Link>
            </div>
        </div>
    );
}
