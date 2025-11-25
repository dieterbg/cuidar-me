'use server';

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';

/**
 * Processa a resposta de um paciente recebida via WhatsApp
 */
export async function handlePatientReply(
    whatsappNumber: string,
    messageText: string,
    profileName: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        console.log(`[handlePatientReply] Processing message from ${whatsappNumber}: "${messageText}"`);

        // 1. Buscar ou criar paciente
        let { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('whatsapp_number', whatsappNumber)
            .single();

        if (patientError || !patient) {
            // Criar novo paciente
            console.log(`[handlePatientReply] Creating new patient: ${profileName}`);

            const { data: newPatient, error: createError } = await supabase
                .from('patients')
                .insert({
                    full_name: profileName,
                    whatsapp_number: whatsappNumber,
                    status: 'pending',
                    plan: 'freemium',
                    priority: 1,
                    last_message: messageText,
                    last_message_timestamp: new Date().toISOString(),
                })
                .select()
                .single();

            if (createError || !newPatient) {
                console.error('[handlePatientReply] Error creating patient:', createError);
                return { success: false, error: 'Failed to create patient' };
            }

            patient = newPatient;
        }

        // 2. Salvar mensagem do paciente
        await supabase
            .from('messages')
            .insert({
                patient_id: patient.id,
                sender: 'patient',
                text: messageText,
            });

        // 3. Atualizar última mensagem do paciente
        await supabase
            .from('patients')
            .update({
                last_message: messageText,
                last_message_timestamp: new Date().toISOString(),
            })
            .eq('id', patient.id);

        // 4. Buscar histórico de mensagens (opcional para o fluxo atual, mas útil para debug)
        // const { data: messages } = await supabase ...

        // 5. Gerar resposta do chatbot usando IA
        const transformedPatient = transformPatientFromSupabase(patient);

        const aiResponse = await generateChatbotReply({
            patient: transformedPatient,
            patientMessage: messageText,
            protocolContext: '', // TODO: Buscar contexto do protocolo se necessário
        });

        console.log(`[handlePatientReply] AI Decision: ${aiResponse.decision}`);

        // 6. Processar decisão da IA
        if (aiResponse.decision === 'escalate' && aiResponse.attentionRequest) {
            // Criar requisição de atenção
            await supabase
                .from('attention_requests')
                .insert({
                    patient_id: patient.id,
                    reason: aiResponse.attentionRequest.reason,
                    trigger_message: messageText,
                    ai_summary: aiResponse.attentionRequest.aiSummary,
                    ai_suggested_reply: aiResponse.attentionRequest.aiSuggestedReply,
                    priority: aiResponse.attentionRequest.priority || 2,
                });

            // Marcar paciente como precisando atenção
            await supabase
                .from('patients')
                .update({ needs_attention: true })
                .eq('id', patient.id);

            console.log(`[handlePatientReply] Escalated to human attention`);
        }

        // 7. Enviar resposta do chatbot
        if (aiResponse.chatbotReply) {
            const sent = await sendWhatsappMessage(whatsappNumber, aiResponse.chatbotReply);

            if (sent) {
                // Salvar mensagem enviada
                await supabase
                    .from('messages')
                    .insert({
                        patient_id: patient.id,
                        sender: 'me',
                        text: aiResponse.chatbotReply,
                    });
            }
        }

        // 8. Processar dados extraídos (peso, glicose, etc.)
        if (aiResponse.extractedData) {
            const data = aiResponse.extractedData;

            // Salvar métricas de saúde
            if (data.weight || data.glucoseLevel || data.waistCircumference) {
                await supabase
                    .from('health_metrics')
                    .insert({
                        patient_id: patient.id,
                        date: new Date().toISOString().split('T')[0],
                        weight_kg: data.weight,
                        glucose_level: data.glucoseLevel,
                        waist_circumference_cm: data.waistCircumference,
                    });
            }

            // Atualizar progresso de gamificação
            if (data.gamificationPerspective && data.gamificationPoints) {
                await supabase.rpc('update_gamification_progress', {
                    p_patient_id: patient.id,
                    p_perspective: data.gamificationPerspective,
                    p_points: data.gamificationPoints,
                });
            }
        }

        console.log(`[handlePatientReply] Successfully processed message`);
        return { success: true };

    } catch (error: any) {
        console.error('[handlePatientReply] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Processa a fila de mensagens agendadas
 */
export async function processMessageQueue(): Promise<{ success: boolean; processed: number; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        // Buscar mensagens pendentes
        const { data: pendingMessages, error } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('status', 'pending')
            .lte('send_at', new Date().toISOString())
            .limit(50);

        if (error) {
            console.error('[processMessageQueue] Error fetching messages:', error);
            return { success: false, processed: 0, error: error.message };
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            return { success: true, processed: 0 };
        }

        console.log(`[processMessageQueue] Processing ${pendingMessages.length} messages`);

        let processed = 0;

        for (const message of pendingMessages) {
            try {
                // Enviar mensagem
                const sent = await sendWhatsappMessage(
                    message.patient_whatsapp_number,
                    message.message_content
                );

                if (sent) {
                    // Atualizar status
                    await supabase
                        .from('scheduled_messages')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                        })
                        .eq('id', message.id);

                    // Salvar no histórico
                    await supabase
                        .from('messages')
                        .insert({
                            patient_id: message.patient_id,
                            sender: 'system',
                            text: message.message_content,
                        });

                    processed++;
                } else {
                    // Marcar como erro
                    await supabase
                        .from('scheduled_messages')
                        .update({
                            status: 'error',
                            error_info: 'Failed to send via Twilio',
                        })
                        .eq('id', message.id);
                }
            } catch (err: any) {
                console.error(`[processMessageQueue] Error processing message ${message.id}:`, err);

                await supabase
                    .from('scheduled_messages')
                    .update({
                        status: 'error',
                        error_info: err.message,
                    })
                    .eq('id', message.id);
            }
        }

        console.log(`[processMessageQueue] Processed ${processed}/${pendingMessages.length} messages`);
        return { success: true, processed };

    } catch (error: any) {
        console.error('[processMessageQueue] Error:', error);
        return { success: false, processed: 0, error: error.message };
    }
}

/**
 * Verifica pacientes que perderam check-ins
 */
export async function processMissedCheckins(): Promise<{ success: boolean; error?: string }> {
    // const supabase = createServiceRoleClient();

    try {
        // TODO: Implementar lógica de check-ins perdidos
        // Por enquanto, apenas retorna sucesso
        console.log('[processMissedCheckins] Checking for missed check-ins...');

        return { success: true };

    } catch (error: any) {
        console.error('[processMissedCheckins] Error:', error);
        return { success: false, error: error.message };
    }
}
