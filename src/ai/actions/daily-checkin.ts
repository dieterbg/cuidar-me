
'use server';

/**
 * @fileOverview Actions para gerenciar check-in diário consolidado
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import {
    DailyCheckinState,
    CheckinStep,
    getNextCheckinStep,
    getCheckinStepMessage,
    processCheckinResponse,
    calculateCheckinPoints,
    generateCheckinSummary,
} from '@/ai/daily-checkin';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Inicia o check-in diário para um paciente
 */
export async function startDailyCheckin(
    patientId: string,
    whatsappNumber: string,
    patientName: string,
    plan: 'freemium' | 'premium' | 'vip'
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        // Freemium não tem check-ins
        if (plan === 'freemium') {
            return { success: false, error: 'Freemium plan does not have check-ins' };
        }

        const today = new Date().toISOString().split('T')[0];

        // Verificar se já existe check-in hoje
        const { data: existing } = await supabase
            .from('daily_checkin_states')
            .select('id')
            .eq('patient_id', patientId)
            .eq('date', today)
            .single();

        if (existing) {
            return { success: false, error: 'Check-in already started today' };
        }

        // Criar estado inicial
        const { error: insertError } = await supabase
            .from('daily_checkin_states')
            .insert({
                patient_id: patientId,
                date: today,
                step: 'hydration',
                data: {},
            });

        if (insertError) {
            console.error('[startDailyCheckin] Error:', insertError);
            return { success: false, error: insertError.message };
        }

        // Enviar primeira mensagem
        const message = getCheckinStepMessage('hydration', {}, patientName);
        const sent = await sendWhatsappMessage(whatsappNumber, message);

        if (!sent) {
            return { success: false, error: 'Failed to send message' };
        }

        // Salvar mensagem
        await supabase
            .from('messages')
            .insert({
                patient_id: patientId,
                sender: 'system',
                text: message,
            });

        console.log(`[startDailyCheckin] Started for patient ${patientId}`);
        return { success: true };

    } catch (error: any) {
        console.error('[startDailyCheckin] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Processa resposta do paciente durante check-in
 */
export async function handleDailyCheckinReply(
    patientId: string,
    whatsappNumber: string,
    messageText: string,
    patientName: string,
    plan: 'freemium' | 'premium' | 'vip'
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        const today = new Date().toISOString().split('T')[0];

        // Buscar estado atual
        const { data: checkinState, error: fetchError } = await supabase
            .from('daily_checkin_states')
            .select('*')
            .eq('patient_id', patientId)
            .eq('date', today)
            .is('completed_at', null)
            .single();

        if (fetchError || !checkinState) {
            return { success: false, error: 'No active check-in' };
        }

        const currentStep = checkinState.step as CheckinStep;
        const currentData = checkinState.data || {};

        // Processar resposta
        const { data: updatedData, error: processError } = processCheckinResponse(
            currentStep,
            messageText,
            currentData
        );

        if (processError) {
            // Enviar mensagem de erro
            await sendWhatsappMessage(whatsappNumber, `❌ ${processError}\\n\\nTente novamente:`);
            return { success: true };
        }

        // Verificar se é dia de pesagem (domingo)
        const isWeightDay = new Date().getDay() === 0;

        // Determinar próximo passo
        const nextStep = getNextCheckinStep(currentStep, plan, isWeightDay);

        // Atualizar estado
        const updatePayload: any = {
            step: nextStep,
            data: updatedData,
        };

        // Se completou
        if (nextStep === 'complete') {
            const points = calculateCheckinPoints(updatedData);

            updatePayload.completed_at = new Date().toISOString();
            updatePayload.points_earned = points;

            // Salvar no histórico
            await supabase
                .from('daily_checkins')
                .insert({
                    patient_id: patientId,
                    date: today,
                    hydration: updatedData.hydration,
                    water_liters: updatedData.waterLiters,
                    breakfast: updatedData.breakfast,
                    lunch: updatedData.lunch,
                    dinner: updatedData.dinner,
                    snacks: updatedData.snacks,
                    meal_photo_url: updatedData.mealPhotoUrl,
                    activity: updatedData.activity,
                    activity_type: updatedData.activityType,
                    activity_minutes: updatedData.activityMinutes,
                    wellbeing: updatedData.wellbeing,
                    sleep: updatedData.sleep,
                    weight_kg: updatedData.weight,
                    points_earned: points,
                });

            // ========== INTEGRAÇÃO COM GAMIFICAÇÃO ==========
            const { registerQuickAction } = await import('./gamification');

            // Buscar user_id do paciente
            const { data: patientData } = await supabase
                .from('patients')
                .select('user_id')
                .eq('id', patientId)
                .single();

            if (patientData?.user_id) {
                // Registrar pontos para cada perspectiva respondida

                // Hidratação
                if (updatedData.hydration) {
                    await registerQuickAction(patientData.user_id, 'hydration', 'hidratacao');
                }

                // Alimentação
                if (updatedData.breakfast || updatedData.lunch || updatedData.dinner) {
                    await registerQuickAction(patientData.user_id, 'mood', 'alimentacao');
                }

                // Movimento
                if (updatedData.activity) {
                    await registerQuickAction(patientData.user_id, 'mood', 'movimento');
                }

                // Bem-Estar
                if (updatedData.sleep) {
                    await registerQuickAction(patientData.user_id, 'mood', 'bemEstar');
                }
            }
            // ========== FIM DA INTEGRAÇÃO ==========

            // Atualizar peso se fornecido
            if (updatedData.weight) {
                await supabase
                    .from('health_metrics')
                    .insert({
                        patient_id: patientId,
                        date: today,
                        weight_kg: updatedData.weight,
                    });
            }
        }

        await supabase
            .from('daily_checkin_states')
            .update(updatePayload)
            .eq('patient_id', patientId)
            .eq('date', today);

        // Enviar próxima mensagem
        const nextMessage = getCheckinStepMessage(nextStep, updatedData, patientName);
        const sent = await sendWhatsappMessage(whatsappNumber, nextMessage);

        if (sent) {
            await supabase
                .from('messages')
                .insert({
                    patient_id: patientId,
                    sender: 'system',
                    text: nextMessage,
                });
        }

        console.log(`[handleDailyCheckinReply] Advanced to step: ${nextStep}`);

        return {
            success: true,
            completed: nextStep === 'complete',
        };

    } catch (error: any) {
        console.error('[handleDailyCheckinReply] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica se paciente está em check-in ativo
 */
export async function isDailyCheckinActive(patientId: string): Promise<boolean> {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('daily_checkin_states')
        .select('id')
        .eq('patient_id', patientId)
        .eq('date', today)
        .is('completed_at', null)
        .single();

    return !error && !!data;
}

/**
 * Calcula streak atual do paciente
 */
export async function calculatePatientStreak(patientId: string): Promise<number> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('calculate_streak', {
        p_patient_id: patientId,
    });

    if (error) {
        console.error('[calculatePatientStreak] Error:', error);
        return 0;
    }

    return data || 0;
}
