"use client";

import { useEffect, useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { getProtocols } from '@/ai/actions/protocols';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, Users, UserPlus, Clock, ArrowRight, Activity, AlertCircle, TrendingUp, DollarSign, MessageSquare, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DashboardStats {
  attentionCount: number;
  pendingCount: number;
  activePatients: number;
  protocolCount: number;
  patientsInProtocol: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
  protocolAdherence: number;
  communityStats: {
    newTopicsToday: number;
    totalReactions: number;
    participationRate: number;
  };
}

const PLAN_COLORS = {
  freemium: '#94a3b8', // slate
  premium: '#6366f1', // indigo
  vip: '#f59e0b', // amber
};

const PLAN_NAMES = {
  freemium: 'Freemium',
  premium: 'Premium',
  vip: 'VIP',
};

const PLAN_PRICES = {
  freemium: 0,
  premium: 29.90,
  vip: 99.90,
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  link,
  isLoading,
  className,
  description,
  trend,
  sparklineData
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  link?: string;
  isLoading: boolean;
  className?: string;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  sparklineData?: number[];
}) => (
  <Card className={cn("overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group border-l-4", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
      <CardTitle className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">{title}</CardTitle>
      <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </CardHeader>
    <CardContent className="relative z-10 pt-2">
      {isLoading ? (
        <Skeleton className="h-10 w-1/2" />
      ) : (
        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <div className="text-4xl font-extrabold tracking-tight">{value}</div>
            {trend && (
              <Badge variant={trend.isPositive ? "default" : "secondary"} className="mb-1.5 text-xs">
                <TrendingUp className={cn("h-3 w-3 mr-1", !trend.isPositive && "rotate-180")} />
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </Badge>
            )}
          </div>
          {description && <p className="text-xs font-medium text-muted-foreground/80">{description}</p>}

          {/* Mini Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="h-8 mt-2 opacity-60">
              <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  points={sparklineData.map((val, i) => `${(i / (sparklineData.length - 1)) * 100},${30 - (val / Math.max(...sparklineData)) * 25}`).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                />
              </svg>
            </div>
          )}

          {link && (
            <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Link href={link}>
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8 hover:bg-background/50 font-semibold">
                  Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </CardContent>
    <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50 blur-2xl group-hover:opacity-100 transition-opacity" />
  </Card>
);

// Simple Donut Chart component using native SVG
const DonutChart = ({ data, total }: { data: { plan: string; count: number; percentage: number }[]; total: number }) => {
  let currentAngle = 0;

  const createArc = (percentage: number, color: string) => {
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle = endAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Background circle */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />

      {/* Data segments */}
      {data.map((item, index) => (
        <path
          key={index}
          d={createArc(item.percentage, PLAN_COLORS[item.plan as keyof typeof PLAN_COLORS])}
          fill={PLAN_COLORS[item.plan as keyof typeof PLAN_COLORS]}
          opacity="0.8"
        />
      ))}

      {/* Inner white circle for donut effect */}
      <circle cx="50" cy="50" r="25" fill="white" />

      {/* Center text */}
      <text x="50" y="48" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#374151">
        {total}
      </text>
      <text x="50" y="56" textAnchor="middle" fontSize="6" fill="#9ca3af">
        pacientes
      </text>
    </svg>
  );
};

export default function ClinicDashboardPage() {
  const { patients, loading: patientsLoading } = usePatients();
  const [stats, setStats] = useState<DashboardStats>({
    attentionCount: 0,
    pendingCount: 0,
    activePatients: 0,
    protocolCount: 0,
    patientsInProtocol: 0,
    planDistribution: [],
    protocolAdherence: 0,
    communityStats: {
      newTopicsToday: 0,
      totalReactions: 0,
      participationRate: 0,
    },
  });
  const [protocolsLoading, setProtocolsLoading] = useState(true);

  // Simulated sparkline data (últimos 30 dias)
  const sparklineData = [45, 52, 48, 61, 68, 70, 73];

  useEffect(() => {
    async function fetchProtocolData() {
      try {
        setProtocolsLoading(true);
        const protocols = await getProtocols();
        setStats(prev => ({ ...prev, protocolCount: protocols.length }));
      } catch (error) {
        console.error("Failed to fetch protocols", error);
      } finally {
        setProtocolsLoading(false);
      }
    }
    fetchProtocolData();
  }, []);

  useEffect(() => {
    if (!patientsLoading) {
      const attentionCount = patients.filter(p => p.needsAttention && p.status !== 'pending').length;
      const pendingCount = patients.filter(p => p.status === 'pending').length;
      const activePatients = patients.filter(p => p.status === 'active').length;

      // Calculate plan distribution
      const planDist = patients.reduce((acc, p) => {
        const plan = p.subscription.plan || 'freemium';
        const existing = acc.find(item => item.plan === plan);
        if (existing) {
          existing.count++;
          existing.revenue += PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
        } else {
          acc.push({
            plan,
            count: 1,
            revenue: PLAN_PRICES[plan as keyof typeof PLAN_PRICES]
          });
        }
        return acc;
      }, [] as { plan: string; count: number; revenue: number }[]);

      // Mock: Pacientes em protocolo ativo
      const patientsInProtocol = Math.floor(activePatients * 0.6);

      // Mock: Aderência aos protocolos
      const protocolAdherence = 78;

      // Mock: Estatísticas da comunidade
      const communityStats = {
        newTopicsToday: 3,
        totalReactions: 127,
        participationRate: 34,
      };

      setStats(prev => ({
        ...prev,
        attentionCount,
        pendingCount,
        activePatients,
        planDistribution: planDist,
        patientsInProtocol,
        protocolAdherence,
        communityStats,
      }));
    }
  }, [patients, patientsLoading]);

  const isLoading = patientsLoading || protocolsLoading;

  // Calculate MRR
  const totalMRR = stats.planDistribution.reduce((sum, item) => sum + item.revenue, 0);
  const totalPatients = stats.planDistribution.reduce((sum, item) => sum + item.count, 0);

  // Prepare donut data
  const donutData = stats.planDistribution.map(item => ({
    plan: item.plan,
    count: item.count,
    percentage: totalPatients > 0 ? (item.count / totalPatients) * 100 : 0
  }));

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-background/50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Visão Geral</h2>
          <p className="text-muted-foreground">Acompanhe o desempenho da sua clínica em tempo real.</p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fila de Atenção"
          value={stats.attentionCount}
          icon={AlertCircle}
          link="/patients?tab=attention"
          isLoading={isLoading}
          className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/50"
          description="Pacientes aguardando resposta"
        />
        <StatCard
          title="Cadastros Pendentes"
          value={stats.pendingCount}
          icon={UserPlus}
          link="/patients?tab=pending"
          isLoading={isLoading}
          className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50"
          description="Novos usuários para aprovar"
        />
        <StatCard
          title="Pacientes Ativos"
          value={stats.activePatients}
          icon={Activity}
          link="/patients"
          isLoading={isLoading}
          className="bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50"
          description="Em acompanhamento regular"
          trend={{ value: 12, isPositive: true }}
          sparklineData={sparklineData}
        />
        <StatCard
          title="Em Protocolo Ativo"
          value={stats.patientsInProtocol}
          icon={Target}
          link="/protocols"
          isLoading={isLoading}
          className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50"
          description="Pacientes seguindo protocolos"
        />
      </div>

      {/* Second Row: Revenue + Engagement */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Revenue Distribution (Donut Chart) */}
        <Card className="lg:col-span-3 border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Distribuição de Receita
            </CardTitle>
            <CardDescription>Receita mensal recorrente por plano</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-[200px]">
                  <DonutChart data={donutData} total={totalPatients} />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(totalMRR)}</p>
                  <p className="text-xs text-muted-foreground">MRR Total</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {stats.planDistribution.map(item => (
                    <div key={item.plan} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${PLAN_COLORS[item.plan as keyof typeof PLAN_COLORS]}20` }}>
                      <div className="font-bold capitalize">{PLAN_NAMES[item.plan as keyof typeof PLAN_NAMES]}</div>
                      <div className="text-muted-foreground">{item.count} pac.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card className="lg:col-span-2 border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Engajamento
            </CardTitle>
            <CardDescription>Aderência aos programas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Aderência</span>
                    <span className="text-2xl font-bold">{stats.protocolAdherence}%</span>
                  </div>
                  <Progress value={stats.protocolAdherence} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Meta: 90%</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="border rounded-lg p-2 text-center bg-green-50/50">
                    <div className="text-xl font-bold text-green-700">{Math.round(stats.patientsInProtocol * 0.78)}</div>
                    <div className="text-muted-foreground">Concluíram</div>
                  </div>
                  <div className="border rounded-lg p-2 text-center bg-amber-50/50">
                    <div className="text-xl font-bold text-amber-700">{Math.round(stats.patientsInProtocol * 0.22)}</div>
                    <div className="text-muted-foreground">Em progresso</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Community Health */}
        <Card className="lg:col-span-2 border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Comunidade
            </CardTitle>
            <CardDescription>Atividade e engajamento</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tópicos hoje</span>
                  <span className="text-lg font-bold">{stats.communityStats.newTopicsToday}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reações</span>
                  <span className="text-lg font-bold">{stats.communityStats.totalReactions}</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Participação</span>
                    <span className="text-lg font-bold">{stats.communityStats.participationRate}%</span>
                  </div>
                  <Progress value={stats.communityStats.participationRate} className="h-1.5" />
                </div>
                <Link href="/community">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Moderar
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pacientes Recentes */}
      <div className="grid gap-4">
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Pacientes Recentes
            </CardTitle>
            <CardDescription>Últimas interações registradas na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map(patient => (
                  <Link href={`/patient/${patient.id}`} key={patient.id} className="flex items-center p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group border border-transparent hover:border-border/50">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                      <AvatarImage src={patient.avatar} alt={patient.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{patient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1 flex-1">
                      <p className="text-sm font-semibold leading-none group-hover:text-primary transition-colors">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.email}</p>
                    </div>
                    <div className="ml-auto text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                      {patient.lastMessageTimestamp ? formatDistanceToNow(new Date(patient.lastMessageTimestamp as string), { addSuffix: true, locale: ptBR }) : 'Sem atividade'}
                    </div>
                  </Link>
                ))}
                {patients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum paciente encontrado.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
