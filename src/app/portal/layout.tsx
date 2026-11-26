"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import {
  LayoutDashboard,
  User,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  Trophy,
  Settings,
  Sparkles,
  Building2,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase-client';
import { parsePatientRegistrationPhone, type PatientRegistrationInput, type PatientRegistrationResult } from '@/lib/patient-registration';
import { createPatientRecord } from '@/ai/actions/patients';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getLevelName } from '@/lib/level-system';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userId = user?.id;
  const profileRole = profile?.role;
  const [attempt, setAttempt] = useState<{ userId: string; fields?: PatientRegistrationInput } | null>(null);
  const [registration, setRegistration] = useState<{
    userId: string;
    attempt: typeof attempt;
    result: PatientRegistrationResult;
  } | null>(null);
  const result = registration && registration.userId === userId && registration.attempt === attempt
    ? registration.result
    : null;
  const patient = result?.success ? result.patient : null;
  const [activationName, setActivationName] = useState('');
  const [activationPhone, setActivationPhone] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [activationPrivacyConsent, setActivationPrivacyConsent] = useState(false);
  const [activationWhatsappConsent, setActivationWhatsappConsent] = useState(false);
  const [activationAiConsent, setActivationAiConsent] = useState(false);
  const activationConsentsAccepted = activationPrivacyConsent && activationWhatsappConsent && activationAiConsent;

  useEffect(() => {
    setActivationName('');
    setActivationPhone(null);
    setEditingPhone(false);
    setActivationPrivacyConsent(false);
    setActivationWhatsappConsent(false);
    setActivationAiConsent(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) router.replace('/paciente');
    else if (profileRole && profileRole !== 'paciente') router.replace('/dashboard');
  }, [userId, profileRole, authLoading, router]);

  useEffect(() => {
    if (authLoading || !userId || (profileRole && profileRole !== 'paciente')) return;
    let cancelled = false;
    const fields = attempt?.userId === userId ? attempt.fields : undefined;
    createPatientRecord(fields)
      .catch((): PatientRegistrationResult => ({
        success: false,
        error: 'Não foi possível concluir seu cadastro. Tente novamente.',
      }))
      .then(result => {
        if (!cancelled) setRegistration({ userId, attempt, result });
      });
    return () => { cancelled = true; };
  }, [userId, profileRole, authLoading, attempt]);

  const patientId = patient?.id;
  useEffect(() => {
    if (!patientId || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('patient_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'patients',
        filter: `user_id=eq.${userId}`,
      }, ({ new: row }) => {
        if (row.id !== patientId || row.user_id !== userId) return;
        setRegistration(previous => previous?.userId === userId && previous.result.success
          ? { ...previous, result: { success: true, patient: transformPatientFromSupabase(row) } }
          : previous);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [patientId, userId]);

  const isProfileComplete = !!patient?.height;

  // Proteção de rotas para usuários "incompletos" e planos restritos (deve ficar ANTES dos early returns para evitar erro #310)
  useEffect(() => {
    if (patient) {
      const isFreemium = patient.subscription?.plan === 'freemium';

      // Bloqueia rotas de comunidade/educação para quem não completou perfil
      if (!isProfileComplete && (pathname.startsWith('/portal/community') || pathname.startsWith('/portal/education'))) {
        router.replace('/portal/welcome');
      }

      // Bloqueia rotas Premium/VIP (gamificação/protocolos) para Freemium
      if (isFreemium && (pathname.startsWith('/portal/journey') || pathname.startsWith('/portal/store'))) {
        router.replace('/portal/welcome');
      }
    }
  }, [pathname, patient, isProfileComplete, router]);

  if (authLoading || !userId || !result || (profileRole && profileRole !== 'paciente')) {
    return (
      <div role="status" className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <div aria-hidden="true" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="text-sm text-muted-foreground">Carregando seu cadastro…</span>
      </div>
    );
  }

  if (!result.success) {
    const { conflictingPhone, error } = result;
    const showPhoneConflict = !!conflictingPhone && !editingPhone;
    const missing = conflictingPhone ? { name: false, phone: true, consent: false } : result.missing;
    const phoneValue = activationPhone ?? conflictingPhone ?? result.enteredPhone ?? '';
    const normalizedPhone = parsePatientRegistrationPhone(phoneValue);
    const sameConflictingPhone = conflictingPhone && normalizedPhone === parsePatientRegistrationPhone(conflictingPhone);
    const canContinue = (!missing?.name || !!activationName.trim())
      && (!missing?.phone || (!!normalizedPhone && !sameConflictingPhone))
      && (!missing?.consent || activationConsentsAccepted);
    const title = showPhoneConflict
      ? 'WhatsApp já cadastrado'
      : conflictingPhone ? 'Corrija seu WhatsApp' : missing ? 'Complete seu cadastro' : 'Não foi possível concluir seu cadastro';
    const handleContinue = () => {
      const previousFields = attempt?.userId === userId ? attempt.fields : undefined;
      const fields = missing
        ? {
          ...previousFields,
          ...(missing.name ? { fullName: activationName.trim() } : {}),
          ...(missing.phone ? { whatsappNumber: phoneValue.trim() } : {}),
          ...(missing.consent ? { acceptConsent: activationConsentsAccepted } : {}),
        }
        : previousFields;
      setEditingPhone(false);
      setAttempt({ userId, fields });
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 animate-pulse">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>
              {showPhoneConflict
                ? `Já existe um cadastro com o WhatsApp terminado em ${conflictingPhone.slice(-4)}.`
                : missing ? 'Preencha os dados solicitados para continuar.' : 'Tente novamente para acessar seu portal.'}
            </CardDescription>
          </CardHeader>
          {showPhoneConflict ? (
            <>
              <CardContent className="text-sm text-muted-foreground">
                Use a conta que você já tinha para acessar o cadastro. Se você precisa vincular esse WhatsApp à sua conta atual, peça à clínica para conferir a titularidade.
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button onClick={signOut} className="w-full rounded-full h-12">
                  Entrar com a conta anterior
                </Button>
                <Button variant="outline" onClick={() => setEditingPhone(true)} className="w-full rounded-full">
                  Corrigir meu WhatsApp
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardContent className="space-y-4 text-left">
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {missing?.name && (
                  <div className="space-y-2">
                    <Label htmlFor="activation-name">Nome completo</Label>
                    <Input
                      id="activation-name"
                      autoComplete="name"
                      value={activationName}
                      maxLength={160}
                      onChange={(event) => setActivationName(event.target.value)}
                    />
                  </div>
                )}
                {missing?.phone && (
                  <div className="space-y-2">
                    <Label htmlFor="activation-phone">WhatsApp</Label>
                    <Input
                      id="activation-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="(11) 99999-9999"
                      value={phoneValue}
                      maxLength={32}
                      onChange={(event) => setActivationPhone(event.target.value)}
                    />
                    {conflictingPhone && (
                      <p className="text-sm text-muted-foreground">Informe um número diferente para continuar com esta conta.</p>
                    )}
                  </div>
                )}
                {missing?.consent && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                    <label className="flex items-start gap-2">
                      <Checkbox
                        checked={activationPrivacyConsent}
                        onCheckedChange={(checked) => setActivationPrivacyConsent(checked === true)}
                        aria-label="Aceito a politica de privacidade"
                      />
                      <span>Li e aceito a politica de privacidade e o uso dos meus dados para acompanhamento digital em saude.</span>
                    </label>
                    <label className="flex items-start gap-2">
                      <Checkbox
                        checked={activationWhatsappConsent}
                        onCheckedChange={(checked) => setActivationWhatsappConsent(checked === true)}
                        aria-label="Aceito receber mensagens por WhatsApp"
                      />
                      <span>Aceito receber check-ins, lembretes e orientacoes pelo WhatsApp informado.</span>
                    </label>
                    <label className="flex items-start gap-2">
                      <Checkbox
                        checked={activationAiConsent}
                        onCheckedChange={(checked) => setActivationAiConsent(checked === true)}
                        aria-label="Aceito apoio de assistente de IA"
                      />
                      <span>Entendo que a assistente de IA oferece apoio educativo e triagem, sem substituir consulta medica.</span>
                    </label>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="w-full rounded-full h-12 text-base shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  {missing ? 'Continuar' : 'Tentar novamente'}
                </Button>
                <Button variant="ghost" onClick={conflictingPhone ? () => {
                  setActivationPhone(null);
                  setEditingPhone(false);
                } : signOut} className="w-full rounded-full text-muted-foreground hover:text-destructive">
                  {conflictingPhone ? 'Voltar' : 'Sair'}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    );
  }

  const allMenuItems = [
    { href: '/portal/welcome', label: 'Início', icon: LayoutDashboard },
    { href: '/portal/journey', label: 'Minha Jornada', icon: Trophy },
    { href: '/portal/how-it-works', label: 'Como Funciona', icon: HelpCircle },
    { href: '/portal/store', label: 'Loja de Pontos', icon: ShoppingBag },
    { href: '/portal/profile', label: 'Meu Perfil', icon: User },
    { href: '/portal/community', label: 'Comunidade', icon: Users },
    { href: '/portal/education', label: 'Educação', icon: BookOpen },
  ];

  const menuItems = allMenuItems.filter(item => {
    const isFreemium = patient?.subscription?.plan === 'freemium';
    const isPremiumOrVip = patient?.subscription?.plan === 'premium' || patient?.subscription?.plan === 'vip';

    // Premium/VIP users always see paid content/features
    if (isPremiumOrVip && ['/portal/journey', '/portal/store', '/portal/community', '/portal/education'].includes(item.href)) {
      return true;
    }

    // Core items always visible
    if (['/portal/welcome', '/portal/profile', '/portal/how-it-works'].includes(item.href)) return true;

    // Premium/VIP logic above handled them. For others (Freemium):
    // Hide Journey and Store for Freemium
    if (isFreemium && ['/portal/journey', '/portal/store'].includes(item.href)) {
      return false;
    }

    // Hide Community/Education if profile incomplete (for everyone else, though Premium is already handled)
    if (['/portal/community', '/portal/education'].includes(item.href)) {
      return isProfileComplete;
    }

    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F5F3F0] dark:bg-zinc-950">

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-card border-r border-border/40 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-20 w-64">
              <Image
                src="/logo.svg"
                alt="Cuidar.me Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 py-2">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                <AvatarImage src={patient?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {(patient?.fullName || user?.user_metadata?.full_name || user?.email || 'P').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex flex-col justify-center">
                <p className="text-sm font-bold truncate">
                  {(patient?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Paciente').split(' ')[0]}
                </p>
                {patient && (
                  <div className="text-[10px] text-muted-foreground tracking-wide font-semibold mt-0.5 flex flex-col gap-0.5">
                    <span className="uppercase text-primary/80">
                      {patient.subscription?.plan === 'freemium' ? '🌱 Semente' :
                       patient.subscription?.plan === 'vip' ? '👑 Concierge' : '💎 Premium'}
                    </span>
                    {patient.protocol?.isActive && patient.protocol.protocolId && (
                      <span className="truncate capitalize" title={patient.protocol.protocolId}>
                        O.{patient.protocol.protocolId.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
                {isActive && <Sparkles className="ml-auto h-4 w-4 text-primary-foreground/50 animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Building2 className="h-5 w-5" />
            Nossa Clínica
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {/* MOBILE HEADER */}
        <header className="lg:hidden h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-bold text-lg">cuidar.me</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
