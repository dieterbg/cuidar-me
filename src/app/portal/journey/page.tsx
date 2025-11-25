

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getPatientDetails } from '@/ai/actions';
import type { Patient, Perspective } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from "@/components/ui/progress";
import { Check, Droplet, ForkKnife, HeartPulse, Brain, Zap, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Trophy } from '@/components/icons';
import { cn } from '@/lib/utils';
import { PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';

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
}> = {
    alimentacao: {
        label: "Alimentação",
        icon: ForkKnife,
        title: "Alimentação Consciente",
        description: "Nutrir seu corpo com os alimentos certos é a base de tudo. A meta é realizar 5 ações ou check-ins de alimentação por semana.",
        color: "text-green-500",
        bgColor: "bg-green-100",
    },
    movimento: {
        label: "Movimento",
        icon: HeartPulse,
        title: "Movimento é Vida",
        description: "Ativar seu corpo é essencial para acelerar o metabolismo. A meta é registrar 5 atividades físicas ou check-ins de movimento por semana.",
        color: "text-red-500",
        bgColor: "bg-red-100",
    },
    hidratacao: {
        label: "Hidratação",
        icon: Droplet,
        title: "Hidratação Plena",
        description: "A água é vital para todas as funções do seu corpo. A meta é confirmar sua hidratação em 5 dias ou check-ins da semana.",
        color: "text-blue-500",
        bgColor: "bg-blue-100",
    },
    disciplina: {
        label: "Disciplina",
        icon: Zap,
        title: "Disciplina e Consistência",
        description: "A disciplina é a ponte entre suas metas e suas conquistas. A meta é realizar 5 ações de disciplina, como pesar e planejar.",
        color: "text-purple-500",
        bgColor: "bg-purple-100",
    },
    bemEstar: {
        label: "Bem-Estar",
        icon: Brain,
        title: "Bem-Estar e Mente",
        description: "Cuidar da sua saúde mental, do seu sono e do seu conhecimento. A meta é realizar 5 check-ins ou atividades de bem-estar.",
        color: "text-orange-500",
        bgColor: "bg-orange-100",
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
                const details = await getPatientDetails(user.id);
                if (details.patient) {
                    setPatient(details.patient);
                } else {
                    toast({ variant: 'destructive', title: 'Paciente não encontrado' });
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Erro ao carregar dados da jornada', description: error.message });
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
                value: Math.min(progress, 100), // Cap at 100
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

    const currentLevelInfo = levelConfig[patient.gamification.level] || levelConfig['Mestre'];
    const levelProgressPercentage = (patient.gamification.totalPoints / currentLevelInfo.goal) * 100;

    const weeklyPerspectives = patient.gamification.weeklyProgress.perspectives;
    const perspectivesCompleted = Object.values(weeklyPerspectives).filter(p => p.isComplete).length;


    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                        <Trophy className="h-8 w-8 text-primary" />
                        Minha Jornada
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        Acompanhe seu progresso, complete os 5 pilares do cuidado e desbloqueie novas conquistas. Cada passo conta!
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Sua Estrela do Cuidado Semanal</span>
                                <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
                                    <Sparkles className="h-5 w-5" />
                                    {perspectivesCompleted}/5
                                </span>
                            </CardTitle>
                            <CardDescription>A estrela se preenche à medida que você completa as metas da semana!</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center min-h-[350px] py-4">
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={({ payload, x, y, textAnchor, ...rest }) => {
                                            const matchingData = radarChartData.find(d => d.subject === payload.value);
                                            if (!matchingData) return <g />;
                                            const Icon = matchingData.icon;
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <Icon className={cn("h-6 w-6", matchingData.isComplete ? 'text-amber-500' : matchingData.color)} style={{ transform: 'translate(-12px, -35px)' }} />
                                                    <text
                                                        {...rest}
                                                        y={y > 200 ? 15 : 0}
                                                        textAnchor="middle"
                                                        fill="hsl(var(--muted-foreground))"
                                                        fontSize="12px"
                                                    >
                                                        {payload.value}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                    />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Progresso" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Nível: {patient.gamification.level}</CardTitle>
                                <CardDescription className="text-xs">
                                    {Math.max(0, currentLevelInfo.goal - patient.gamification.totalPoints)} pontos para o próximo nível.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Progress value={levelProgressPercentage} className="h-3" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Emblemas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.gamification.badges.length > 0 ? (
                                    <div className="flex flex-wrap gap-4 items-center justify-center">
                                        {patient.gamification.badges.map(badgeId => (
                                            <div key={badgeId} className="flex flex-col items-center gap-1 text-center" title={badgeId}>
                                                <Image src={badgeImages[badgeId] || '/badges/default.svg'} alt={badgeId} width={60} height={60} />
                                                <p className="text-xs font-medium capitalize text-muted-foreground">{badgeId.replace(/_badge/g, '').replace(/_/g, ' ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-sm text-muted-foreground py-4">Você ainda não ganhou nenhum emblema.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Os 5 Pilares do Cuidado</CardTitle>
                        <CardDescription>Entenda a importância de cada perspectiva e acompanhe sua meta semanal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {Object.entries(perspectiveConfig).map(([key, config]) => {
                                const perspectiveData = weeklyPerspectives[key as Perspective];
                                return (
                                    <AccordionItem value={key} key={key}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", perspectiveData.isComplete ? 'bg-green-100' : 'bg-muted')}>
                                                    {perspectiveData.isComplete ? <Check className="h-5 w-5 text-green-600" /> : <config.icon className={cn("h-5 w-5", config.color)} />}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-semibold">{config.title}</p>
                                                    <p className="text-sm text-muted-foreground">Meta da Semana: {perspectiveData.current}/{perspectiveData.goal}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-muted-foreground pl-11">{config.description}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}


function JourneySkeleton() {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <Skeleton className="h-9 w-64 mx-auto" />
                    <Skeleton className="h-5 w-full max-w-lg mt-2 mx-auto" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <Skeleton className="h-7 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                        </CardHeader>
                        <CardContent className="flex items-center justify-center min-h-[350px]">
                            <Skeleton className="h-64 w-64 rounded-full" />
                        </CardContent>
                    </Card>
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-56" />
                        <Skeleton className="h-5 w-full max-w-sm mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


