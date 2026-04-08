'use client';

import { useState, FormEvent, useEffect, FC, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Building2, User, Phone } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    const { signIn, signInWithGoogle } = useAuth();

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

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full text-sm font-medium rounded-xl border-2 hover:bg-[#4285F4]/5 hover:border-[#4285F4]/30 transition-all flex items-center justify-center gap-2 group"
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
            </div>
        </form>
    );
};

const RegisterForm: FC<{ userType: 'staff' | 'patient' }> = ({ userType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signUp, signInWithGoogle } = useAuth();

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();

        setIsPending(true);
        try {
            const roleToAssign = userType === 'patient' ? 'paciente' : 'pendente';

            await signUp(email.toLowerCase().trim(), password, {
                displayName: name.trim(),
                role: roleToAssign,
                phone: whatsapp.replace(/\D/g, ''), // Armazena só dígitos
            });

        } catch (error: any) {
            handleAuthError(error, toast);
        } finally {
            setIsPending(false);
        }
    };

    // Máscara simples de telefone
    const handleWhatsappChange = (value: string) => {
        let v = value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
        setWhatsapp(v);
    };

    return (
        <form onSubmit={handleRegister} className="space-y-4 pt-4">
            {/* Campos extras apenas para pacientes */}
            {userType === 'patient' && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="register-name">Nome Completo</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="register-name"
                                type="text"
                                placeholder="Seu nome completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isPending}
                                className="pl-9 h-12 bg-white/50"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="register-whatsapp">WhatsApp</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="register-whatsapp"
                                type="tel"
                                placeholder="(11) 99999-9999"
                                value={whatsapp}
                                onChange={(e) => handleWhatsappChange(e.target.value)}
                                required
                                disabled={isPending}
                                className="pl-9 h-12 bg-white/50"
                            />
                        </div>
                    </div>
                </>
            )}
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
            {userType === 'patient' && (
                <p className="text-xs text-muted-foreground text-center">
                    Sem app para baixar. O Cuidar.me funciona direto no seu WhatsApp.
                </p>
            )}
            <Button type="submit" className="w-full h-12 text-base rounded-xl bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 transition-all hover:-translate-y-0.5" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Começar Minha Jornada'}
            </Button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full text-sm font-medium rounded-xl border-2 hover:bg-[#4285F4]/5 hover:border-[#4285F4]/30 transition-all flex items-center justify-center gap-2 group"
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
            </div>
        </form>
    );
};

function RootPageContent() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
            console.log('Capture-invite: Found token in URL:', inviteToken);
            sessionStorage.setItem('pendingInvite', inviteToken);
        }
    }, [searchParams]);

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
                        Sua saúde acompanhada todos os dias — direto no seu WhatsApp.
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
                        Receba check-ins do seu médico, registre seus hábitos em 30 segundos e nunca mais se sinta sozinho entre as consultas.
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
                        <p>Programa exclusivo da Clínica Dornelles</p>
                    </div>
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#899d5e]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#899d5e]/5 rounded-full blur-3xl" />
            </div>

            {/* Right Side - Auth Forms */}
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
                    <Card className="w-full border-none shadow-none lg:shadow-2xl lg:shadow-[#899d5e]/5 lg:border bg-white rounded-3xl">
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
                            <CardTitle className="text-2xl font-bold text-[#899d5e]">Bem-vindo ao Cuidar.me</CardTitle>
                            <CardDescription>
                                Acesse sua conta ou crie uma para começar seu acompanhamento de saúde.
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
                                    <RegisterForm userType="patient" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                        {/* Link para profissionais */}
                        <p className="text-center text-sm text-muted-foreground">
                            É profissional de saúde?{' '}
                            <Link href="/profissional" className="font-medium text-[#899d5e] hover:underline underline-offset-4">
                                Acesse o painel da clínica
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RootPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-[#899d5e]" />
            </div>
        }>
            <RootPageContent />
        </Suspense>
    );
}
