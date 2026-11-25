
"use client";

import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { previewCampaign, sendCampaignMessage } from '@/ai/actions-extended';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PatientPlan } from '@/lib/types';
import { Loader2, Megaphone, Send } from 'lucide-react';

const plans: { id: PatientPlan, label: string }[] = [
    { id: 'freemium', label: 'Freemium' },
    { id: 'premium', label: 'Premium' },
    { id: 'vip', label: 'VIP' },
];

export default function CampaignsPage() {
    const { toast } = useToast();
    const [isReviewing, setIsReviewing] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [review, setReview] = useState<Parameters<typeof sendCampaignMessage>[2]>();
    const [reviewError, setReviewError] = useState('');
    const reviewButton = useRef<HTMLButtonElement>(null);
    const [message, setMessage] = useState('');
    const [selectedPlans, setSelectedPlans] = useState<PatientPlan[]>(['premium', 'vip']);

    const handlePlanChange = (plan: PatientPlan) => {
        setReview(undefined);
        setSelectedPlans(previous =>
            previous.includes(plan)
                ? previous.filter(item => item !== plan)
                : [...previous, plan]
        );
    };

    const handleReviewCampaign = async () => {
        setReviewError('');
        setIsReviewing(true);
        try {
            const result = await previewCampaign(selectedPlans, message);
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Erro ao revisar campanha', description: result.error });
                return;
            }
            setReview(review ? { ...result.review, id: review.id } : result.review);
            setReviewOpen(true);
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao revisar campanha', description: 'Tente novamente.' });
        } finally {
            setIsReviewing(false);
        }
    };

    const handleScheduleCampaign = async () => {
        if (!review?.count) return;
        setReviewError('');
        setIsScheduling(true);
        try {
            const result = await sendCampaignMessage(selectedPlans, message, review);
            if (!result.success) {
                if (result.review) setReview(result.review);
                setReviewError(result.error);
                return;
            }

            const scheduled = result.scheduled === 1
                ? '1 mensagem entrou na fila de envio.'
                : `${result.scheduled} mensagens entraram na fila de envio.`;
            const alreadyScheduled = result.alreadyScheduled === 1
                ? '1 mensagem já havia sido agendada nesta campanha.'
                : `${result.alreadyScheduled} mensagens já haviam sido agendadas nesta campanha.`;
            toast({
                title: result.scheduled ? 'Campanha agendada' : 'Campanha já agendada',
                description: [
                    result.scheduled > 0 ? scheduled : '',
                    result.alreadyScheduled > 0 ? alreadyScheduled : '',
                ].filter(Boolean).join(' '),
            });
            setReviewOpen(false);
            setReview(undefined);
            setMessage('');
        } catch {
            setReviewError('Não foi possível confirmar o agendamento. Tente novamente nesta revisão.');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Megaphone className="h-8 w-8 text-primary" />
                        Campanhas
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Agende orientações e lembretes por WhatsApp para pacientes dos planos selecionados.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Criar Nova Campanha</CardTitle>
                        <CardDescription>
                            Revise o público e a mensagem antes de confirmar o agendamento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="campaign-message">Mensagem</Label>
                            <Textarea
                                id="campaign-message"
                                placeholder="Ex. Lembrete da clínica sobre o horário de atendimento desta semana."
                                className="min-h-[150px]"
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    setReview(undefined);
                                }}
                                maxLength={1500}
                                disabled={isReviewing || isScheduling}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Planos incluídos</Label>
                            <div className="flex items-center space-x-4 pt-2">
                                {plans.map(plan => (
                                    <div key={plan.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`plan-${plan.id}`}
                                            checked={selectedPlans.includes(plan.id)}
                                            onCheckedChange={() => handlePlanChange(plan.id)}
                                            disabled={isReviewing || isScheduling}
                                        />
                                        <Label htmlFor={`plan-${plan.id}`} className="font-normal">
                                            {plan.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            ref={reviewButton}
                            onClick={handleReviewCampaign}
                            disabled={isReviewing || isScheduling || !message.trim() || selectedPlans.length === 0}
                            className="w-full sm:w-auto"
                        >
                            {isReviewing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isReviewing ? 'Verificando público…' : 'Revisar campanha'}
                        </Button>
                    </CardFooter>
                </Card>

                <AlertDialog open={reviewOpen} onOpenChange={open => { if (!isScheduling) setReviewOpen(open); }}>
                    <AlertDialogContent
                        onCloseAutoFocus={event => {
                            event.preventDefault();
                            const focusTarget = reviewButton.current?.disabled
                                ? document.getElementById('campaign-message')
                                : reviewButton.current;
                            focusTarget?.focus();
                        }}
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>Revisar campanha</AlertDialogTitle>
                            <AlertDialogDescription>
                                {review?.count === 1
                                    ? '1 paciente elegível para agendamento pelo WhatsApp.'
                                    : review?.count
                                        ? `${review.count} pacientes elegíveis para agendamento pelo WhatsApp.`
                                        : 'Nenhum paciente elegível nos planos selecionados.'}
                                {' '}O público inclui pacientes ativos com consentimento registrado e número válido.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <p className="text-sm font-medium">
                            {plans.filter(plan => selectedPlans.includes(plan.id)).map(plan => plan.label).join(', ')}
                        </p>
                        <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">
                            {message.trim()}
                        </p>
                        {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isScheduling}>Voltar</AlertDialogCancel>
                            <Button onClick={handleScheduleCampaign} disabled={isScheduling || !review?.count}>
                                {isScheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                                {isScheduling ? 'Agendando…' : 'Confirmar agendamento'}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
