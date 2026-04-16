'use client';

import { useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

// Shared fallback spinner
const FullScreenSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

function RootPageContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture invite token from URL into sessionStorage so it survives the OAuth redirect
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      sessionStorage.setItem('pendingInvite', inviteToken);
    }
  }, [searchParams]);

  // Redirect already-authenticated users based on their role
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

  // Show spinner while loading or while redirect is in-flight
  if (loading || (user && profile)) {
    return <FullScreenSpinner />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Left Side – Hero / Branding ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-light relative flex-col justify-center items-center text-center p-12 overflow-hidden border-r border-brand-border">
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative h-72 w-full max-w-[50rem] mb-12">
            <Image src="/logo_v2.svg" alt="Cuidar.me Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground max-w-lg leading-tight">
            Sua saúde acompanhada todos os dias — direto no seu WhatsApp.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
            Receba check-ins do seu médico, registre seus hábitos em 30 segundos e nunca mais se
            sinta sozinho entre as consultas.
          </p>
        </div>

        {/* Social proof */}
        <div className="relative z-10 mt-12">
          <div className="flex flex-col items-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 w-12 rounded-full border-4 border-brand-light bg-muted flex items-center justify-center text-xs overflow-hidden shadow-sm"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                    alt="Avatar"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p>Programa exclusivo da Clínica Dornelles</p>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />
      </div>

      {/* ─── Right Side – Auth Forms ─── */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Clinic link in top-right */}
        <div className="flex justify-end p-4 lg:p-6">
          <Link
            href="/"
            className="group flex items-center gap-3 px-4 py-2.5 rounded-full border border-brand/20 bg-brand-muted hover:bg-brand hover:border-brand transition-all duration-300 hover:shadow-lg hover:shadow-brand/20"
          >
            <Image
              src="/logo-clinica.png"
              alt="Clínica Dornelles"
              width={28}
              height={28}
              className="rounded-full border border-brand/20 group-hover:border-white/40 transition-colors"
            />
            <span className="text-sm font-medium text-[#2D3B2D] group-hover:text-white transition-colors">
              Clínica Dornelles
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand/50 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        {/* Auth card */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8 lg:pt-0">
          <div className="w-full max-w-md space-y-6">
            <Card className="w-full border-none shadow-none lg:shadow-2xl lg:shadow-brand/5 lg:border bg-white rounded-3xl">
              <CardHeader className="text-center lg:text-left space-y-1 pb-2">
                {/* Logo visible only on mobile */}
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
                <CardTitle className="text-2xl font-bold text-brand">Bem-vindo ao Cuidar.me</CardTitle>
                <CardDescription>
                  Acesse sua conta ou crie uma para começar seu acompanhamento de saúde.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted/30 p-1">
                    <TabsTrigger
                      value="login"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm h-full"
                    >
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm h-full"
                    >
                      Criar Conta
                    </TabsTrigger>
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
              <Link
                href="/profissional"
                className="font-medium text-brand hover:underline underline-offset-4"
              >
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
    <Suspense fallback={<FullScreenSpinner />}>
      <RootPageContent />
    </Suspense>
  );
}
