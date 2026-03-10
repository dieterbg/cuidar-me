"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { getPatientProfileByUserId } from '@/ai/actions/patients';
import { registerQuickAction } from '@/ai/actions/gamification';
import type { Patient } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowRight,
  Sparkles,
  Droplet,
  Activity,
  Sun,
  Users,
  PlayCircle,
  Quote,
  Trophy,
  Star,
  Zap,
  BookOpen,
  Target,
  HeartPulse
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getLevelInfo, getLevelName } from '@/lib/level-system';
import { GamificationPointsDisplay } from '@/components/gamification-display';

export default function WelcomePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        const data = await getPatientProfileByUserId(user.id);
        setPatient(data);
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  const handleQuickAction = async (type: 'hydration' | 'mood') => {
    if (!user || actionLoading) return;

    setActionLoading(type);
    try {
      const result = await registerQuickAction(user.id, type);

      if (result.success) {
        toast({
          title: "Registrado!",
          description: result.message,
          className: "bg-primary text-primary-foreground border-none"
        });

        // Atualizar dados locais para refletir novos pontos imediatamente
        setPatient(prev => prev ? ({
          ...prev,
          gamification: {
            ...prev.gamification,
            totalPoints: (prev.gamification.totalPoints || 0) + result.pointsEarned
          }
        }) : null);
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar ação." });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || authLoading) {
    return <WelcomeSkeleton />;
  }

  const firstName = patient?.fullName?.split(' ')[0] || 'Visitante';
  const isPending = patient?.status === 'pending';
  const isProfileComplete = !!patient?.height;
  const isFreemium = patient?.subscription?.plan === 'freemium';
  const levelInfo = patient ? getLevelInfo(patient.gamification.totalPoints) : null;
  const points = patient?.gamification?.totalPoints || 0;

  // ETAPA 1: Aguardando liberação pela clínica
  if (isPending) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro Pendente</h1>
          <p className="text-muted-foreground">
            Seu cadastro foi recebido com sucesso! A clínica entrará em contato ou liberará seu acesso em breve.
          </p>
          <p className="text-sm text-muted-foreground">
            Você receberá uma notificação assim que sua conta for ativada. Obrigado pela paciência! 🙏
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {greeting}, <span className="text-primary">{firstName}</span>.
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Vamos cuidar de você hoje?
            </p>
          </div>
        </div>

        {/* PENDING REGISTRATION ALERT */}
        {!isProfileComplete && (
          <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-2xl shadow-inner">
                  <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-100">Perfil Incompleto</h3>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    Sua conta está ativa, mas precisamos dos seus dados de saúde para personalizar seu acompanhamento.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 shrink-0">
                <Link href="/portal/profile">Preencher Agora</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* GAMIFICATION STATUS (FOR PREMIUM/VIP) */}
        {!isFreemium && levelInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card shadow-sm border-border/40 overflow-hidden group hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Nível Atual</p>
                    <h3 className="text-2xl font-black text-foreground">{getLevelName(levelInfo.level)}</h3>
                  </div>
                  <Trophy className="h-8 w-8 text-amber-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Progresso para {getLevelName(levelInfo.level + 1)}</span>
                    <span className="text-primary">{levelInfo.progress}%</span>
                  </div>
                  <Progress value={levelInfo.progress} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-right italic">
                    Faltam {levelInfo.pointsForNext} pts para o próximo nível
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border/40 overflow-hidden group hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Star className="h-8 w-8 text-primary fill-primary/20" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Saldo de Pontos</p>
                    <h3 className="text-3xl font-black text-foreground">
                      {points.toLocaleString('pt-BR')} <span className="text-sm font-normal text-muted-foreground">Health Coins</span>
                    </h3>
                  </div>
                </div>
                <Button asChild variant="link" className="p-0 h-auto self-start mt-4 text-primary font-bold hover:gap-2 transition-all">
                  <Link href="/portal/store" className="flex items-center gap-1">
                    Ver recompensas na Loja <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* MAIN ACTION CARD (Large) - Foco do Dia */}
          <Card className="md:col-span-2 lg:col-span-2 row-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-md hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-48 h-48 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-primary text-sm font-black uppercase tracking-widest">
                <Activity className="w-4 h-4" />
                Foco do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10 flex-1 flex flex-col justify-center">
              <div>
                <h3 className="text-3xl font-black text-foreground mb-3 leading-tight">
                  {isProfileComplete ? "Continue sua Jornada de Habitos" : "Ative seu Prontuario"}
                </h3>
                <p className="text-muted-foreground text-base max-w-sm">
                  {isProfileComplete
                    ? "Mantenha a consistência! Registre suas ações diárias para subir de nível e ganhar recompensas."
                    : "Para personalizarmos seu plano de saúde e liberar a evolução, precisamos dos seus dados básicos."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-xl px-8 shadow-primary/25 shadow-lg hover:scale-105 transition-transform font-bold">
                  <Link href={isProfileComplete ? "/portal/journey" : "/portal/profile"}>
                    {isProfileComplete ? "Ver Minha Jornada" : "Completar Agora"} <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>

                {isFreemium && (
                  <Button asChild variant="outline" size="lg" className="rounded-xl px-8 border-primary/20 text-primary hover:bg-primary/5 font-bold">
                    <Link href="/portal/plans">Ver Planos Premium</Link>
                  </Button>
                )}
              </div>
            </CardContent>
            {isProfileComplete && !isFreemium && (
              <CardFooter className="pt-0 relative z-10">
                <div className="w-full bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-primary/5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground font-medium">Meta Semanal do Protocolo</span>
                    <span className="font-bold text-primary">Ativa</span>
                  </div>
                  <div className="flex gap-1.5 h-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <div key={i} className={cn("flex-1 rounded-full", i <= 3 ? "bg-primary" : "bg-muted")} />
                    ))}
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* UPSELL CARD FOR FREEMIUM */}
          {isFreemium && (
            <Card className="md:col-span-1 lg:col-span-2 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Zap className="w-24 h-24 text-amber-500" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-600 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-500" />
                  UPGRADE PREMIUM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 relative z-10">
                <h4 className="font-black text-xl text-foreground">Desbloqueie Recompensas</h4>
                <p className="text-sm text-muted-foreground">
                  No plano Premium você ganha pontos por cada hábito saudável e pode trocar por <b>vouchers, brindes exclusivos e masterclasses</b>.
                </p>
                <Button asChild variant="secondary" size="sm" className="bg-amber-500 text-white hover:bg-amber-600 rounded-lg font-bold shadow-sm">
                  <Link href="/portal/plans">Conhecer Planos</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* COMMUNITY / EDUCATION SNEAK PEEK */}
          <Card className="bg-card shadow-sm border-border/40 hover:bg-accent/5 transition-colors group cursor-pointer" onClick={() => router.push('/portal/education')}>
            <CardHeader className="pb-2">
              <BookOpen className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-base font-bold">Conteúdo Elite</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Artigos e masterclasses exclusivas para sua evolução.</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border/40 hover:bg-accent/5 transition-colors group cursor-pointer" onClick={() => router.push('/portal/community')}>
            <CardHeader className="pb-2">
              <Users className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-base font-bold">Comunidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Conecte-se com outros pacientes focados no mesmo objetivo.</p>
            </CardContent>
          </Card>

          {/* QUOTE CARD (Wide) */}
          <Card className="md:col-span-3 lg:col-span-2 bg-secondary/5 border-secondary/10 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute -left-4 -top-4 opacity-5">
              <Quote className="w-24 h-24 text-secondary rotate-180" />
            </div>
            <div className="text-center max-w-lg relative z-10">
              <Quote className="w-8 h-8 text-primary/40 mx-auto mb-4" />
              <p className="text-xl font-medium text-foreground italic leading-relaxed">
                &quot;O cuidado é um ato de amor consigo mesmo. Cada pequeno passo hoje constrói o gigante de amanhã.&quot;
              </p>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="flex-1 p-8 bg-background/50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <Skeleton className="md:col-span-2 row-span-2 h-[380px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="md:col-span-2 h-[180px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
