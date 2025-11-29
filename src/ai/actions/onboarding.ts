'use server';

/**
 * @fileOverview Gerencia o onboarding MÍNIMO conversacional via WhatsApp
 * Apenas 3 passos: boas-vindas, preferências, confirmação
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import {
    OnboardingState,
    OnboardingStep,
    getNextStep,
    getStepMessage,
    processStepResponse,
} from '@/ai/onboarding';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Inicia o onboarding para um paciente já cadastrado na web
 */
export async function startOnboarding(
    patientId: string,
    plan: 'freemium' | 'premium' | 'vip',
    whatsappNumber: string,
    patientName?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        // Criar estado inicial do onboarding
        const { error: insertError } = await supabase
            .from('onboarding_states')
            .insert({
                patient_id: patientId,
                step: 'welcome',
                plan,
                data: {},
            });

        if (insertError) {
            console.error('[startOnboarding] Error creating onboarding state:', insertError);
            return { success: false, error: insertError.message };
        }

        // Enviar mensagem de boas-vindas
        const message = getStepMessage('welcome', plan, {}, patientName);
        const sent = await sendWhatsappMessage(whatsappNumber, message);

        if (!sent) {
            return { success: false, error: 'Failed to send welcome message' };
        }

        // Salvar mensagem enviada
        await supabase
            .from('messages')
            .insert({
                patient_id: patientId,
                sender: 'system',
                text: message,
            });

        console.log(`[startOnboarding] Started minimal onboarding for patient ${patientId} (${plan})`);
        return { success: true };

    } catch (error: any) {
        console.error('[startOnboarding] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Processa uma resposta do paciente durante o onboarding
 */
export async function handleOnboardingReply(
    patientId: string,
    whatsappNumber: string,
    messageText: string,
    patientName?: string
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        // Buscar estado atual do onboarding
        const { data: onboardingState, error: fetchError } = await supabase
            .from('onboarding_states')
            .select('*')
            .eq('patient_id', patientId)
            .is('completed_at', null)
            .single();

        if (fetchError || !onboardingState) {
            console.error('[handleOnboardingReply] No active onboarding found');
            return { success: false, error: 'No active onboarding' };
        }

        const currentStep = onboardingState.step as OnboardingStep;
        const plan = onboardingState.plan as 'freemium' | 'premium' | 'vip';
        const currentData = onboardingState.data || {};

        // Processar resposta do usuário
        const { data: updatedData, error: processError } = processStepResponse(
            currentStep,
            messageText,
            currentData
        );

        if (processError) {
            // Enviar mensagem de erro
            await sendWhatsappMessage(whatsappNumber, `❌ ${processError}\n\nTente novamente:`);
            return { success: true }; // Não avançar, esperar nova resposta
        }

        // Determinar próximo passo
        const nextStep = getNextStep(currentStep, plan, updatedData);
        console.log(`[handleOnboardingReply] Current: ${currentStep}, Next: ${nextStep}`);

        // Atualizar estado do onboarding
        const updatePayload: any = {
            step: nextStep,
            data: updatedData,
        };

        // Se completou, marcar como concluído e salvar preferências
        if (nextStep === 'complete') {
            updatePayload.completed_at = new Date().toISOString();

            // Atualizar apenas o horário preferido no paciente
            if (updatedData.preferredTime) {
                const { error: patientUpdateError } = await supabase
                    .from('patients')
                    .update({
                        preferred_message_time: updatedData.preferredTime,
                        status: 'active', // Ativar paciente
                    })
                    .eq('id', patientId);

                if (patientUpdateError) {
                    console.error('[handleOnboardingReply] Patient Update Error:', patientUpdateError);
                } else {
                    console.log('[handleOnboardingReply] Patient status updated to ACTIVE');
                }
            }
        }

        const { error: updateError } = await supabase
            .from('onboarding_states')
            .update(updatePayload)
            .eq('patient_id', patientId);

        if (updateError) {
            console.error('[handleOnboardingReply] Update Error:', updateError);
        } else {
            console.log('[handleOnboardingReply] State updated successfully');
        }

        // Enviar próxima mensagem
        const nextMessage = getStepMessage(nextStep, plan, updatedData, patientName);
        const sent = await sendWhatsappMessage(whatsappNumber, nextMessage);

        if (sent) {
            // Salvar mensagem enviada
            await supabase
                .from('messages')
                .insert({
                    patient_id: patientId,
                    sender: 'system',
                    text: nextMessage,
                });
        }

        console.log(`[handleOnboardingReply] Advanced to step: ${nextStep}`);

        return {
            success: true,
            completed: nextStep === 'complete',
        };

    } catch (error: any) {
        console.error('[handleOnboardingReply] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica se um paciente está em onboarding ativo
 */
export async function isOnboardingActive(patientId: string): Promise<boolean> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('onboarding_states')
        .select('id')
        .eq('patient_id', patientId)
        .is('completed_at', null)
        .single();

    return !error && !!data;
}

/**
 * Cancela o onboarding de um paciente
 */
export async function cancelOnboarding(patientId: string): Promise<{ success: boolean }> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
        .from('onboarding_states')
        .update({ completed_at: new Date().toISOString() })
        .eq('patient_id', patientId)
        .is('completed_at', null);

    return { success: !error };
}
