

"use client";

import { notFound, useRouter, useParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback, useTransition } from 'react';
import { ArrowLeft, MessageSquare, Video, Calendar, Send, ClipboardList, PlayCircle, StopCircle, Loader2, ShieldOff, ThumbsUp, ThumbsDown, UserCog, ShieldAlert, Star, Target, Pencil, Save, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatPanel } from '@/components/chat-panel';
import type { Patient, Protocol, SentVideo, Message, HealthMetric, PatientPlan, ScheduledMessage, Video as VideoType } from '@/lib/types';
import { assignProtocolToPatient, unassignProtocolFromPatient, getPatientDetails, getProtocols, getScheduledMessagesForPatient, updateScheduledMessage, updateSentVideoFeedback } from '@/ai/actions';
import { HealthMetricsChart } from '@/components/health-metrics-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { PatientEditForm } from '@/components/patient-edit-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PatientAnalysisPanel } from '@/components/patient-analysis-panel';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getVideos } from '@/ai/actions';


const statusConfig: { [key in ScheduledMessage['status']]: { icon: React.ElementType, color: string, label: string } } = {
    pending: { icon: Clock, color: 'text-amber-500', label: 'Pendente' },
    sent: { icon: CheckCircle, color: 'text-green-500', label: 'Enviada' },
    error: { icon: AlertTriangle, color: 'text-red-500', label: 'Erro' },
};


function EditMessagePopover({ message, onSave, isSaving }: { message: ScheduledMessage, onSave: (messageId: string, updates: Partial<ScheduledMessage>) => void, isSaving: boolean }) {
    const [date, setDate] = useState<Date | undefined>(new Date(message.sendAt as string));
    const [time, setTime] = useState(format(new Date(message.sendAt as string), 'HH:mm'));
    const [content, setContent] = useState(message.messageContent);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleSave = () => {
        if (!date) return;
        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes);

        onSave(message.id, { sendAt: newDate.toISOString(), messageContent: content });
        setPopoverOpen(false);
    };

    return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4">
                <p className="text-sm font-medium">Editar Agendamento</p>
                <div className="space-y-2">
                    <Label htmlFor={`content-${message.id}`}>Mensagem</Label>
                    <Textarea id={`content-${message.id}`} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                    <Label>Data e Hora</Label>
                    <CalendarPicker
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                    <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </PopoverContent>
        </Popover>
    );
}


export default function PatientProfilePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user, profile, loading: authLoading } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [allVideos, setAllVideos] = useState<VideoType[]>([]);
    const [sentVideos, setSentVideos] = useState<SentVideo[]>([]);
    const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isSavingMessage, startSavingMessageTransition] = useTransition();

    const [selectedProtocol, setSelectedProtocol] = useState('');
    const [weightGoal, setWeightGoal] = useState<string>('');
    const [activeTab, setActiveTab] = useState('conversation');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const patientId = params.id as string;

    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (!patientId) return;
        if (isInitialLoad) setLoading(true);

        setError(null);

        try {
            const details = await getPatientDetails(patientId);
            if (details && details.patient) {
                setPatient(details.patient);
                setMetrics(details.metrics);
                setSentVideos(details.sentVideos);

                if (isInitialLoad) {
                    setSelectedProtocol(details.patient.protocol?.protocolId || '');
                    if (details.patient.status === 'pending' && !isEditModalOpen) {
                        setIsEditModalOpen(true);
                    }
                }
            } else {
                setPatient(null);
                if (isInitialLoad) notFound();
                return;
            }

            try {
                const [fetchedProtocols, fetchedMessages, fetchedVideos] = await Promise.all([
                    getProtocols(),
                    getScheduledMessagesForPatient(patientId),
                    getVideos(),
                ]);
                setProtocols(fetchedProtocols);
                setScheduledMessages(fetchedMessages);
                setAllVideos(fetchedVideos);
            } catch (secondaryError: any) {
                console.error("Error fetching secondary data:", secondaryError);
                setError('Erro ao carregar dados de protocolos ou agendamentos. A página pode estar incompleta.');
            }

        } catch (error: any) {
            console.error("Error fetching patient details:", error);
            if (isInitialLoad) notFound();
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [patientId, toast, isEditModalOpen, notFound]);

    useEffect(() => {
        fetchData(true);

        const supabase = createClient();

        // Buscar mensagens iniciais
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('patient_id', patientId)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
                toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Não foi possível carregar as mensagens.' });
            } else if (data) {
                setConversation(data as Message[]);
            }
        };

        fetchMessages();

        // Configurar listener em tempo real para mensagens
        const channel = supabase
            .channel(`messages:${patientId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `patient_id=eq.${patientId}`,
                },
                async (payload: any) => {
                    // Recarregar todas as mensagens para manter ordem
                    const { data } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('patient_id', patientId)
                        .order('timestamp', { ascending: true });

                    if (data) {
                        setConversation(data as Message[]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [patientId, fetchData, toast]);


    const activeProtocol = useMemo(() => protocols.find(p => p.id === patient?.protocol?.protocolId), [patient, protocols]);

    const availableProtocols = useMemo(() => {
        if (!patient) return [];
        const plan = patient.subscription.plan;
        return protocols.filter(p => p.eligiblePlans.includes(plan));
    }, [protocols, patient]);

    const patientSentVideos = useMemo(() => {
        return sentVideos
            .map((sv) => {
                const videoData = allVideos.find((v) => v.id === sv.videoId);
                if (!videoData) return null;
                return { ...sv, ...videoData };
            })
            .filter((v): v is SentVideo & VideoType => v !== null)
            .sort((a, b) => new Date(b.sentAt as string).getTime() - new Date(a.sentAt as string).getTime());
    }, [sentVideos, allVideos]);


    const handleUpdateFeedback = async (sentVideoId: string, feedback: 'liked' | 'disliked') => {
        try {
            await updateSentVideoFeedback(patientId, sentVideoId, feedback);
            setSentVideos(current => current.map(sv => sv.id === sentVideoId ? { ...sv, feedback } : sv));
            toast({
                title: "Feedback Registrado!",
                description: "O feedback do paciente foi atualizado.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao registrar feedback',
                description: error.message,
            });
        }
    };

    const handleAssignProtocol = async () => {
        if (!selectedProtocol) {
            toast({ variant: 'destructive', title: 'Selecione um protocolo' });
            return;
        }
        setIsAssigning(true);
        try {
            const goal = weightGoal ? parseFloat(weightGoal) : null;
            const result = await assignProtocolToPatient(patientId, selectedProtocol, goal);
            if (result.success) {
                toast({ title: 'Protocolo atribuído com sucesso!' });
                setActiveTab('protocol');
                fetchData(true);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao atribuir protocolo', description: error.message });
        } finally {
            setIsAssigning(false);
        }
    }

    const handleUnassignProtocol = async () => {
        setIsAssigning(true);
        try {
            const result = await unassignProtocolFromPatient(patientId);
            if (result.success) {
                toast({ title: 'Protocolo desvinculado com sucesso' });
                fetchData(true);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao desvincular protocolo', description: error.message });
        } finally {
            setIsAssigning(false);
        }
    }

    const handleSaveMessage = (messageId: string, updates: Partial<ScheduledMessage>) => {
        startSavingMessageTransition(async () => {
            const result = await updateScheduledMessage(messageId, updates);
            if (result.success) {
                toast({ title: "Agendamento atualizado!" });
                fetchData();
            } else {
                toast({ variant: 'destructive', title: "Erro ao atualizar", description: result.error });
            }
        });
    };


    const dayInProtocol = patient?.protocol?.currentDay || 0;

    const planLabels: { [key in PatientPlan]: string } = {
        freemium: 'Plano Freemium',
        premium: 'Plano Premium',
        vip: 'Plano VIP'
    }

    if (loading || authLoading) {
        return <div className="flex h-screen items-center justify-center">Carregando dados do paciente...</div>;
    }

    if (!patient) {
        return null;
    }

    const handleSaveSuccess = () => {
        setIsEditModalOpen(false);
        fetchData(true);
    };


    const isPremiumOrVip = patient.subscription.plan === 'premium' || patient.subscription.plan === 'vip';
    const showAnalysisPanel = isPremiumOrVip && (profile?.role === 'admin' || profile?.role === 'equipe_saude');
    const canEditPatient = profile && profile.role !== 'paciente';

    return (
        <div className="flex-1 bg-muted/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <div>
                    <Button variant="ghost" onClick={() => router.push('/patients')} className="px-0 hover:bg-transparent">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Pacientes
                    </Button>
                </div>

                <div className="flex flex-col lg:flex-row items-start gap-8">
                    <Avatar className="h-24 w-24 border-4 border-background">
                        <AvatarImage src={patient.avatar} alt={patient.name} />
                        <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="pt-2 flex-grow">
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            {patient.name}
                            {patient.subscription.priority === 3 && <div title="Paciente VIP"><Star className="h-6 w-6 text-amber-400 fill-amber-400" /></div>}
                        </h1>
                        <p className="text-muted-foreground">ID do Paciente: {patient.id}</p>
                        {patient.subscription.plan ? <Badge className="mt-2" variant={patient.subscription.plan === 'freemium' ? 'secondary' : 'default'}>{planLabels[patient.subscription.plan]}</Badge> : <Badge className="mt-2" variant="outline">Sem Plano</Badge>}
                        {patient.status === 'pending' && <Badge className="mt-2 ml-2" variant="destructive">Pendente</Badge>}
                    </div>
                    {canEditPatient && (
                        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Editar Paciente
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {patient.status === 'pending' ? 'Ativar Cadastro do Paciente' : 'Editar Paciente'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {patient.status === 'pending'
                                            ? 'Altere o status para "Ativo" para aprovar o cadastro e permitir que o paciente acesse o portal.'
                                            : 'Atualize as informações do paciente abaixo.'
                                        }
                                    </DialogDescription>
                                </DialogHeader>
                                <PatientEditForm patient={patient} onSave={handleSaveSuccess} context="admin" />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2">
                        {isPremiumOrVip ? (
                            <HealthMetricsChart metrics={metrics} patientHeight={patient.height} />
                        ) : (
                            <Card className="flex items-center justify-center h-full min-h-[300px]">
                                <div className="text-center p-4">
                                    <ShieldOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-semibold text-lg">Funcionalidade Indisponível</h3>
                                    <p className="text-muted-foreground">
                                        Gráficos e análise de IA não estão disponíveis para este plano.
                                    </p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                Gerenciar Protocolo
                            </CardTitle>
                            <CardDescription>Atribua ou altere o protocolo para este paciente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!isPremiumOrVip && (
                                <div className="p-3 rounded-md border bg-amber-50 text-amber-900 text-sm">
                                    Protocolos só podem ser atribuídos a pacientes dos planos Premium ou VIP.
                                </div>
                            )}
                            {patient.status === 'pending' && (
                                <div className="p-3 rounded-md border bg-blue-50 text-blue-900 text-sm">
                                    Ative o cadastro do paciente para atribuir um protocolo.
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="protocol-select">Protocolo de Acompanhamento</Label>
                                <Select onValueChange={setSelectedProtocol} value={selectedProtocol} disabled={!!activeProtocol || !isPremiumOrVip || patient.status === 'pending'}>
                                    <SelectTrigger id="protocol-select">
                                        <SelectValue placeholder="Nenhum protocolo atribuído" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableProtocols.map(protocol => (
                                            <SelectItem key={protocol.id} value={protocol.id}>{protocol.name}</SelectItem>
                                        ))}
                                        {availableProtocols.length === 0 && isPremiumOrVip && (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                Nenhum protocolo disponível para o plano {patient.subscription.plan}.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight-goal">Meta de Peso (kg)</Label>
                                <Input
                                    id="weight-goal"
                                    type="number"
                                    placeholder="Ex: 85.5"
                                    value={weightGoal}
                                    onChange={(e) => setWeightGoal(e.target.value)}
                                    disabled={!!activeProtocol || !isPremiumOrVip || patient.status === 'pending'}
                                />
                            </div>
                            {activeProtocol && patient.protocol && isPremiumOrVip && (
                                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border space-y-2">
                                    <p>Iniciado em: <strong className="text-foreground">{format(parseISO(patient.protocol.startDate as string), 'dd/MM/yyyy')}</strong></p>
                                    <p>Hoje é o <strong className="text-foreground">Dia {dayInProtocol}</strong> do protocolo.</p>
                                    {patient.protocol.weightGoal && (
                                        <p className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-primary" /> Meta de Peso: <strong className="text-foreground">{patient.protocol.weightGoal} kg</strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            {!activeProtocol ? (
                                <Button onClick={handleAssignProtocol} disabled={isAssigning || !selectedProtocol || !isPremiumOrVip || patient.status === 'pending'} className="w-full">
                                    {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Iniciar Protocolo Selecionado
                                </Button>
                            ) : (
                                <Button onClick={handleUnassignProtocol} disabled={isAssigning || !isPremiumOrVip} className="w-full" variant="destructive">
                                    {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <StopCircle className="mr-2 h-4 w-4" />
                                    Parar Protocolo Atual
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>


                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                        <TabsTrigger value="conversation"><MessageSquare className="mr-2 h-4 w-4" />Conversa</TabsTrigger>
                        {isPremiumOrVip && <TabsTrigger value="protocol"><ClipboardList className="mr-2 h-4 w-4" />Etapas do Protocolo</TabsTrigger>}
                        <TabsTrigger value="schedules"><Calendar className="mr-2 h-4 w-4" />Agendamentos</TabsTrigger>
                        <TabsTrigger value="content"><Video className="mr-2 h-4 w-4" />Conteúdo Enviado</TabsTrigger>
                        {showAnalysisPanel && <TabsTrigger value="analysis"><ShieldAlert className="mr-2 h-4 w-4" />Análise de IA</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="conversation">
                        <ChatPanel
                            patient={patient}
                            conversation={conversation}
                            onNewMessage={(newMessages) => setConversation(newMessages)}
                            onPatientUpdate={(updatedPatient) => setPatient(updatedPatient)}
                            showAnalysis={showAnalysisPanel}
                        />
                    </TabsContent>
                    <TabsContent value="protocol">
                        <Card>
                            <CardHeader>
                                <CardTitle>Etapas do Protocolo: {activeProtocol?.name || 'Nenhum'}</CardTitle>
                                <CardDescription>Acompanhe as mensagens automáticas programadas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {activeProtocol ? (
                                    <div className="space-y-4">
                                        {activeProtocol.messages.sort((a, b) => a.day - b.day).map((step, index) => {
                                            const isCompleted = dayInProtocol > step.day;
                                            const isPending = dayInProtocol === step.day;
                                            const isScheduled = dayInProtocol < step.day;

                                            return (
                                                <div key={index} className={cn("flex items-start p-3 rounded-md border group", {
                                                    "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800": isCompleted,
                                                    "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800": isPending,
                                                    "bg-muted/50": isScheduled
                                                })}>
                                                    <div className={cn("flex items-center justify-center h-8 w-8 rounded-full mr-4 shrink-0", {
                                                        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300": isCompleted,
                                                        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300": isPending,
                                                        "bg-primary/10": isScheduled
                                                    })}>
                                                        <span className="font-bold">{step.day}</span>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-medium text-sm">{step.message}</p>
                                                        <p className="text-sm text-muted-foreground">{step.title}</p>
                                                    </div>
                                                    {isCompleted ? (
                                                        <Badge variant="secondary" className="bg-green-600 text-white">Enviada</Badge>
                                                    ) : isPending ? (
                                                        <Badge>Pendente</Badge>
                                                    ) : (
                                                        <Badge variant='outline'>Agendada</Badge>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Nenhum protocolo ativo para este paciente.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="schedules">
                        <Card>
                            <CardHeader>
                                <CardTitle>Mensagens Agendadas</CardTitle>
                                <CardDescription>Visualize e edite as próximas mensagens automáticas para este paciente.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <Skeleton className="h-40 w-full" />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Mensagem</TableHead>
                                                <TableHead>Enviar Em</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {scheduledMessages.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">Nenhuma mensagem agendada para este paciente.</TableCell>
                                                </TableRow>
                                            ) : (
                                                scheduledMessages.map(msg => {
                                                    const config = statusConfig[msg.status];
                                                    return (
                                                        <TableRow key={msg.id}>
                                                            <TableCell>
                                                                <div className={cn("flex items-center gap-2 font-medium", config.color)}>
                                                                    <config.icon className="h-4 w-4" />
                                                                    {config.label}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell><p className="truncate max-w-[300px]">{msg.messageContent}</p></TableCell>
                                                            <TableCell className="whitespace-nowrap">{format(new Date(msg.sendAt as string), "dd/MM/yy 'às' HH:mm")}</TableCell>
                                                            <TableCell className="text-right">
                                                                {msg.status === 'pending' && (
                                                                    <EditMessagePopover
                                                                        message={msg}
                                                                        onSave={handleSaveMessage}
                                                                        isSaving={isSavingMessage}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="content">
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Conteúdo Educativo</CardTitle>
                                <CardDescription>Vídeos enviados para este paciente e seu feedback.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {patientSentVideos.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {patientSentVideos.map((video) => (
                                            <Card key={video.id} className="overflow-hidden flex flex-col">
                                                <div className="aspect-video relative">
                                                    <Image src={video.thumbnailUrl!} alt={video.title!} fill className="object-cover" />
                                                </div>
                                                <div className="p-4 flex-grow">
                                                    <h3 className="font-semibold mb-1">{video.title}</h3>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Calendar className="mr-2 h-3 w-3" />
                                                        <span>Enviado {formatDistanceToNow(new Date(video.sentAt as string), { addSuffix: true, locale: ptBR })}</span>
                                                    </div>
                                                </div>
                                                <CardFooter className="p-2 border-t flex-col items-start gap-2">
                                                    <p className="text-xs text-muted-foreground px-2">Feedback do paciente:</p>
                                                    <div className="w-full grid grid-cols-2 gap-2">
                                                        <Button
                                                            variant={video.feedback === 'liked' ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => handleUpdateFeedback(video.id, 'liked')}
                                                            className={cn("w-full", video.feedback === 'liked' && "bg-green-600 hover:bg-green-700")}
                                                        >
                                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                                            Gostei
                                                        </Button>
                                                        <Button
                                                            variant={video.feedback === 'disliked' ? 'destructive' : 'outline'}
                                                            size="sm"
                                                            onClick={() => handleUpdateFeedback(video.id, 'disliked')}
                                                        >
                                                            <ThumbsDown className="mr-2 h-4 w-4" />
                                                            Não Gostei
                                                        </Button>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">Nenhum conteúdo foi enviado para este paciente ainda.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="analysis">
                        <PatientAnalysisPanel patientId={patientId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
