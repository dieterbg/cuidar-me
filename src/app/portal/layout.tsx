"use client";

import { useState, useEffect, useRef } from 'react';
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
import type { Patient } from '@/lib/types';
import { createPatientRecord } from '@/ai/actions/patients';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getLevelName } from '@/lib/level-system';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [activationName, setActivationName] = useState('');
  const [activationPhone, setActivationPhone] = useState('');
  const autoCreateAttempted = useRef(false); // evita dupla chamada no StrictMode
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/paciente');
      return;
    }

    // Proteção: Se o usuário logado NÃO for um paciente, tire ele do portal
    if (!authLoading && profile && profile.role !== 'paciente') {
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  // Se o perfil já tem nome + telefone (ex: cadastro via QR code), cria o
  // registro de paciente automaticamente sem mostrar o formulário de ativação.
  // Se faltar algum dado, pré-preenche o que tiver e exibe o form normalmente.
  useEffect(() => {
    if (!profile || patient || isStatusLoading || autoCreateAttempted.current) return;

    const name = profile.display_name?.trim();
    const rawPhone = profile.phone?.replace(/\D/g, '');

    if (name && rawPhone) {
      // Dados completos — criação silenciosa, sem form
      autoCreateAttempted.current = true;
      autoCreatePatient(name, rawPhone);
    } else {
      // Dados incompletos — pré-preenche o que tiver e exibe o form
      if (name && !activationName) setActivationName(name);
      if (rawPhone && !activationPhone) {
        let v = rawPhone;
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
        setActivationPhone(v);
      }
    }
  }, [profile, patient, isStatusLoading]);

  useEffect(() => {
    if (user) {
      setIsStatusLoading(true);
      const supabase = createClient();

      // Buscar paciente inicial
      const fetchPatient = async () => {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error("Error fetching patient:", error);
          setPatient(null);
        } else if (data) {
          // Mapeamento manual dos campos do banco para o tipo Patient
          const mappedPatient: any = {
            ...data,
            height: data.height_cm,
            initialWeight: data.initial_weight_kg,
            birthDate: data.birth_date,
            // Garante que subscription exista para evitar erro
            subscription: {
              plan: data.plan || 'freemium',
              priority: data.priority || 1
            },
            gamification: {
              totalPoints: data.total_points || 0,
              level: data.level || 1, // Garantir que seja número
              badges: data.badges || [],
              weeklyProgress: { weekStartDate: new Date(), perspectives: {} as any }
            }
          };
          setPatient(mappedPatient as Patient);
        } else {
          setPatient(null);
        }
        setIsStatusLoading(false);
      };

      fetchPatient();

      // Realtime subscription para atualizações de gamificação
      const channel = supabase
        .channel('patient_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'patients',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Atualizar estado local quando houver mudança no banco
            const newData = payload.new;
            setPatient(prev => prev ? ({
              ...prev,
              gamification: newData.gamification || prev.gamification
            }) : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Criação automática quando perfil já tem nome + telefone do cadastro
  const autoCreatePatient = async (name: string, rawPhone: string) => {
    if (!user) return;
    setIsCreatingPatient(true);
    try {
      const invitePreApproved = user.user_metadata?.invite_pre_approved === true;
      const invitePlan = user.user_metadata?.invite_plan || 'freemium';
      const patientPlan = invitePreApproved ? invitePlan : 'freemium';
      const patientStatus = (patientPlan === 'freemium' || invitePreApproved) ? 'active' : 'pending';

      const result = await createPatientRecord({
        userId: user.id,
        email: user.email || '',
        fullName: name,
        whatsappNumber: rawPhone,
        status: patientStatus,
      });

      if (!result.success) throw new Error(result.error || 'Erro ao criar registro');

      setPatient({
        id: result.patientId || 'temp-id',
        userId: user.id,
        email: user.email || '',
        fullName: name,
        phone: rawPhone,
        status: patientStatus,
        gamification: { level: 1, totalPoints: 0, badges: [], weeklyProgress: { weekStartDate: new Date(), perspectives: {} as any } },
        subscription: { plan: patientPlan, priority: 1 }
      } as any);
    } catch (error: any) {
      console.error('[autoCreatePatient]', error);
      // Fallback: exibe form manual com os dados que temos
      setActivationName(name);
      let v = rawPhone;
      if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
      setActivationPhone(v);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const createPatientDocument = async () => {
    if (!user) {
      console.error("createPatientDocument called but user is null");
      return;
    }

    console.log("createPatientDocument called for user:", user.id, user.email);

    if (!activationName.trim()) {
      toast({ variant: "destructive", title: "Nome obrigatório", description: "Por favor, preencha seu nome completo." });
      return;
    }

    if (!activationPhone.trim()) {
      toast({ variant: "destructive", title: "WhatsApp obrigatório", description: "Por favor, preencha seu WhatsApp." });
      return;
    }

    setIsCreatingPatient(true);

    try {
      // Verificar se há convite pré-aprovado na metadata do usuário
      const invitePreApproved = user.user_metadata?.invite_pre_approved === true;
      const invitePlan = user.user_metadata?.invite_plan || 'freemium';
      const patientPlan = invitePreApproved ? invitePlan : 'freemium';
      // Freemium = ativa direto (só vê conteúdo/comunidade, sem risco clínico)
      // Premium/VIP com convite = ativa direto (médico já decidiu na consulta)
      // Premium/VIP sem convite = não deveria acontecer (default é freemium)
      const patientStatus = (patientPlan === 'freemium' || invitePreApproved) ? 'active' : 'pending';

      const result = await createPatientRecord({
        userId: user.id,
        email: user.email || '',
        fullName: activationName,
        whatsappNumber: activationPhone,
        status: patientStatus,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar registro de paciente');
      }

      // Update local state to reflect the new patient immediately
      setPatient({
        id: result.patientId || 'temp-id',
        userId: user.id,
        email: user.email || '',
        fullName: activationName,
        phone: activationPhone,
        status: patientStatus,
        gamification: {
          level: 1,
          totalPoints: 0,
          badges: [],
          weeklyProgress: { weekStartDate: new Date(), perspectives: {} as any }
        },
        subscription: { plan: patientPlan, priority: 1 }
      } as any);

      if (invitePreApproved) {
        toast({ title: "Conta Ativada!", description: "Convite aceito — seu protocolo será iniciado em breve!" });
      } else {
        toast({ title: "Conta Criada!", description: "A clínica liberará seu acesso em breve." });
      }
      // router.push('/portal/welcome'); // No need to push if we update state, layout will render children
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const isProfileComplete = !!patient?.height;

  // Proteção de rotas para usuários "incompletos" e planos restritos (deve ficar ANTES dos early returns para evitar erro #310)
  useEffect(() => {
    if (!isStatusLoading && patient) {
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
  }, [pathname, isStatusLoading, patient, isProfileComplete, router]);

  // Se estiver redirecionando ou carregando, não renderize nada que dependa de 'patient'
  if (authLoading || isStatusLoading || isCreatingPatient || (profile && profile.role !== 'paciente')) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Se o usuário for um paciente, mas o documento dele ainda não existe, mostre a tela de criação.
  // Somente mostramos isso para quem tem a role 'paciente' ou se for um novo cadastro ainda não classificado
  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 animate-pulse">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Quase lá!</CardTitle>
            <CardDescription>
              Confirme seus dados para ativar o acompanhamento via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <p className="text-muted-foreground mb-2 text-center text-sm">
              Usaremos o WhatsApp para enviar seus check-ins diários.
            </p>
            <div className="space-y-2">
              <Label htmlFor="activation-name">Nome Completo</Label>
              <Input
                id="activation-name"
                placeholder="Seu nome completo"
                value={activationName}
                onChange={(e) => setActivationName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activation-phone">WhatsApp</Label>
              <Input
                id="activation-phone"
                placeholder="(11) 99999-9999"
                value={activationPhone}
                onChange={(e) => {
                  // Simple mask
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 11) v = v.slice(0, 11);
                  if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                  if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
                  setActivationPhone(v);
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              onClick={createPatientDocument}
              disabled={isCreatingPatient}
              className="w-full rounded-full h-12 text-base shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              {isCreatingPatient ? 'Ativando...' : 'Salvar e Ativar Conta'}
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full rounded-full text-muted-foreground hover:text-destructive">
              Sair
            </Button>
          </CardFooter>
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
