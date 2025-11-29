"use client";

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck, AlertTriangle, Database, Star, Check, FilePenLine, Trash2, EyeOff, MessageCircleWarning, Clock, Loader2, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Patient, PatientPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { getPatients } from '@/ai/actions/patients';
import { seedDatabase } from '@/ai/seed-database';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


const riskLevelConfig: { [key in Patient['riskLevel'] & string]: { icon: React.ElementType, color: string, label: string, bg: string } } = {
  low: {
    icon: ShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100/50 dark:bg-emerald-900/20',
    label: 'Baixo Risco'
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100/50 dark:bg-amber-900/20',
    label: 'Risco Médio'
  },
  high: {
    icon: AlertTriangle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100/50 dark:bg-rose-900/20',
    label: 'Alto Risco'
  },
};

const planConfig: { [key in PatientPlan]: { icon: React.ElementType, label: string, color: string } } = {
  freemium: {
    icon: Check,
    label: 'Freemium',
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  premium: {
    icon: Star,
    label: 'Premium',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  },
  vip: {
    icon: Star,
    label: 'VIP',
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
};

const StatusIndicator = ({ patient }: { patient: Patient }) => {
  if (patient.status === 'pending') {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
        <FilePenLine className="h-3 w-3" />
        Pendente
      </Badge>
    );
  }

  if (patient.subscription.plan && patient.subscription.plan !== 'freemium') {
    const level = patient.riskLevel;
    if (!level || !riskLevelConfig[level]) return <Badge variant="secondary">Monitorado</Badge>;

    const config = riskLevelConfig[level];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("gap-1 border-0", config.bg, config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return <Badge variant="secondary" className="text-muted-foreground bg-slate-100">Não monitorado</Badge>;
};


export default function PatientsListPage() {
  const { user, loading: authLoading, triggerPatientsUpdate } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSeeding, startSeedingTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('attention');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const fetchedPatients = await getPatients();
        setPatients(fetchedPatients);
      } catch (err: any) {
        console.error("Erro ao buscar pacientes:", err);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar pacientes',
          description: err.message || 'Não foi possível buscar os dados do servidor.',
        });
      } finally {
        setIsLoadingPatients(false);
      }
    };

    if (!authLoading && user) {
      fetchPatients();
    }
  }, [user, authLoading, toast, triggerPatientsUpdate]);

  const filteredPatients = useMemo(() => {
    let sortedPatients = [...patients];

    if (activeTab === 'attention') {
      // Sort by priority (desc) then by attention request time (asc)
      sortedPatients.sort((a, b) => {
        const priorityA = a.attentionRequest?.priority || a.subscription.priority || 1;
        const priorityB = b.attentionRequest?.priority || b.subscription.priority || 1;
        if (priorityB !== priorityA) return priorityB - priorityA;
        const timeA = a.attentionRequest?.createdAt ? new Date(a.attentionRequest.createdAt as string).getTime() : 0;
        const timeB = b.attentionRequest?.createdAt ? new Date(b.attentionRequest.createdAt as string).getTime() : 0;
        return timeA - timeB;
      });
    }

    return sortedPatients
      .filter(patient => {
        if (activeTab === 'attention') return patient.needsAttention && patient.status !== 'pending';
        if (activeTab === 'pending') return patient.status === 'pending';
        return true; // 'all' tab
      })
      .filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(patient => {
        if (selectedPlan === 'all') return true;
        return patient.subscription.plan === selectedPlan;
      });
  }, [patients, activeTab, searchTerm, selectedPlan]);

  const handleSeedDatabase = () => {
    startSeedingTransition(async () => {
      const result = await seedDatabase();
      if (result.success) {
        toast({
          title: "Banco de Dados Populado!",
          description: "Os dados de exemplo foram carregados com sucesso.",
        });
        triggerPatientsUpdate(); // Trigger a refetch
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao Popular o Banco",
          description: result.error || "Ocorreu um erro desconhecido.",
        });
      }
    });
  };

  const attentionCount = useMemo(() => patients.filter(p => p.needsAttention && p.status !== 'pending').length, [patients]);
  const pendingCount = useMemo(() => patients.filter(p => p.status === 'pending').length, [patients]);

  const PatientList = ({ list }: { list: Patient[] }) => {
    if (list.length === 0) {
      const messages = {
        attention: 'Nenhum paciente precisando de atenção no momento.',
        pending: 'Nenhum paciente com cadastro pendente.',
        all: 'Nenhum paciente encontrado.',
      };
      return (
        <div className="text-center py-16 col-span-full bg-card/50 rounded-3xl border border-dashed border-border/50">
          <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeOff className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">{messages[activeTab as keyof typeof messages]}</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {activeTab === 'all' ? 'Tente popular o banco de dados ou verifique os outros filtros.' : 'Tudo em ordem por aqui! Aproveite para revisar outros pacientes.'}
          </p>
        </div>
      )
    }

    return (
      <>
        {list.map((patient) => (
          <Link href={`/patient/${patient.id}`} key={patient.id} className="block group h-full">
            <div className={cn(
              "relative p-5 rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 h-full flex flex-col hover:-translate-y-1 hover:shadow-lg hover:border-primary/20",
              {
                "border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10": patient.status === 'pending',
                "border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10": patient.needsAttention
              }
            )}>
              {patient.needsAttention && (
                <span className="absolute top-4 right-4 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}

              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-14 w-14 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                  <AvatarImage src={patient.avatar} alt={patient.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-lg truncate flex items-center gap-2 group-hover:text-primary transition-colors">
                    {patient.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn("text-xs font-normal", planConfig[patient.subscription.plan].color)}>
                      {planConfig[patient.subscription.plan].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {patient.attentionRequest ? (
                <div className="flex-grow mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                    <MessageCircleWarning className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase tracking-wide">Atenção Necessária</p>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{patient.attentionRequest.reason}</p>
                  <p className="text-xs text-muted-foreground italic line-clamp-2">"{patient.attentionRequest.triggerMessage}"</p>
                </div>
              ) : (
                <div className="flex-grow mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Última Mensagem</p>
                  <p className="text-sm text-foreground/80 italic line-clamp-2">"{patient.lastMessage || 'Nenhuma mensagem recente'}"</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                <StatusIndicator patient={patient} />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span>{patient.lastMessageTimestamp ? formatDistanceToNow(new Date(patient.lastMessageTimestamp as string), { addSuffix: true, locale: ptBR }) : 'N/A'}</span>
                </div>
              </div>

            </div>
          </Link>
        ))}
      </>
    );
  };


  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background/50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Pacientes
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gerencie o acompanhamento e evolução clínica.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-dashed">
              <Database className="mr-2 h-4 w-4" />
              Resetar Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá <span className="font-bold text-destructive">APAGAR TODOS OS DADOS ATUAIS</span> e restaurar os dados de exemplo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSeeding}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeedDatabase} disabled={isSeeding} className="bg-destructive hover:bg-destructive/90">
                {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, Resetar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="attention" className="w-full space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-2 rounded-2xl border border-border/50 backdrop-blur-sm">
          <TabsList className="bg-transparent p-0 h-auto gap-2 flex-wrap justify-start">
            <TabsTrigger value="attention" className="data-[state=active]:bg-[#899d5e] data-[state=active]:text-white data-[state=active]:shadow-md rounded-full px-6 py-2.5 h-10 transition-all font-medium">
              Atenção
              {attentionCount > 0 && <Badge className="ml-2 bg-white text-[#899d5e] border-none h-5 px-1.5 shadow-sm">{attentionCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-[#899d5e] data-[state=active]:text-white data-[state=active]:shadow-md rounded-full px-6 py-2.5 h-10 transition-all font-medium">
              Pendentes
              {pendingCount > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-white/20 text-white">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-[#899d5e] data-[state=active]:text-white data-[state=active]:shadow-md rounded-full px-6 py-2.5 h-10 transition-all font-medium">Todos</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background border-border/50 rounded-xl h-10">
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="freemium">Freemium</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-10 bg-background border-border/50 rounded-xl focus-visible:ring-primary/20 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {isLoadingPatients ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary/50" />
              <p className="mt-4 text-muted-foreground animate-pulse">Sincronizando dados...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <PatientList list={filteredPatients} />
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
