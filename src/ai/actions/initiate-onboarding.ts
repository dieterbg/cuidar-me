/**
 * @fileOverview Inicialização do onboarding WhatsApp
 * Cria estado inicial e envia primeira mensagem
 */

import { createClient } from '@/lib/supabase-server';
import { getStepMessage } from '@/ai/onboarding';
import type { OnboardingStep } from '@/ai/onboarding';

interface InitiateOnboardingResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Inicia o onboarding WhatsApp para um paciente
 * Cria registro em onboarding_states e envia primeira mensagem
 */
export async function initiateWhatsAppOnboarding(
    patientId: string
): Promise<InitiateOnboardingResult> {
    try {
        const supabase = createClient();

        // 1. Buscar dados do paciente
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('full_name, whatsapp_number, plan, status')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            return {
                success: false,
                error: 'Paciente não encontrado',
            };
        }

        // Verificar se já tem onboarding em andamento
        const { data: existingOnboarding } = await supabase
            .from('onboarding_states')
            .select('id, step, completed_at')
            .eq('patient_id', patientId)
            .single();

        if (existingOnboarding && !existingOnboarding.completed_at) {
            return {
                success: false,
                error: 'Onboarding já iniciado',
            };
        }

        if (existingOnboarding && existingOnboarding.completed_at) {
            return {
                success: false,
                error: 'Onboarding já concluído',
            };
        }

        // 2. Criar estado inicial do onboarding
        const initialStep: OnboardingStep = 'welcome';
        const { error: createError } = await supabase
            .from('onboarding_states')
            .insert({
                patient_id: patientId,
                step: initialStep,
                plan: patient.plan,
                data: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (createError) {
            console.error('[initiateWhatsAppOnboarding] Error creating state:', createError);
            return {
                success: false,
                error: 'Erro ao criar estado do onboarding',
            };
        }

        // 3. Gerar mensagem de boas-vindas
        const welcomeMessage = getStepMessage(
            initialStep,
            patient.plan as 'freemium' | 'premium' | 'vip',
            {},
            patient.full_name
        );

        // 4. Enviar mensagem via WhatsApp (Twilio)
        if (!patient.whatsapp_number) {
            return {
                success: false,
                error: 'Número de WhatsApp não cadastrado',
            };
        }

        // Chamar API do Twilio para enviar mensagem
        const twilioResponse = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: patient.whatsapp_number,
                message: welcomeMessage,
            }),
        });

        if (!twilioResponse.ok) {
            console.error('[initiateWhatsAppOnboarding] Twilio error:', await twilioResponse.text());
            return {
                success: false,
                error: 'Erro ao enviar mensagem WhatsApp',
            };
        }

        console.log(`[initiateWhatsAppOnboarding] Onboarding iniciado para paciente ${patientId}`);

        return {
            success: true,
            message: 'Onboarding WhatsApp iniciado com sucesso',
        };
    } catch (error: any) {
        console.error('[initiateWhatsAppOnboarding] Unexpected error:', error);
        return {
            success: false,
            error: error.message || 'Erro inesperado',
        };
    }
}
