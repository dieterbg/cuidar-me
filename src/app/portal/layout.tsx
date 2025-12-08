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
  Sparkles
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
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [activationName, setActivationName] = useState('');
  const [activationPhone, setActivationPhone] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

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
      const result = await createPatientRecord({
        userId: user.id,
        email: user.email || '',
        fullName: activationName,
        whatsappNumber: activationPhone,
        status: 'active',
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
        status: 'pending',
        gamification: {
          level: 1, // Novo usuário começa no nível 1
          totalPoints: 0,
          badges: [],
          weeklyProgress: { weekStartDate: new Date(), perspectives: {} as any }
        },
        subscription: { plan: 'freemium', priority: 1 }
      } as any);

      toast({ title: "Conta Ativada!", description: "Bem-vindo ao portal!" });
      // router.push('/portal/welcome'); // No need to push if we update state, layout will render children
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsCreatingPatient(false);
    }
  };


  if (authLoading || isStatusLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Se o usuário for um paciente, mas o documento dele ainda não existe, mostre a tela de criação.
  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-none shadow-xl bg-card/50 backdrop-blur-md">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 animate-pulse">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao Cuidar.me</CardTitle>
            <CardDescription>
              Vamos configurar seu espaço pessoal de saúde.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <p className="text-muted-foreground mb-2 text-center">
              Para ativar sua conta, precisamos de mais alguns dados.
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
    { href: '/portal/profile', label: 'Meu Perfil', icon: User },
    { href: '/portal/community', label: 'Comunidade', icon: Users },
    { href: '/portal/education', label: 'Educação', icon: BookOpen },
  ];

  const isProfileComplete = !!patient?.height;

  const menuItems = allMenuItems.filter(item => {
    // Show core items always
    if (['/portal/welcome', '/portal/profile'].includes(item.href)) return true;

    // Journey is okay too? Let's check if user complained. No.
    if (item.href === '/portal/journey') return true;

    // Hide Community/Education if profile incomplete
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
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={patient.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {(patient.fullName || user?.user_metadata?.full_name || user?.email || 'P').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">
                  {(patient.fullName || user?.user_metadata?.full_name || 'Paciente').split(' ')[0]}
                </p>
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
          {/* <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:text-foreground">
                <Settings className="h-5 w-5" />
                Configurações
            </Button> */}
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
