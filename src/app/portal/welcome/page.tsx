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
  HeartPulse,
  HelpCircle,
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
  const [waterCount, setWaterCount] = useState(0);
  const WATER_GOAL = 8;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  // Carregar contagem de água do localStorage (resetada por dia)
  useEffect(() => {
    const todayKey = `water-${new Date().toDateString()}`;
    const saved = localStorage.getItem(todayKey);
    if (saved) setWaterCount(parseInt(saved, 10) || 0);
  }, []);

  const handleWaterAdd = () => {
    if (waterCount >= WATER_GOAL) return;
    const next = waterCount + 1;
    setWaterCount(next);
    const todayKey = `water-${new Date().toDateString()}`;
    localStorage.setItem(todayKey, String(next));
  };

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
      <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-8 pt-8">
          {/* Status principal */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Quase lá, {firstName}!</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Seu cadastro foi recebido. A equipe da clínica está preparando seu protocolo personalizado.
            </p>
            <p className="text-sm text-muted-foreground">
              Estimativa: até 24 horas úteis. Vamos avisar no WhatsApp assim que tudo estiver pronto.
            </p>
          </div>

          {/* Conteúdo enquanto espera */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Enquanto isso, explore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/portal/how-it-works" className="flex items-center gap-3 p-3 rounded-xl bg-background/80 hover:bg-background transition-colors group">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Como funciona o Cuidar.me</p>
                  <p className="text-xs text-muted-foreground">Entenda o sistema de pontos, níveis e recompensas</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link href="/portal/education" className="flex items-center gap-3 p-3 rounded-xl bg-background/80 hover:bg-background transition-colors group">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <HeartPulse className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Conteúdo de Saúde</p>
                  <p className="text-xs text-muted-foreground">Artigos e dicas selecionadas pela equipe médica</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link href="/portal/community" className="flex items-center gap-3 p-3 rounded-xl bg-background/80 hover:bg-background transition-colors group">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Comunidade</p>
                  <p className="text-xs text-muted-foreground">Conheça outros pacientes na mesma jornada</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>

          {/* Perfil incompleto — lembrete gentil */}
          {!isProfileComplete && (
            <Card className="border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Complete seu perfil de saúde</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80">Quanto mais dados, mais personalizado será seu protocolo.</p>
                </div>
                <Button asChild variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-100 shrink-0">
                  <Link href="/portal/profile">Completar</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rastreador de hidratação — começa a criar hábito agora */}
          <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplet className="h-5 w-5 text-blue-500" />
                Comece agora — Rastreador de Hidratação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Beba 8 copos de água hoje. Toque em cada copo ao beber.
              </p>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: WATER_GOAL }).map((_, i) => (
                  <button
                    key={i}
                    onClick={handleWaterAdd}
                    className={cn(
                      'text-2xl transition-all duration-200 hover:scale-110',
                      i < waterCount ? 'opacity-100' : 'opacity-20 hover:opacity-40'
                    )}
                    title={i < waterCount ? 'Registrado' : 'Clique ao beber'}
                  >
                    💧
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {waterCount}/{WATER_GOAL} copos hoje
                </p>
                {waterCount >= WATER_GOAL && (
                  <span className="text-xs font-bold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
                    ✓ Meta atingida!
                  </span>
                )}
              </div>
              <Progress value={(waterCount / WATER_GOAL) * 100} className="h-1.5" />
            </CardContent>
          </Card>
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

        {/* PENDING REGISTRATION ALERT REMOVIDO PARA EVITAR DUPLICIDADE COM O FOCO DO DIA */}

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
                  {!isProfileComplete ? "Ative seu Acompanhamento" : isFreemium ? "Explore Conteúdos de Saúde" : "Continue sua Jornada de Saúde"}
                </h3>
                <p className="text-muted-foreground text-base max-w-sm">
                  {!isProfileComplete
                    ? "Preencha seus dados de saúde para que a equipe personalize seu protocolo e comece seu acompanhamento via WhatsApp."
                    : isFreemium
                    ? "Acesse nossos artigos e dicas exclusivas aprovadas por médicos para conquistar seus objetivos de saúde."
                    : "Cada check-in respondido te aproxima do próximo nível. Consistência transforma hábitos em resultados."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-xl px-8 shadow-primary/25 shadow-lg hover:scale-105 transition-transform font-bold">
                  <Link href={!isProfileComplete ? "/portal/profile" : isFreemium ? "/portal/education" : "/portal/journey"}>
                    {!isProfileComplete ? "Completar Agora" : isFreemium ? "Acessar Educação" : "Ver Minha Jornada"} <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
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

          {/* COMO FUNCIONA */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => router.push('/portal/how-it-works')}>
            <CardHeader className="pb-2">
              <HelpCircle className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-base font-bold">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Entenda como ganhar pontos, subir de nivel e trocar por recompensas.</p>
            </CardContent>
          </Card>

          {/* COMMUNITY / EDUCATION SNEAK PEEK */}
          <Card 
            className={cn(
              "bg-card shadow-sm border-border/40 transition-colors", 
              isProfileComplete ? "hover:bg-accent/5 group cursor-pointer" : "opacity-80"
            )} 
            onClick={() => isProfileComplete && router.push('/portal/education')}
          >
            <CardHeader className="pb-2">
              <BookOpen className={cn("h-6 w-6 text-primary mb-2 transition-transform", isProfileComplete && "group-hover:scale-110")} />
              <CardTitle className="text-base font-bold flex items-center justify-between">
                Conteúdo Elite
                {!isProfileComplete && <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground bg-secondary/20 px-2 py-0.5 rounded-full">Bloqueado</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Artigos e masterclasses exclusivas para sua evolução.</p>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "bg-card shadow-sm border-border/40 transition-colors", 
              !isFreemium && "lg:col-span-2",
              isProfileComplete ? "hover:bg-accent/5 group cursor-pointer" : "opacity-80"
            )} 
            onClick={() => isProfileComplete && router.push('/portal/community')}
          >
            <CardHeader className="pb-2">
              <Users className={cn("h-6 w-6 text-primary mb-2 transition-transform", isProfileComplete && "group-hover:scale-110")} />
              <CardTitle className="text-base font-bold flex items-center justify-between">
                Comunidade
                {!isProfileComplete && <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground bg-secondary/20 px-2 py-0.5 rounded-full">Bloqueado</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Conecte-se com outros pacientes focados no mesmo objetivo.</p>
            </CardContent>
          </Card>

          {/* QUOTE CARD (Wide) */}
          <Card className={cn("bg-secondary/5 border-secondary/10 flex items-center justify-center p-8 relative overflow-hidden", isFreemium ? "md:col-span-1 lg:col-span-3" : "md:col-span-full lg:col-span-full")}>
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
