"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getPatientProfileByUserId } from '@/ai/actions/patients';
import { registerQuickAction } from '@/ai/actions/gamification';
import type { Patient } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Quote
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function WelcomePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
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
  const isProfileComplete = !!patient?.height;
  const level = patient?.gamification?.level || 'Iniciante';
  const points = patient?.gamification?.totalPoints || 0;

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
          <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm p-2 pr-4 rounded-full border shadow-sm">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {level[0]}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nível Atual</span>
              <span className="text-sm font-bold text-foreground">{level} • {points} pts</span>
            </div>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* MAIN ACTION CARD (Large) */}
          <Card className="md:col-span-2 lg:col-span-2 row-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-md hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-48 h-48 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Activity className="w-5 h-5" />
                Foco do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {isProfileComplete ? "Continue sua Jornada" : "Complete seu Perfil"}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {isProfileComplete
                    ? "Você está indo muito bem! Que tal registrar sua alimentação de hoje para ganhar pontos?"
                    : "Para personalizarmos seu plano de saúde, precisamos de alguns dados básicos."}
                </p>
              </div>

              <Button asChild size="lg" className="rounded-full px-8 shadow-primary/25 shadow-lg hover:scale-105 transition-transform">
                <Link href={isProfileComplete ? "/portal/journey" : "/portal/profile"}>
                  {isProfileComplete ? "Ir para Minha Jornada" : "Completar Agora"} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>

              {isProfileComplete && (
                <div className="mt-8 pt-6 border-t border-primary/10">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Meta Semanal</span>
                    <span className="font-bold text-primary">35%</span>
                  </div>
                  <Progress value={35} className="h-2 bg-primary/10" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUICK ACTION: WATER */}
          <Card
            className={`bg-blue-50/50 border-blue-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group relative overflow-hidden ${actionLoading === 'hydration' ? 'opacity-70 pointer-events-none' : ''}`}
            onClick={() => handleQuickAction('hydration')}
          >
            {actionLoading === 'hydration' && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>}
            <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Hidratação</h4>
                <p className="text-xs text-blue-700/70 mt-1">Registrar copo (250ml)</p>
              </div>
            </CardContent>
          </Card>

          {/* QUICK ACTION: MOOD */}
          <Card
            className={`bg-orange-50/50 border-orange-100 hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group relative overflow-hidden ${actionLoading === 'mood' ? 'opacity-70 pointer-events-none' : ''}`}
            onClick={() => handleQuickAction('mood')}
          >
            {actionLoading === 'mood' && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div></div>}
            <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-orange-900">Como se sente?</h4>
                <p className="text-xs text-orange-700/70 mt-1">Registrar humor</p>
              </div>
            </CardContent>
          </Card>

          {/* COMMUNITY CARD */}
          <Card className="md:col-span-1 lg:col-span-1 bg-card hover:bg-accent/5 transition-colors border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                Comunidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Veja o que outros pacientes estão compartilhando hoje.
              </p>
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs" asChild>
                <Link href="/portal/community">Explorar</Link>
              </Button>
            </CardContent>
          </Card>

          {/* EDUCATION CARD */}
          <Card className="md:col-span-1 lg:col-span-1 bg-card hover:bg-accent/5 transition-colors border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-secondary" />
                Aprender
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Dicas de saúde e bem-estar selecionadas para você.
              </p>
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs" asChild>
                <Link href="/portal/education">Ver Vídeos</Link>
              </Button>
            </CardContent>
          </Card>

          {/* QUOTE CARD (Wide) */}
          <Card className="md:col-span-3 lg:col-span-2 bg-secondary/10 border-secondary/20 flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
              <Quote className="w-8 h-8 text-secondary/40 mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground italic">
                &quot;O cuidado é um ato de amor consigo mesmo. Cada pequeno passo conta.&quot;
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
