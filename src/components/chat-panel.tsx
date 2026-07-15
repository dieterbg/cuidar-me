
"use client";

import { useState, useTransition, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUp, Bot, Loader2, CheckCircle, MicOff, Sparkles, X } from 'lucide-react';

import { resolvePatientAttention, addMessageAndSendWhatsapp } from '@/ai/actions/messages';
import { suggestWhatsappReplies } from '@/ai/flows/suggest-whatsapp-replies';
import { getPatientDetails } from '@/ai/actions/patients';
import { getClinicalSummaryAction } from '@/ai/actions/clinical-summary';
import type { Message, Patient } from '@/lib/types';
import { FileText } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { AlertTriangle } from 'lucide-react';

interface AttentionBoxProps {
    patient: Patient;
    onResolve: () => void;
    onUseReply: (reply: string) => void;
}

function AttentionBox({ patient, onResolve, onUseReply }: AttentionBoxProps) {
    const { toast } = useToast();
    const [isResolving, startResolvingTransition] = useTransition();

    if (!patient.attentionRequest) return null;

    const { aiSummary, aiSuggestedReply, reason } = patient.attentionRequest;

    const handleResolve = () => {
        startResolvingTransition(async () => {
            try {
                await resolvePatientAttention(patient.id);
                onResolve();
                toast({ title: 'Alerta Resolvido', description: 'O paciente foi marcado como atendido.' });
            } catch (error) {
                console.error("Erro ao resolver alerta:", error);
                toast({ variant: 'destructive', title: 'Erro ao resolver alerta.' });
            }
        });
    };

    return (
        <Card className="mb-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-300">
                    <AlertTriangle /> Ação Necessária: {reason}
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-400">
                    A IA detectou uma situação que requer sua atenção.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-sm">Resumo da IA</h4>
                    <p className="text-sm text-muted-foreground">{aiSummary}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Sugestão de Resposta</h4>
                    <p className="text-sm text-muted-foreground italic p-2 border-l-2 border-muted-foreground/50">"{aiSuggestedReply}"</p>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button size="sm" onClick={() => onUseReply(aiSuggestedReply)}>
                    Usar e Enviar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleResolve} disabled={isResolving}>
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Dispensar
                </Button>
            </CardFooter>
        </Card>
    );
}


interface ChatPanelProps {
    patient: Patient | null;
    conversation: Message[];
    onNewMessage: (messages: Message[]) => void;
    onPatientUpdate: (updatedPatient: Patient) => void;
    showAnalysis: boolean;
}

export function ChatPanel({ patient, conversation, onNewMessage, onPatientUpdate, showAnalysis }: ChatPanelProps) {
    const { toast } = useToast();
    const { profile } = useAuth();
    const [isReplyPending, startReplyTransition] = useTransition();
    const [isResolving, startResolvingTransition] = useTransition();

    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const [clinicalSummary, setClinicalSummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);

    const handleGetClinicalSummary = async () => {
        if (!patientId) return;
        setIsSummaryLoading(true);
        setIsSummaryOpen(true);
        try {
            const res = await getClinicalSummaryAction(patientId);
            if (res.success && res.summary) {
                setClinicalSummary(res.summary);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao gerar resumo.',
                    description: res.error || 'Falha na resposta da IA.'
                });
                setIsSummaryOpen(false);
            }
        } catch (error) {
            console.error("Erro ao obter resumo clínico:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao gerar resumo.',
                description: error instanceof Error ? error.message : String(error)
            });
            setIsSummaryOpen(false);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('### ')) {
                return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-800">{line.replace('### ', '')}</h4>;
            }
            if (line.startsWith('## ')) {
                return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-slate-900 border-b pb-1">{line.replace('## ', '')}</h3>;
            }
            if (line.startsWith('# ')) {
                return <h2 key={i} className="text-lg font-black mt-5 mb-3 text-slate-950">{line.replace('# ', '')}</h2>;
            }
            if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 list-disc text-sm text-slate-700">{line.replace('- ', '')}</li>;
            }
            if (line.trim() === '') {
                return <div key={i} className="h-2" />;
            }
            const parts = line.split('**');
            if (parts.length > 1) {
                return (
                    <p key={i} className="text-sm text-slate-700 leading-relaxed">
                        {parts.map((part, index) => 
                            index % 2 === 1 ? <strong key={index} className="font-semibold text-slate-950">{part}</strong> : part
                        )}
                    </p>
                );
            }
            return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>;
        });
    };

    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const patientId = patient?.id;

    const scrollToBottom = () => {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation]);

    const handleSuggestReply = () => {
        // Find the last message FROM THE PATIENT, regardless of subsequent system/staff messages
        const lastPatientMessage = [...conversation].reverse().find(m => m.sender === 'patient');
        if (!lastPatientMessage) {
            toast({ variant: 'destructive', title: 'Nenhuma mensagem do paciente para responder.' });
            return;
        }
        startReplyTransition(async () => {
            try {
                const result = await suggestWhatsappReplies({ patientMessage: lastPatientMessage.text });
                setMessage(result.suggestedReply);
                toast({ title: 'Resposta sugerida pela IA.' });
            } catch (error) {
                console.error("Erro ao sugerir resposta:", error);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao sugerir resposta.',
                    description: error instanceof Error ? error.message : String(error)
                });
            }
        });
    };

    const handleSendMessage = async () => {
        if (!message.trim() || isSending || !patientId || !patient?.whatsappNumber) return;

        setIsSending(true);
        console.log("[ChatPanel] Iniciando envio de mensagem...");

        try {
            // Use the new server action
            const result = await addMessageAndSendWhatsapp(patientId, patient.whatsappNumber, message);

            if (!result.success) {
                throw new Error(result.error);
            }

            console.log("[ChatPanel] Mensagem enviada com sucesso pela Server Action.");

            // Clear the input
            setMessage('');

            // If patient needed attention, resolve it
            if (patient?.needsAttention) {
                await handleResolveAttention(false); // Resolve silently
            }

            // The real-time listener will update the conversation, 
            // but we can manually trigger a patient data refresh.
            const details = await getPatientDetails(patientId);
            if (details.patient) onPatientUpdate(details.patient);


        } catch (error) {
            console.error("[ChatPanel] Erro ao enviar mensagem:", error);
            toast({ variant: 'destructive', title: 'Erro ao Enviar Mensagem', description: error instanceof Error ? error.message : 'Falha na comunicação com o servidor.' });
        } finally {
            setIsSending(false);
        }
    }

    const handleResolveAttention = async (showToast = true) => {
        if (!patientId) return;
        startResolvingTransition(async () => {
            try {
                await resolvePatientAttention(patientId);
                // Fetch updated patient data and pass it up
                const details = await getPatientDetails(patientId);
                if (details.patient) {
                    onPatientUpdate(details.patient);
                }
                if (showToast) {
                    toast({ title: 'Alerta Resolvido', description: 'O paciente foi marcado como atendido.' });
                }
            } catch (error) {
                console.error("Erro ao resolver alerta:", error);
                if (showToast) {
                    toast({ variant: 'destructive', title: 'Erro ao resolver alerta.' });
                }
            }
        });
    }

    const handleAttentionBoxResolve = () => {
        // Just visually update the parent component
        const details = getPatientDetails(patient!.id);
        details.then(d => {
            if (d.patient) onPatientUpdate(d.patient)
        })
    }

    const handleUseReply = async (reply: string) => {
        setMessage(reply);
    }


    const canSendMessage = (patient?.subscription.plan === 'premium' || patient?.subscription.plan === 'vip') && patient?.status === 'active';
    const canSuggestReply = (profile?.role === 'admin' || profile?.role === 'equipe_saude' || profile?.role === 'assistente') && canSendMessage;

    if (!patient) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Carregando conversa...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[50vh]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex flex-col">
            {patient?.attentionRequest && patient.needsAttention && (
                <AttentionBox patient={patient} onResolve={handleAttentionBoxResolve} onUseReply={handleUseReply} />
            )}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={patient?.avatar} alt={patient?.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{patient?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl">{patient?.name}</CardTitle>
                            <CardDescription>Histórico de mensagens</CardDescription>
                        </div>
                    </div>
                    {patient?.needsAttention && !patient.attentionRequest && (
                        <Button variant="outline" size="sm" onClick={() => handleResolveAttention()} disabled={isResolving}>
                            {isResolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                            {isResolving ? 'Resolvendo...' : 'Marcar como Resolvido'}
                        </Button>
                    )}
                </CardHeader>
                <ScrollArea className="h-[50vh] p-4 border-y" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {conversation.map((msg) => {
                            const isFromStaff = msg.sender === 'me' || msg.sender === 'system';
                            return (
                                <div key={msg.id} className={cn("flex items-end gap-2", isFromStaff ? 'justify-end' : 'justify-start')}>
                                    {msg.sender === 'patient' && <Avatar className="h-8 w-8"><AvatarImage src={patient?.avatar} /><AvatarFallback>{patient?.name[0]}</AvatarFallback></Avatar>}
                                    {msg.sender === 'system' && <Badge variant="outline" className="text-[9px] mb-2 bg-muted/50">Sistema</Badge>}
                                    <div className={cn("max-w-xs md:max-w-md rounded-2xl p-3 text-sm shadow-sm",
                                        msg.sender === 'me' ? 'bg-primary/90 text-primary-foreground rounded-tr-none' :
                                            msg.sender === 'system' ? 'bg-blue-50 border border-blue-100 text-blue-900 rounded-tr-none' :
                                                'bg-muted rounded-tl-none')}>
                                        <p>{msg.text}</p>
                                        <p className={cn("text-[10px] opacity-60 mt-1 text-right whitespace-nowrap", msg.sender === 'me' ? 'text-primary-foreground' : '')}>
                                            {msg.timestamp && !isNaN(new Date(msg.timestamp as string).getTime())
                                                ? (() => {
                                                    const date = new Date(msg.timestamp as string);
                                                    const isToday = new Date().toDateString() === date.toDateString();
                                                    return isToday
                                                        ? format(date, 'HH:mm')
                                                        : format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
                                                })()
                                                : '--:--'
                                            }
                                        </p>
                                    </div>
                                    {msg.sender === 'me' && <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">E</AvatarFallback></Avatar>}
                                </div>
                            );
                        })}
                        {conversation.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">
                                Nenhuma mensagem nesta conversa ainda.
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 space-y-2 border-t bg-background">
                    {canSendMessage ? (
                        <div className="relative">
                            <Textarea
                                placeholder="Digite sua mensagem..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="pr-24"
                                rows={2}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                disabled={isSending}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                {canSuggestReply && (
                                    <>
                                        <Button onClick={handleGetClinicalSummary} disabled={isSummaryLoading || isSending} variant="outline" size="sm">
                                            <FileText className="mr-2 h-4 w-4" />
                                            {isSummaryLoading ? '...' : 'Resumo'}
                                        </Button>
                                        <Button onClick={handleSuggestReply} disabled={isReplyPending || isSending} variant="outline" size="sm">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            {isReplyPending ? '...' : 'Sugerir'}
                                        </Button>
                                    </>
                                )}
                                <Button size="icon" className="h-9 w-9" onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground p-3 bg-muted rounded-md border flex items-center justify-center gap-2">
                            <MicOff className="h-4 w-4" />
                            O envio de mensagens só está disponível para pacientes ativos nos planos Premium ou VIP.
                        </div>
                    )}
                </div>
            </Card>

            <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Resumo Clínico da IA
                        </DialogTitle>
                        <DialogDescription>
                            Briefing comportamental e metabólico de {patient?.name} para suporte à decisão clínica.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {isSummaryLoading || !clinicalSummary ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm">Analisando métricas e histórico de conversas...</p>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none">
                                {renderMarkdown(clinicalSummary)}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
