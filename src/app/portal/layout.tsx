
"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Video as VideoIcon, LogOut, UserCircle, HandCoins, Clock, UserPlus, AlertCircle } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CuidarMeLogo, Trophy } from '@/components/icons';
import { createClient } from '@/lib/supabase-client';
import type { Patient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { gamificationConfig } from '@/lib/data';
import { startOfDay } from 'date-fns';
import { normalizeBrazilianNumber } from '@/lib/utils';



const allPortalMenuItems = [
  { href: '/portal/welcome', label: 'Apresentação', icon: Home, requiredStatus: ['active', 'needs_completion'], requiredPlans: ['freemium', 'premium', 'vip'] },
  { href: '/portal/journey', label: 'Minha Jornada', icon: Trophy, requiredStatus: ['active'], requiredPlans: ['premium', 'vip'] },
  { href: '/portal/profile', label: 'Meu Perfil', icon: UserCircle, requiredStatus: ['active', 'needs_completion'], requiredPlans: ['freemium', 'premium', 'vip'] },
  { href: '/portal/community', label: 'Comunidade', icon: Users, requiredStatus: ['active'], requiredPlans: ['freemium', 'premium', 'vip'] },
  { href: '/portal/education', label: 'Educação', icon: VideoIcon, requiredStatus: ['active'], requiredPlans: ['freemium', 'premium', 'vip'] },
  { href: '/portal/plans', label: 'Planos', icon: HandCoins, requiredStatus: ['active'], requiredPlans: ['freemium', 'premium', 'vip'] },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Função para criar o documento do paciente se ele não existir
  const createPatientDocument = async () => {
    if (!user?.id || !profile) return;

    setIsCreatingPatient(true);
    try {
      const supabase = createClient();
      const whatsappNumber = profile.phone ? normalizeBrazilianNumber(`${profile.phone}`) : '';

      const newPatientData = {
        id: user.id,
        full_name: profile.display_name || 'Novo Paciente',
        whatsapp_number: whatsappNumber,
        email: profile.email || '',
        avatar: profile.photo_url || `https://placehold.co/100x100/A0D2E8/333?text=${(profile.display_name || 'P').charAt(0)}`,
        last_message: "Cadastro realizado. Aguardando aprovação da equipe.",
        last_message_timestamp: new Date().toISOString(),
        status: 'pending',
        needs_attention: true,
        plan: 'freemium',
        priority: 1,
        total_points: 0,
        level: 'Iniciante',
        badges: [],
      };

      const { error } = await supabase
        .from('patients')
        .upsert(newPatientData, { onConflict: 'id' });

      if (error) {
        console.error('ERROR CREATING PATIENT:', error);
        throw error;
      }

      // O listener do Supabase Realtime irá atualizar o estado `patient` automaticamente.

    } catch (error) {
      console.error('ERROR CREATING PATIENT:', error);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  useEffect(() => {
    if (!loading && user?.id && profile?.role === 'paciente') {
      setIsStatusLoading(true);
      const supabase = createClient();

      // Buscar paciente inicial
      const fetchPatient = async () => {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching patient:", error);
          setPatient(null);
        } else if (data) {
          setPatient(data as Patient);
        } else {
          setPatient(null);
        }
        setIsStatusLoading(false);
      };

      fetchPatient();

      // Configurar listener em tempo real
      const channel = supabase
        .channel(`patient:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patients',
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.eventType === 'DELETE') {
              setPatient(null);
            } else {
              setPatient(payload.new as Patient);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (!loading) {
      setIsStatusLoading(false);
    }
  }, [user, profile, loading]);

  const portalMenuItems = useMemo(() => {
    if (!patient) return [];

    const patientPlan = patient.subscription.plan;
    const patientStatus = (patient.status === 'active' && !patient.height) ? 'needs_completion' : patient.status;

    if (patientStatus === 'needs_completion') {
      return allPortalMenuItems.filter(item => item.href.includes('welcome') || item.href.includes('profile'));
    }

    return allPortalMenuItems.filter(item =>
      patientStatus &&
      item.requiredStatus.includes(patientStatus) &&
      item.requiredPlans.includes(patientPlan)
    );
  }, [patient]);

  if (loading || isStatusLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/');
    return null;
  }
  if (profile?.role !== 'paciente') {
    router.replace('/dashboard');
    return null;
  }

  // Se o usuário for um paciente, mas o documento dele ainda não existe, mostre a tela de criação.
  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Finalizar Cadastro</CardTitle>
            <CardDescription>
              Último passo para acessar o portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Clique no botão abaixo para criar seu perfil de paciente. Seu status inicial será <strong className="text-blue-600">Pendente</strong> e nossa equipe será notificada.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              onClick={createPatientDocument}
              disabled={isCreatingPatient}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingPatient ? 'Criando Perfil...' : 'Criar Meu Perfil de Paciente'}
            </Button>
            <Button variant="outline" onClick={signOut} className="w-full">
              Sair
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (patient.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Cadastro em Análise</CardTitle>
            <CardDescription>
              Aguardando aprovação da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Seu cadastro foi recebido com sucesso e está em análise pela nossa equipe.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Você receberá uma notificação quando for aprovado.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              Sair
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Paciente ativo, renderiza o portal completo
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <CuidarMeLogo />
            <div className="flex flex-col">
              <SidebarTrigger className="md:hidden -ml-2 h-auto w-auto p-0" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {portalMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.photo_url ?? undefined} alt={profile?.display_name ?? 'Paciente'} data-ai-hint="person avatar" />
              <AvatarFallback>{profile?.display_name?.[0] ?? user?.email?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">{profile?.display_name ?? 'Paciente'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto flex-shrink-0" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <div className="flex items-center gap-2">
            <CuidarMeLogo />
          </div>
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
