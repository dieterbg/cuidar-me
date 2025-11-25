
"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { sendCampaignMessage, getPatients } from '@/ai/actions';
import type { PatientPlan } from '@/lib/types';
import { Loader2, Megaphone, Send } from 'lucide-react';

const plans: { id: PatientPlan, label: string }[] = [
    { id: 'freemium', label: 'Freemium' },
    { id: 'premium', label: 'Premium' },
    { id: 'vip', label: 'VIP' },
];

export default function CampaignsPage() {
    const { toast } = useToast();
    const [isSending, startSending] = useTransition();
    const [message, setMessage] = useState('');
    const [selectedPlans, setSelectedPlans] = useState<PatientPlan[]>(['premium', 'vip']);

    const handlePlanChange = (plan: PatientPlan) => {
        setSelectedPlans(prev =>
            prev.includes(plan)
                ? prev.filter(p => p !== plan)
                : [...prev, plan]
        );
    };

    const handleSendCampaign = async () => {
        if (!message.trim()) {
            toast({ variant: 'destructive', title: 'Mensagem vazia', description: 'Por favor, escreva a mensagem que deseja enviar.' });
            return;
        }
        if (selectedPlans.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum plano selecionado', description: 'Por favor, escolha pelo menos um plano para receber a mensagem.' });
            return;
        }

        startSending(async () => {
            try {
                // Fetch all patients
                const allPatients = await getPatients();

                // Filter patients by selected plans
                const targetPatients = allPatients.filter(p =>
                    p.subscription && selectedPlans.includes(p.subscription.plan)
                );

                if (targetPatients.length === 0) {
                    toast({
                        variant: 'destructive',
                        title: 'Nenhum paciente encontrado',
                        description: 'Não há pacientes nos planos selecionados.',
                    });
                    return;
                }

                const patientIds = targetPatients.map(p => p.id);
                const result = await sendCampaignMessage(patientIds, message);

                if (result.success) {
                    toast({
                        title: 'Campanha Enviada!',
                        description: `${patientIds.length} mensagens foram agendadas com sucesso.`,
                    });
                    setMessage('');
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao enviar campanha',
                        description: result.error || 'Ocorreu um erro inesperado.',
                    });
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao enviar campanha',
                    description: error.message || 'Ocorreu um erro inesperado.',
                });
            }
        });
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
                        Envie mensagens em massa via WhatsApp para pacientes de planos específicos.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Criar Nova Campanha</CardTitle>
                        <CardDescription>
                            Escreva sua mensagem, selecione os planos de destino e clique em enviar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="campaign-message">Mensagem</Label>
                            <Textarea
                                id="campaign-message"
                                placeholder="Ex: Olá! Temos uma nova condição especial no plano VIP. Gostaria de saber mais?"
                                className="min-h-[150px]"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isSending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Enviar para os planos:</Label>
                            <div className="flex items-center space-x-4 pt-2">
                                {plans.map(plan => (
                                    <div key={plan.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`plan-${plan.id}`}
                                            checked={selectedPlans.includes(plan.id)}
                                            onCheckedChange={() => handlePlanChange(plan.id)}
                                            disabled={isSending}
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
                        <Button onClick={handleSendCampaign} disabled={isSending} className="w-full sm:w-auto">
                            {isSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isSending ? 'Enviando...' : `Enviar para ${selectedPlans.length} plano(s)`}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
