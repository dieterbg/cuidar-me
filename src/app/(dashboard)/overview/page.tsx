"use client";

import { useEffect, useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { getProtocols } from '@/ai/actions/protocols';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, Users, UserPlus, Clock, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  attentionCount: number;
  pendingCount: number;
  activePatients: number;
  protocolCount: number;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  link,
  isLoading,
  className,
  description
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  link?: string;
  isLoading: boolean;
  className?: string;
  description?: string;
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
          <div className="text-4xl font-extrabold tracking-tight">{value}</div>
          {description && <p className="text-xs font-medium text-muted-foreground/80">{description}</p>}
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
    {/* Decorative background element */}
    <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50 blur-2xl group-hover:opacity-100 transition-opacity" />
  </Card>
);

export default function ClinicDashboardPage() {
  const { patients, loading: patientsLoading } = usePatients();
  const [stats, setStats] = useState<DashboardStats>({
    attentionCount: 0,
    pendingCount: 0,
    activePatients: 0,
    protocolCount: 0,
  });
  const [protocolsLoading, setProtocolsLoading] = useState(true);

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
      setStats(prev => ({ ...prev, attentionCount, pendingCount, activePatients }));
    }
  }, [patients, patientsLoading]);

  const isLoading = patientsLoading || protocolsLoading;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-background/50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Visão Geral</h2>
          <p className="text-muted-foreground">Acompanhe o desempenho da sua clínica em tempo real.</p>
        </div>
      </div>

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
        />
        <StatCard
          title="Protocolos"
          value={stats.protocolCount}
          icon={ClipboardList}
          link="/protocols"
          isLoading={isLoading}
          className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50"
          description="Programas de tratamento ativos"
        />
      </div>

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
