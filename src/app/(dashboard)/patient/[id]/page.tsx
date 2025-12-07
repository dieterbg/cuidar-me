"use client";

import { notFound, useRouter, useParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback, useTransition } from 'react';
import { ArrowLeft, MessageSquare, Video, Calendar, Send, ClipboardList, PlayCircle, StopCircle, Loader2, ShieldOff, ThumbsUp, ThumbsDown, UserCog, ShieldAlert, Star, Target, Pencil, Save, Clock, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
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
import { assignProtocolToPatient, unassignProtocolFromPatient, getProtocols } from '@/ai/actions/protocols';
import { getPatientDetails } from '@/ai/actions/patients';
import { getScheduledMessagesForPatient, updateScheduledMessage, getMessages } from '@/ai/actions/messages';
import { updateSentVideoFeedback, getVideos } from '@/ai/actions/videos';
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



const statusConfig: { [key in ScheduledMessage['status']]: { icon: React.ElementType, color: string, label: string, bg: string } } = {
    pending: { icon: Clock, color: 'text-amber-600', label: 'Pendente', bg: 'bg-amber-100' },
    sent: { icon: CheckCircle, color: 'text-emerald-600', label: 'Enviada', bg: 'bg-emerald-100' },
    error: { icon: AlertTriangle, color: 'text-rose-600', label: 'Erro', bg: 'bg-rose-100' },
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
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
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

        // Buscar mensagens iniciais via Server Action
        const loadMessages = async () => {
            try {
                if (!patientId) return;
                const msgs = await getMessages(patientId);
                setConversation(msgs);
            } catch (error) {
                console.error("Failed to load messages:", error);
                // Não mostrar toast aqui para evitar spam se for um erro recorrente de renderização
            }
        };

        loadMessages();

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
                        .order('created_at', { ascending: true });

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
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Carregando prontuário...</p>
                </div>
            </div>
        );
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
        <div className="flex-1 bg-background/50 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div>
                    <Button variant="ghost" onClick={() => router.push('/patients')} className="px-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Lista de Pacientes
                    </Button>
                </div>

                {/* Patient Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 bg-card p-6 rounded-2xl border shadow-sm">
                    <Avatar className={cn("h-24 w-24 border-4 border-background shadow-lg", patient.subscription.priority === 3 && "ring-4 ring-amber-400/30 shadow-amber-100")}>
                        <AvatarImage src={patient.avatar} alt={patient.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-foreground">
                                {patient.name}
                            </h1>
                            {patient.subscription.priority === 3 && (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 gap-1">
                                    <Star className="h-3 w-3 fill-current" /> VIP
                                </Badge>
                            )}
                            {patient.status === 'pending' && <Badge variant="destructive">Cadastro Pendente</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{patient.id.slice(0, 8)}</code></span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <Badge variant="outline" className="font-normal">{planLabels[patient.subscription.plan]}</Badge>
                            {patient.protocol && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="flex items-center gap-1 text-primary font-medium">
                                        <Activity className="h-4 w-4" />
                                        Em Protocolo (Dia {dayInProtocol})
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    {canEditPatient && (
                        <div className="flex gap-3 w-full lg:w-auto">
                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex-1 lg:flex-none">
                                        <UserCog className="mr-2 h-4 w-4" />
                                        Gerenciar Cadastro
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {patient.status === 'pending' ? 'Ativar Cadastro do Paciente' : 'Editar Dados do Paciente'}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {patient.status === 'pending'
                                                ? 'Revise os dados e ative o cadastro para liberar o acesso.'
                                                : 'Atualize as informações clínicas e de contato.'
                                            }
                                        </DialogDescription>
                                    </DialogHeader>
                                    <PatientEditForm patient={patient} onSave={handleSaveSuccess} context="admin" />
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column: Charts & Protocol Management */}
                    <div className="xl:col-span-2 space-y-8">
                        {isPremiumOrVip ? (
                            <HealthMetricsChart metrics={metrics} patientHeight={patient.height} />
                        ) : (
                            <Card className="flex items-center justify-center h-[300px] border-dashed bg-muted/30">
                                <div className="text-center p-6 max-w-sm">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShieldOff className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Análise Avançada Indisponível</h3>
                                    <p className="text-muted-foreground text-sm">
                                        O plano atual deste paciente não inclui gráficos de evolução e análise de IA. Faça um upgrade para visualizar.
                                    </p>
                                </div>
                            </Card>
                        )}

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl mb-6 overflow-x-auto">
                                <TabsTrigger value="conversation" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Conversa
                                </TabsTrigger>
                                {isPremiumOrVip && (
                                    <TabsTrigger value="protocol" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Protocolo
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="schedules" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Agendamentos
                                </TabsTrigger>
                                <TabsTrigger value="content" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Video className="mr-2 h-4 w-4" />
                                    Conteúdo
                                </TabsTrigger>
                                {showAnalysisPanel && (
                                    <TabsTrigger value="analysis" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-amber-600 data-[state=active]:text-amber-700">
                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                        IA Insights
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <TabsContent value="conversation" className="mt-0">
                                <ChatPanel
                                    patient={patient}
                                    conversation={conversation}
                                    onNewMessage={(newMessages) => setConversation(newMessages)}
                                    onPatientUpdate={(updatedPatient) => setPatient(updatedPatient)}
                                    showAnalysis={showAnalysisPanel}
                                />
                            </TabsContent>

                            <TabsContent value="protocol" className="mt-0">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Jornada do Protocolo: {activeProtocol?.name || 'Nenhum'}</CardTitle>
                                        <CardDescription>Acompanhe o progresso diário e as mensagens programadas.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {activeProtocol ? (
                                            <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
                                                {activeProtocol.messages.sort((a, b) => a.day - b.day).map((step, index) => {
                                                    const isCompleted = dayInProtocol > step.day;
                                                    const isPending = dayInProtocol === step.day;
                                                    const isScheduled = dayInProtocol < step.day;

                                                    return (
                                                        <div key={index} className={cn("relative pl-12 py-2 transition-all duration-300", {
                                                            "opacity-50 hover:opacity-100": isScheduled
                                                        })}>
                                                            <div className={cn("absolute left-0 top-3 h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 bg-background transition-colors", {
                                                                "border-emerald-500 text-emerald-600": isCompleted,
                                                                "border-blue-500 text-blue-600 ring-4 ring-blue-100": isPending,
                                                                "border-muted text-muted-foreground": isScheduled
                                                            })}>
                                                                {isCompleted ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-bold">{step.day}</span>}
                                                            </div>

                                                            <div className={cn("p-4 rounded-xl border transition-all", {
                                                                "bg-emerald-50/50 border-emerald-100": isCompleted,
                                                                "bg-blue-50/50 border-blue-200 shadow-sm": isPending,
                                                                "bg-card border-border": isScheduled
                                                            })}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h4 className="font-semibold text-sm">{step.title}</h4>
                                                                    {isCompleted ? (
                                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Concluído</Badge>
                                                                    ) : isPending ? (
                                                                        <Badge className="bg-blue-600 hover:bg-blue-700">Em Andamento</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline">Dia {step.day}</Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{step.message}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                                <p className="text-muted-foreground">Nenhum protocolo ativo no momento.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="schedules" className="mt-0">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Fila de Mensagens</CardTitle>
                                        <CardDescription>Gerencie os disparos automáticos para este paciente.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {loading ? (
                                            <Skeleton className="h-40 w-full" />
                                        ) : (
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Conteúdo</TableHead>
                                                            <TableHead>Programação</TableHead>
                                                            <TableHead className="text-right">Ações</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {scheduledMessages.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                                    Nenhuma mensagem na fila de envio.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            scheduledMessages.map(msg => {
                                                                const config = statusConfig[msg.status];
                                                                return (
                                                                    <TableRow key={msg.id}>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className={cn("gap-1 border-0", config.bg, config.color)}>
                                                                                <config.icon className="h-3 w-3" />
                                                                                {config.label}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <p className="truncate max-w-[250px] text-sm" title={msg.messageContent}>
                                                                                {msg.messageContent}
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="text-sm">
                                                                            {format(new Date(msg.sendAt as string), "dd/MM 'às' HH:mm")}
                                                                        </TableCell>
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
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="content" className="mt-0">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Biblioteca Enviada</CardTitle>
                                        <CardDescription>Vídeos educativos compartilhados com o paciente.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {patientSentVideos.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {patientSentVideos.map((video) => (
                                                    <div key={video.id} className="group overflow-hidden rounded-xl border bg-card hover:shadow-md transition-all">
                                                        <div className="aspect-video relative">
                                                            <Image src={video.thumbnailUrl!} alt={video.title!} fill className="object-cover transition-transform group-hover:scale-105" />
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                                                                {formatDistanceToNow(new Date(video.sentAt as string), { addSuffix: true, locale: ptBR })}
                                                            </div>
                                                        </div>
                                                        <div className="p-4">
                                                            <h3 className="font-semibold line-clamp-1 mb-1">{video.title}</h3>

                                                            <div className="mt-4 flex items-center justify-between">
                                                                <span className="text-xs text-muted-foreground">Feedback:</span>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant={video.feedback === 'liked' ? 'default' : 'ghost'}
                                                                        size="icon"
                                                                        className={cn("h-8 w-8 rounded-full", video.feedback === 'liked' && "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800")}
                                                                        onClick={() => handleUpdateFeedback(video.id, 'liked')}
                                                                    >
                                                                        <ThumbsUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant={video.feedback === 'disliked' ? 'destructive' : 'ghost'}
                                                                        size="icon"
                                                                        className={cn("h-8 w-8 rounded-full", video.feedback === 'disliked' && "bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800")}
                                                                        onClick={() => handleUpdateFeedback(video.id, 'disliked')}
                                                                    >
                                                                        <ThumbsDown className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
                                                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                    <Video className="h-8 w-8 text-muted-foreground/50" />
                                                </div>
                                                <h3 className="font-medium text-foreground mb-1">Biblioteca Vazia</h3>
                                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                                    Nenhum vídeo educativo foi enviado para este paciente ainda.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="analysis" className="mt-0">
                                <PatientAnalysisPanel patientId={patientId} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Gestão de Protocolo
                                </CardTitle>
                                <CardDescription>Controle o tratamento ativo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!isPremiumOrVip && (
                                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>Protocolos exclusivos para planos Premium/VIP.</p>
                                    </div>
                                )}
                                {patient.status === 'pending' && (
                                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm flex items-start gap-2">
                                        <UserCog className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>Ative o cadastro para iniciar protocolos.</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="protocol-select" className="text-xs font-semibold uppercase text-muted-foreground">Selecione o Protocolo</Label>
                                        <Select onValueChange={setSelectedProtocol} value={selectedProtocol} disabled={!!activeProtocol || !isPremiumOrVip || patient.status === 'pending'}>
                                            <SelectTrigger id="protocol-select" className="bg-background">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableProtocols.map(protocol => (
                                                    <SelectItem key={protocol.id} value={protocol.id}>{protocol.name}</SelectItem>
                                                ))}
                                                {availableProtocols.length === 0 && isPremiumOrVip && (
                                                    <div className="p-2 text-center text-xs text-muted-foreground">
                                                        Sem protocolos disponíveis.
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="weight-goal" className="text-xs font-semibold uppercase text-muted-foreground">Meta de Peso (kg)</Label>
                                        <Input
                                            id="weight-goal"
                                            type="number"
                                            placeholder="Ex: 85.5"
                                            value={weightGoal}
                                            onChange={(e) => setWeightGoal(e.target.value)}
                                            disabled={!!activeProtocol || !isPremiumOrVip || patient.status === 'pending'}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>

                                {activeProtocol && patient.protocol && isPremiumOrVip && (
                                    <div className="text-sm p-4 bg-background/50 rounded-xl border space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Início:</span>
                                            <span className="font-medium">{format(parseISO(patient.protocol.startDate as string), 'dd/MM/yyyy')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Progresso:</span>
                                            <Badge variant="outline" className="bg-primary/5">Dia {dayInProtocol}</Badge>
                                        </div>
                                        {patient.protocol.weightGoal && (
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Meta:</span>
                                                <span className="font-bold text-primary">{patient.protocol.weightGoal} kg</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                {!activeProtocol ? (
                                    <Button onClick={handleAssignProtocol} disabled={isAssigning || !selectedProtocol || !isPremiumOrVip || patient.status === 'pending'} className="w-full shadow-lg shadow-primary/20">
                                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                        Iniciar Protocolo
                                    </Button>
                                ) : (
                                    <Button onClick={handleUnassignProtocol} disabled={isAssigning || !isPremiumOrVip} className="w-full" variant="destructive">
                                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
                                        Encerrar Protocolo
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
