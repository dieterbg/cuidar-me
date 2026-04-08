'use client';

import { useState, FormEvent, useEffect, FC, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, LayoutDashboard, Users, ClipboardList, TrendingUp } from 'lucide-react';
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
            description = "Confirme seu email antes de fazer login.";
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

const StaffLoginForm: FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signIn, signInWithGoogle, signInWithLinkedIn } = useAuth();

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
                <Label htmlFor="login-email">Email profissional</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="voce@clinica.com.br"
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
            <Button
                type="submit"
                className="w-full h-12 text-base rounded-xl bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 transition-all hover:-translate-y-0.5"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Acessar Painel'}
            </Button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#4285F4]/5 hover:border-[#4285F4]/30 transition-all flex items-center justify-center gap-2 group"
                    onClick={() => signInWithGoogle()}
                    disabled={isPending}
                >
                    <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#0077B5]/5 hover:border-[#0077B5]/30 transition-all flex items-center justify-center gap-2 group"
                    onClick={() => signInWithLinkedIn()}
                    disabled={isPending}
                >
                    <svg className="h-5 w-5 fill-[#0077B5] transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                </Button>
            </div>
        </form>
    );
};

const StaffRegisterForm: FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signUp, signInWithGoogle, signInWithLinkedIn } = useAuth();

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            await signUp(email.toLowerCase().trim(), password, {
                displayName: '',
                role: 'pendente', // Aguarda aprovação do admin
            });
            toast({
                title: "Solicitação enviada",
                description: "Um administrador irá aprovar seu acesso em breve.",
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
                <Label htmlFor="register-email">Email profissional</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="voce@clinica.com.br"
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
            <p className="text-xs text-muted-foreground text-center">
                O acesso ao painel requer aprovação do administrador da clínica.
            </p>
            <Button
                type="submit"
                className="w-full h-12 text-base rounded-xl bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 transition-all hover:-translate-y-0.5"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Solicitar Acesso'}
            </Button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#4285F4]/5 hover:border-[#4285F4]/30 transition-all flex items-center justify-center gap-2 group"
                    onClick={() => signInWithGoogle()}
                    disabled={isPending}
                >
                    <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#0077B5]/5 hover:border-[#0077B5]/30 transition-all flex items-center justify-center gap-2 group"
                    onClick={() => signInWithLinkedIn()}
                    disabled={isPending}
                >
                    <svg className="h-5 w-5 fill-[#0077B5] transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                </Button>
            </div>
        </form>
    );
};

const features = [
    { icon: LayoutDashboard, label: 'Painel unificado', desc: 'Todos os pacientes em uma visão só' },
    { icon: Users, label: 'Gestão de pacientes', desc: 'Histórico, planos e protocolos' },
    { icon: ClipboardList, label: 'Protocolos clínicos', desc: 'Programas de 90 dias estruturados' },
    { icon: TrendingUp, label: 'Métricas de engajamento', desc: 'Aderência e progresso em tempo real' },
];

function ProfissionalPageContent() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && profile) {
            if (profile.role === 'paciente') {
                router.replace('/portal/welcome');
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
            {/* Left Side — Clinic Branding */}
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
                        Gerencie seus pacientes com inteligência clínica.
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
                        Acompanhe protocolos, engajamento e resultados de toda a sua base — em tempo real, sem planilhas.
                    </p>
                </div>

                <div className="relative z-10 mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
                    {features.map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-white/60 border border-[#899d5e]/10 text-left">
                            <div className="p-2 rounded-xl bg-[#899d5e]/10">
                                <Icon className="h-4 w-4 text-[#899d5e]" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#899d5e]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#899d5e]/5 rounded-full blur-3xl" />
            </div>

            {/* Right Side — Auth Forms */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="flex justify-end p-4 lg:p-6">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#899d5e]/20 bg-[#FAFBF7] hover:bg-[#899d5e] hover:border-[#899d5e] transition-all duration-300 hover:shadow-lg hover:shadow-[#899d5e]/20"
                    >
                        <Image
                            src="/logo-clinica.png"
                            alt="Clínica Dornelles"
                            width={28}
                            height={28}
                            className="rounded-full border border-[#899d5e]/20 group-hover:border-white/40 transition-colors"
                        />
                        <span className="text-sm font-medium text-[#2D3B2D] group-hover:text-white transition-colors">
                            Clínica Dornelles
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#899d5e]/50 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 lg:p-8 lg:pt-0">
                    <div className="w-full max-w-md space-y-6">
                        <Card className="border-none shadow-none lg:shadow-2xl lg:shadow-[#899d5e]/5 lg:border bg-white rounded-3xl">
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
                                <CardTitle className="text-2xl font-bold text-[#899d5e]">Acesso para Profissionais</CardTitle>
                                <CardDescription>
                                    Entre com sua conta da clínica ou solicite acesso ao administrador.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="login" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted/30 p-1">
                                        <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm h-full">Entrar</TabsTrigger>
                                        <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#899d5e] data-[state=active]:shadow-sm h-full">Solicitar Acesso</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="login" className="mt-0">
                                        <StaffLoginForm />
                                    </TabsContent>
                                    <TabsContent value="register" className="mt-0">
                                        <StaffRegisterForm />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Link para pacientes */}
                        <p className="text-center text-sm text-muted-foreground">
                            É paciente?{' '}
                            <Link href="/paciente" className="font-medium text-[#899d5e] hover:underline underline-offset-4">
                                Acesse sua área aqui
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProfissionalPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#899d5e]" />
            </div>
        }>
            <ProfissionalPageContent />
        </Suspense>
    );
}
