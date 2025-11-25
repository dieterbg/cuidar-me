

"use client";

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck, AlertTriangle, Database, Star, Check, FilePenLine, Trash2, EyeOff, MessageCircleWarning, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Patient, PatientPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { getPatients, seedDatabase } from '@/ai/actions';
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


const riskLevelConfig: { [key in Patient['riskLevel'] & string]: { icon: React.ElementType, color: string, label: string } } = {
    low: {
      icon: ShieldCheck,
      color: 'text-green-500',
      label: 'Baixo Risco'
    },
    medium: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      label: 'Risco Médio'
    },
    high: {
      icon: AlertTriangle,
      color: 'text-red-500',
      label: 'Alto Risco'
    },
};

const planConfig: { [key in PatientPlan]: { icon: React.ElementType, label: string } } = {
    freemium: {
      icon: Check,
      label: 'Freemium'
    },
    premium: {
      icon: Star,
      label: 'Premium'
    },
    vip: {
      icon: Star,
      label: 'VIP'
    },
};

const StatusIndicator = ({ patient }: { patient: Patient }) => {
    if (patient.status === 'pending') {
        return (
            <div className="flex items-center gap-1.5" title="Cadastro Pendente">
                <FilePenLine className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-500 font-semibold">Pendente</span>
            </div>
        );
    }
    
    if (patient.subscription.plan && patient.subscription.plan !== 'freemium') {
        const level = patient.riskLevel;
        if (!level || !riskLevelConfig[level]) return <span className="text-sm text-muted-foreground">Monitorado</span>;
        
        const config = riskLevelConfig[level];
        const Icon = config.icon;

        return (
            <div className="flex items-center gap-1.5" title={config.label}>
                <Icon className={cn("h-4 w-4", config.color)} />
                <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
        );
    }

    // Default for free plan or no plan
    return <span className="text-sm text-muted-foreground">Não monitorado</span>;
};


export default function PatientsListPage() {
  const { user, loading: authLoading, triggerPatientsUpdate } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSeeding, startSeedingTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('attention');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
          const fetchedPatients = await getPatients();
          setPatients(fetchedPatients);
      } catch(err: any) {
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
      );
  }, [patients, activeTab, searchTerm]);
  
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
        <div className="text-center py-10 col-span-full">
            <EyeOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{messages[activeTab as keyof typeof messages]}</h3>
            <p className="text-muted-foreground mt-1">
                {activeTab === 'all' ? 'Tente popular o banco de dados ou verifique os outros filtros.' : 'Tudo em ordem por aqui!'}
            </p>
        </div>
      )
    }

    return (
        <>
            {list.map((patient) => (
                <Link href={`/patient/${patient.id}`} key={patient.id} className="block group">
                    <div className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm h-full flex flex-col group-hover:bg-secondary transition-colors relative", {
                        "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10": patient.status === 'pending'
                    })}>
                    {patient.needsAttention && (
                        <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 animate-pulse" title="Requer Atenção"></div>
                    )}
                    <div className="flex items-start gap-4 mb-3">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={patient.avatar} alt={patient.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-semibold truncate flex items-center gap-2">
                                {patient.name}
                                {patient.subscription.priority === 3 && <div title="Paciente VIP"><Star className="h-4 w-4 text-amber-400 fill-amber-400" /></div>}
                            </h3>
                             {patient.status === 'pending' ? (
                                <Badge variant="destructive" className="capitalize mt-1">Pendente</Badge>
                             ) : (
                                <p className="text-xs text-muted-foreground">{planConfig[patient.subscription.plan].label}</p>
                             )}
                        </div>
                    </div>
                    
                    {patient.attentionRequest ? (
                        <div className="flex-grow space-y-2 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 rounded-r-md">
                           <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                               <MessageCircleWarning className="h-4 w-4" />
                               <p className="text-sm font-semibold">{patient.attentionRequest.reason}</p>
                           </div>
                           <p className="text-sm text-muted-foreground italic truncate">"{patient.attentionRequest.triggerMessage}"</p>
                        </div>
                    ) : (
                         <div className="flex-grow">
                            <p className="text-sm text-muted-foreground italic truncate">"{patient.lastMessage}"</p>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <StatusIndicator patient={patient} />
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{patient.lastMessageTimestamp ? formatDistanceToNow(new Date(patient.lastMessageTimestamp as string), { addSuffix: true, locale: ptBR }) : ''}</span>
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
      <div className="flex-1 flex items-center justify-center bg-background">
        Carregando...
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Pacientes
            </h1>
            <p className="text-muted-foreground">
                Gerencie seus pacientes em programas de emagrecimento e aprove novos cadastros.
            </p>
          </div>
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Popular Dados de Exemplo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá <span className="font-bold text-destructive">APAGAR TODOS OS DADOS ATUAIS</span> (pacientes, conversas, protocolos, etc.) e substituí-los pelos dados de exemplo do arquivo `data.ts`. Isso é útil para demonstrações ou para resetar o ambiente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSeeding}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSeedDatabase} disabled={isSeeding} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Sim, Apagar e Popular'}
                    </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
      </div>

      <Tabs defaultValue="attention" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
                <TabsTrigger value="attention" className="flex items-center gap-2">
                    Fila de Atenção
                    {attentionCount > 0 && <Badge className="bg-red-500 text-white">{attentionCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                    Pendentes
                    {pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-auto sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar por nome..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="mt-6">
            {isLoadingPatients ? (
                <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Buscando pacientes...</p>
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

    
