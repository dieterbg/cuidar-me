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
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* MAIN ACTION CARD (Large) - Foco do Dia */}
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
                    ? "Você está indo muito bem! Que tal registrar sua alimentação de hoje?"
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
