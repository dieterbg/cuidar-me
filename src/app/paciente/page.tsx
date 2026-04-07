'use client';

import { useState, FormEvent, useEffect, FC } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Building2, User, Phone } from 'lucide-react';
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
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { signUp } = useAuth();

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
                </div>
            </div>
        </div>
    );
}
