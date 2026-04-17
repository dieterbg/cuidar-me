"use client";

import { notFound, useRouter, useParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback, useTransition } from 'react';
import { ArrowLeft, MessageSquare, Video, Calendar, Send, ClipboardList, PlayCircle, StopCircle, Loader2, ShieldOff, ThumbsUp, ThumbsDown, UserCog, ShieldAlert, Star, Target, Pencil, Save, Clock, CheckCircle, AlertTriangle, Activity, Trash2 } from 'lucide-react';
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
import { getScheduledMessagesForPatient, updateScheduledMessage, getMessages, deleteMessages } from '@/ai/actions/messages';
import { updateSentVideoFeedback, getVideos } from '@/ai/actions/videos';
import { HealthMetricsChart } from '@/components/health-metrics-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { PatientEditForm } from '@/components/patient-edit-form';
import { PatientProfileSummary } from '@/components/patient-profile-summary';
import { ScheduledMessagesPanel } from '@/components/scheduled-messages-panel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
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
    const [isSavingMessage, startSavingMessageTransition] = useTransition();

    const [activeTab, setActiveTab] = useState('conversation');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeletingHistory, setIsDeletingHistory] = useState(false);

    const patientId = params.id as string;

    const handleDeleteHistory = async () => {
        setIsDeletingHistory(true);
        try {
            const res = await deleteMessages(patientId);
            if (res.success) {
                toast({ title: "✅ Histórico apagado", description: "O histórico de mensagens do paciente foi excluído permanentemente.", className: "bg-green-50" });
                setConversation([]);
                fetchData(false);
            } else {
                throw new Error(res.error || "Erro desconhecido ao apagar histórico");
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "❌ Erro", description: err.message });
        } finally {
            setIsDeletingHistory(false);
        }
    };

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
    }, [patientId, toast, notFound]);

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

        // Polling fallback: Atualiza de 5 em 5 segundos
        // Isso resolve o problema quando o Supabase Dashboard não tem o Realtime ativado para a tabela
        const intervalId = setInterval(loadMessages, 5000);

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
            clearInterval(intervalId);
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
        fetchData(false);
    };


    const isPremiumOrVip = patient.subscription.plan === 'premium' || patient.subscription.plan === 'vip';
    const showAnalysisPanel = isPremiumOrVip && (profile?.role === 'admin' || profile?.role === 'equipe_saude');
    const canEditPatient = profile && profile.role !== 'paciente';

    return (
        <div className="flex-1 bg-background/50 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
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
                            {patient.status === 'inactive' && (
                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1">
                                    <StopCircle className="h-3 w-3" /> Inativo (Pausa)
                                </Badge>
                            )}
                            {patient.status === 'inactive_cancellation' && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1">
                                    <Trash2 className="h-3 w-3" /> Inativo (Cancelado)
                                </Badge>
                            )}
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
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-green-200 hover:bg-green-50 text-green-700 h-9"
                                onClick={async () => {
                                    toast({ title: "📱 Iniciando Onboarding...", description: "Manual re-trigger." });
                                    try {
                                        const res = await fetch('/api/onboarding/initiate', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ patientId: patient.id }),
                                        });
                                        if (res.ok) {
                                            toast({ title: "✅ Onboarding Enviado!", description: "Mensagem reenviada.", className: "bg-green-50" });
                                        } else {
                                            const data = await res.json();
                                            throw new Error(data.error);
                                        }
                                    } catch (err: any) {
                                        toast({ variant: "destructive", title: "❌ Erro", description: err.message });
                                    }
                                }}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Onboarding
                            </Button>
                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <UserCog className="mr-2 h-4 w-4" />
                                        Gerenciar
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-red-200 hover:bg-red-50 text-red-700 h-9">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Histórico
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isso irá excluir permanentemente todo o histórico de mensagens deste paciente do banco de dados.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteHistory} className="bg-red-600 hover:bg-red-700" disabled={isDeletingHistory}>
                                            {isDeletingHistory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            Sim, apagar histórico
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Centered Column: Charts & Chat */}
                    <div className="space-y-8">
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
                                <TabsTrigger value="profile" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Prontuário
                                </TabsTrigger>
                                {isPremiumOrVip && (
                                    <TabsTrigger value="scheduled" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Agendadas
                                        {(() => {
                                            const todayCount = scheduledMessages.filter(m => {
                                                const d = new Date(m.sendAt);
                                                const now = new Date();
                                                return m.status === 'pending' && d.toDateString() === now.toDateString();
                                            }).length;
                                            return todayCount > 0 ? (
                                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                                                    {todayCount}
                                                </Badge>
                                            ) : null;
                                        })()}
                                    </TabsTrigger>
                                )}
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

                            <TabsContent value="profile" className="mt-0 pb-12">
                                <PatientProfileSummary patient={patient} />
                            </TabsContent>

                                {isPremiumOrVip && (
                                    <TabsContent value="scheduled" className="mt-0 pb-12">
                                        <ScheduledMessagesPanel
                                            messages={scheduledMessages}
                                            currentDay={patient?.protocol?.currentDay}
                                            durationDays={activeProtocol?.durationDays}
                                        />
                                    </TabsContent>
                                )}

                            <TabsContent value="analysis" className="mt-0 pb-12">
                                <PatientAnalysisPanel patientId={patientId} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
