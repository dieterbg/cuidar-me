
"use client";

import { useEffect, useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { getProtocols } from '@/ai/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, UserPlus, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Patient } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  attentionCount: number;
  pendingCount: number;
  activePatients: number;
  protocolCount: number;
}

const StatCard = ({ title, value, icon: Icon, link, isLoading }: { title: string; value: number | string; icon: React.ElementType; link?: string; isLoading: boolean; }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-1/2" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {link && (
             <Link href={link} className="text-xs text-muted-foreground flex items-center hover:text-primary">
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          )}
        </>
      )}
    </CardContent>
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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard da Clínica</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Fila de Atenção" 
            value={stats.attentionCount}
            icon={Clock} 
            link="/patients"
            isLoading={isLoading}
        />
        <StatCard 
            title="Cadastros Pendentes" 
            value={stats.pendingCount} 
            icon={UserPlus}
            link="/patients"
            isLoading={isLoading}
        />
        <StatCard 
            title="Pacientes Ativos" 
            value={stats.activePatients} 
            icon={Users}
            link="/patients"
            isLoading={isLoading}
        />
        <StatCard 
            title="Protocolos Criados" 
            value={stats.protocolCount} 
            icon={ClipboardList}
            link="/protocols"
            isLoading={isLoading}
        />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 pt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pacientes Recentes</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
             ) : (
                <div className="space-y-2">
                    {patients.slice(0, 5).map(patient => (
                        <Link href={`/patient/${patient.id}`} key={patient.id} className="flex items-center p-2 rounded-md hover:bg-muted">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={patient.avatar} alt={patient.name} />
                                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{patient.name}</p>
                                <p className="text-sm text-muted-foreground">{patient.email}</p>
                            </div>
                            <div className="ml-auto text-xs text-muted-foreground">
                                {patient.lastMessageTimestamp ? formatDistanceToNow(new Date(patient.lastMessageTimestamp as string), { addSuffix: true, locale: ptBR }) : 'N/A'}
                            </div>
                        </Link>
                    ))}
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
