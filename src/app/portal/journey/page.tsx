"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientProfileByUserId } from '@/ai/actions/patients';
import type { Patient, Perspective } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from "@/components/ui/progress";
import { Check, Droplet, ForkKnife, HeartPulse, Brain, Zap, Sparkles, Trophy, Lock, Star, UtensilsCrossed, Target } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { GamificationPointsDisplay, PerspectiveProgress } from '@/components/gamification-display';
import { Badge } from '@/components/ui/badge';
import { HydrationButton } from '@/components/hydration-button';
import { QuickActionButton } from '@/components/quick-action-button';
import { getLevelTier, getLevelName } from '@/lib/level-system';

const levelConfig: { [key: string]: { nextLevel: string, goal: number } } = {
    'Iniciante': { nextLevel: 'Praticante', goal: 500 },
    'Praticante': { nextLevel: 'Veterano', goal: 1000 },
    'Veterano': { nextLevel: 'Mestre', goal: 2000 },
    'Mestre': { nextLevel: 'Mestre', goal: 2000 }, // Max level
}

const badgeImages: Record<string, string> = {
    pe_direito_badge: '/badges/pe_direito.svg',
    bom_de_garfo_badge: '/badges/bom_de_garfo.svg',
    pernas_pra_que_te_quero_badge: '/badges/pernas_pra_que_te_quero.svg',
    mestre_dos_habitos_badge: '/badges/mestre_dos_habitos.svg',
}

const perspectiveConfig: Record<Perspective, {
    label: string;
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    alimentacao: {
        label: "Alimentação",
        icon: ForkKnife,
        title: "Alimentação",
        description: "Nutrir seu corpo com os alimentos certos.",
        color: "text-green-600",
        bgColor: "bg-green-50/50",
        borderColor: "border-green-100",
    },
    movimento: {
        label: "Movimento",
        icon: HeartPulse,
        title: "Movimento",
        description: "Ativar seu corpo e acelerar o metabolismo.",
        color: "text-red-600",
        bgColor: "bg-red-50/50",
        borderColor: "border-red-100",
    },
    hidratacao: {
        label: "Hidratação",
        icon: Droplet,
        title: "Hidratação",
        description: "Água é vital para todas as funções.",
        color: "text-blue-600",
        bgColor: "bg-blue-50/50",
        borderColor: "border-blue-100",
    },
    disciplina: {
        label: "Disciplina",
        icon: Zap,
        title: "Disciplina",
        description: "Consistência é a chave do sucesso.",
        color: "text-purple-600",
        bgColor: "bg-purple-50/50",
        borderColor: "border-purple-100",
    },
    bemEstar: {
        label: "Bem-Estar",
        icon: Brain,
        title: "Bem-Estar",
        description: "Cuidar da mente e do sono.",
        color: "text-orange-600",
        bgColor: "bg-orange-50/50",
        borderColor: "border-orange-100",
    },
};


export default function JourneyPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const patientData = await getPatientProfileByUserId(user.id);
                if (patientData) {
                    setPatient(patientData);
                } else {
                    toast({ variant: 'destructive', title: 'Paciente não encontrado' });
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: error.message });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, authLoading, toast]);

    const radarChartData = useMemo(() => {
        if (!patient) return [];

        const perspectives: Perspective[] = ['bemEstar', 'movimento', 'disciplina', 'alimentacao', 'hidratacao'];

        return perspectives.map(p => {
            const perspectiveData = patient.gamification.weeklyProgress.perspectives[p];
            const progress = perspectiveData.goal > 0 ? (perspectiveData.current / perspectiveData.goal) * 100 : 0;
            return {
                subject: perspectiveConfig[p].label,
                value: Math.min(progress, 100),
                fullMark: 100,
                icon: perspectiveConfig[p].icon,
                isComplete: perspectiveData.isComplete,
                color: perspectiveConfig[p].color
            };
        });
    }, [patient]);

    if (loading || authLoading || !patient) {
        return <JourneySkeleton />;
    }

    // Buscar tier do nível (Iniciante, Praticante, etc.)
    const levelTier = typeof patient.gamification.level === 'number'
        ? getLevelTier(patient.gamification.level)
        : patient.gamification.level;
    const currentLevelInfo = levelConfig[levelTier] || levelConfig['Mestre'];
    const levelProgressPercentage = (patient.gamification.totalPoints / currentLevelInfo.goal) * 100;
    const weeklyPerspectives = patient.gamification.weeklyProgress.perspectives;
    const perspectivesCompleted = Object.values(weeklyPerspectives).filter(p => p.isComplete).length;

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Trophy className="h-8 w-8 text-primary" />
                            Minha Jornada
                        </h1>
                        <p className="text-muted-foreground mt-2 max-w-xl">
                            Acompanhe sua evolução nos 5 pilares do cuidado.
                        </p>
                    </div>

                    {/* LEVEL CAPSULE */}
                    <div className="bg-card border shadow-sm rounded-2xl p-4 min-w-[240px]">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                {typeof patient.gamification.level === 'number'
                                    ? getLevelName(patient.gamification.level)
                                    : `Nível ${patient.gamification.level}`}
                            </span>
                            <span className="text-xs font-bold text-primary">{patient.gamification.totalPoints} / {currentLevelInfo.goal} pts</span>
                        </div>
                        <Progress value={levelProgressPercentage} className="h-2" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* RADAR CHART CARD */}
                    <Card className="lg:col-span-7 bg-card/80 backdrop-blur-sm border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Estrela do Cuidado</span>
                                <Badge variant={perspectivesCompleted === 5 ? "default" : "secondary"} className="text-sm px-3 py-1">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {perspectivesCompleted}/5 Pilares
                                </Badge>
                            </CardTitle>
                            <CardDescription>Seu equilíbrio semanal nas áreas essenciais.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center min-h-[350px]">
                            <ResponsiveContainer width="100%" height={350}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={({ payload, x, y, ...rest }) => {
                                            const data = radarChartData.find(d => d.subject === payload.value);
                                            const Icon = data?.icon || Star;
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <circle cx="0" cy="0" r="16" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
                                                    <Icon className={cn("w-4 h-4", data?.color)} x="-8" y="-8" />
                                                </g>
                                            );
                                        }}
                                    />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Progresso" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* BADGES & STATS */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* AÇÕES RÁPIDAS */}
                        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Ações Rápidas
                                </CardTitle>
                                <CardDescription>Registre suas atividades e ganhe pontos!</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Hidratação */}
                                    <HydrationButton userId={user!.id} />

                                    {/* Alimentação */}
                                    <QuickActionButton
                                        userId={user!.id}
                                        type="mood"
                                        perspective="alimentacao"
                                        icon={UtensilsCrossed}
                                        label="Refeição Saudável"
                                        color="green"
                                    />

                                    {/* Movimento */}
                                    <QuickActionButton
                                        userId={user!.id}
                                        type="mood"
                                        perspective="movimento"
                                        icon={HeartPulse}
                                        label="Atividade Física"
                                        color="red"
                                    />

                                    {/* Disciplina */}
                                    <QuickActionButton
                                        userId={user!.id}
                                        type="mood"
                                        perspective="disciplina"
                                        icon={Target}
                                        label="Tarefa Cumprida"
                                        color="purple"
                                    />

                                    {/* Bem-Estar */}
                                    <QuickActionButton
                                        userId={user!.id}
                                        type="mood"
                                        perspective="bemEstar"
                                        icon={Brain}
                                        label="Momento Zen"
                                        color="orange"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* CONQUISTAS */}
                        <Card className="h-full bg-card/80 backdrop-blur-sm border-border/60 shadow-sm flex flex-col">
                            <CardHeader>
                                <CardTitle>Conquistas</CardTitle>
                                <CardDescription>Emblemas desbloqueados na sua trajetória.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {patient.gamification.badges.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {patient.gamification.badges.map(badgeId => (
                                            <div key={badgeId} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
                                                <Image src={badgeImages[badgeId] || '/badges/default.svg'} alt={badgeId} width={48} height={48} />
                                                <span className="text-[10px] font-medium text-center uppercase tracking-wide text-muted-foreground">
                                                    {badgeId.replace(/_badge/g, '').replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl border-muted">
                                        <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Complete metas semanais para desbloquear emblemas exclusivos.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* PILLARS GRID */}
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Metas da Semana
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {Object.entries(perspectiveConfig).map(([key, config]) => {
                            const perspectiveData = weeklyPerspectives[key as Perspective];
                            const isComplete = perspectiveData.isComplete;

                            return (
                                <Card key={key} className={cn(
                                    "transition-all duration-300 hover:shadow-md border-l-4",
                                    config.borderColor,
                                    isComplete ? "bg-card" : "bg-card/50"
                                )}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className={cn("p-2 rounded-lg", config.bgColor)}>
                                                <config.icon className={cn("w-5 h-5", config.color)} />
                                            </div>
                                            {isComplete && <div className="bg-green-100 text-green-700 p-1 rounded-full"><Check className="w-3 h-3" /></div>}
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-sm">{config.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{config.description}</p>
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Progresso</span>
                                                <span className={cn("font-bold", config.color)}>{perspectiveData.current}/{perspectiveData.goal}</span>
                                            </div>
                                            <Progress
                                                value={(perspectiveData.current / perspectiveData.goal) * 100}
                                                className="h-1.5"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}

function JourneySkeleton() {
    return (
        <div className="flex-1 p-8 bg-background/50 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-12 w-48 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Skeleton className="lg:col-span-7 h-[400px] rounded-xl" />
                    <Skeleton className="lg:col-span-5 h-[400px] rounded-xl" />
                </div>
                <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
