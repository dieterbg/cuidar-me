'use server';

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';

/**
 * Sistema Completo Integrado de Processamento de Mensagens
 * - AI Classification (detecta intenção: emergency, social, question, checkin)
 * - Protocolos + Gamificação (pontos automáticos)
 * - IA Conversacional (respostas inteligentes)
 */
export async function handlePatientReply(
    whatsappNumber: string,
    messageText: string,
    profileName: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        console.log(`[handlePatientReply] Processing: "${messageText}"`);

        // 1. Buscar ou criar paciente
        let { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('whatsapp_number', whatsappNumber)
            .single();

        if (!patient) {
            const { data: newPatient } = await supabase
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
            patient = newPatient!;
        }

        // 2. Salvar mensagem
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'patient',
            text: messageText,
        });

        await supabase.from('patients').update({
            last_message: messageText,
            last_message_timestamp: new Date().toISOString(),
        }).eq('id', patient.id);

        // =====================================================
        // 🚀 FLUXO DE ONBOARDING (#8)
        // Se paciente está pendente, rotear para onboarding
        // =====================================================
        if (patient.status === 'pending') {
            const { loggers } = await import('@/lib/logger');
            const { handleOnboardingReply, startOnboarding, isOnboardingActive } = await import('./actions/onboarding');

            loggers.ai.info('Patient is pending, checking onboarding status', { patientId: patient.id });

            const isActive = await isOnboardingActive(patient.id);

            if (!isActive) {
                // Iniciar onboarding se não estiver ativo
                loggers.ai.info('Starting onboarding for pending patient', { patientId: patient.id });
                await startOnboarding(
                    patient.id,
                    patient.plan as 'freemium' | 'premium' | 'vip',
                    whatsappNumber,
                    patient.full_name
                );
                return { success: true };
            } else {
                // Processar resposta do onboarding
                loggers.ai.info('Processing onboarding reply', { patientId: patient.id });
                const result = await handleOnboardingReply(
                    patient.id,
                    whatsappNumber,
                    messageText,
                    patient.full_name
                );

                if (result.success) {
                    return { success: true };
                }
                // Se falhar, continua para fluxo normal (fallback)
                loggers.ai.warn('Onboarding reply handling failed, falling back to AI', { error: result.error });
            }
        }

        // 3. DETECTAR CHECK-INS ATIVOS
        // Verificar se enviamos mensagem de protocolo nas últimas 24h
        const { data: recentProtocolMessage } = await supabase
            .from('messages')
            .select('text, created_at')
            .eq('patient_id', patient.id)
            .eq('sender', 'me')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .ilike('text', '%[GAMIFICAÇÃO]%')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const hasActiveCheckin = !!recentProtocolMessage;
        const checkinTitle = recentProtocolMessage?.text || undefined;

        console.log(`[CheckIn] Active: ${hasActiveCheckin}, Title: ${checkinTitle?.substring(0, 50)}...`);

        // 4. CLASSIFICAR INTENÇÃO usando IA
        const { classifyMessageIntent, MessageIntent } = await import('./message-intent-classifier');

        const classification = await classifyMessageIntent(messageText, {
            hasActiveCheckin,
            checkinTitle,
        });

        console.log(`[Intent] ${classification.intent} (${classification.confidence})`);

        // 5. ROTEAMENTO BASEADO NA INTENÇÃO

        // 5.1 EMERGÊNCIA - Escala imediatamente
        if (classification.intent === MessageIntent.EMERGENCY) {
            return await handleEmergency(patient, messageText, whatsappNumber, supabase);
        }

        // 5.2 SOCIAL - Resposta rápida
        if (classification.intent === MessageIntent.SOCIAL) {
            await sendWhatsappMessage(whatsappNumber, "Olá! 😊 Como posso te ajudar?");
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'me',
                text: "Olá! 😊 Como posso te ajudar?",
            });
            return { success: true };
        }

        // 5.3 PROTOCOLOS + GAMIFICAÇÃO (se ativo)
        const { data: patientProtocol } = await supabase
            .from('patient_protocols')
            .select('*, protocol:protocols(id, name, duration_days)')
            .eq('patient_id', patient.id)
            .eq('is_active', true)
            .single();

        if (patientProtocol && classification.intent === MessageIntent.CHECKIN_RESPONSE) {
            const processed = await handleProtocolGamification(
                patient,
                patientProtocol,
                messageText,
                whatsappNumber,
                supabase
            );

            if (processed) return { success: true };
        }

        // 5.4 IA CONVERSACIONAL (padrão)
        return await handleAIConversation(patient, messageText, whatsappNumber, supabase);

    } catch (error: any) {
        console.error('[handlePatientReply] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Processa emergências - Escala imediatamente
 */
async function handleEmergency(
    patient: any,
    messageText: string,
    whatsappNumber: string,
    supabase: any
): Promise<{ success: boolean }> {
    console.log('[EMERGENCY] Escalating immediately');

    const transformedPatient = transformPatientFromSupabase(patient);
    const aiResponse = await generateChatbotReply({
        patient: transformedPatient,
        patientMessage: `[EMERGÊNCIA] ${messageText}`,
        protocolContext: '',
    });

    // Forçar escalonamento
    await supabase.from('attention_requests').insert({
        patient_id: patient.id,
        reason: 'Emergência Detectada',
        trigger_message: messageText,
        ai_summary: `Sistema detectou emergência: ${messageText}`,
        ai_suggested_reply: 'Entre em contato URGENTEMENTE.',
        priority: 1,
    });

    await supabase.from('patients').update({ needs_attention: true }).eq('id', patient.id);

    if (aiResponse.chatbotReply) {
        await sendWhatsappMessage(whatsappNumber, aiResponse.chatbotReply);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'me',
            text: aiResponse.chatbotReply,
        });
    }

    return { success: true };
}

/**
 * Processa check-ins de protocolo + Gamificação
 */
async function handleProtocolGamification(
    patient: any,
    patientProtocol: any,
    messageText: string,
    whatsappNumber: string,
    supabase: any
): Promise<boolean> {
    console.log('[PROTOCOL-GAMIFICATION] Processing protocol check-in');

    const { protocols, mandatoryGamificationSteps } = await import('@/lib/data');
    const {
        isGamificationCheckin,
        extractPerspective,
        calculatePoints,
        getActionType,
        generateConfirmationMessage
    } = await import('./protocol-response-processor');
    const { registerQuickAction } = await import('./actions/gamification');

    const currentDay = patientProtocol.current_day;
    const protocolData = protocols.find(p => p.id === patientProtocol.protocol.id);
    const contentMessages = protocolData?.messages.filter(m => m.day === currentDay) || [];
    const gamificationMessages = mandatoryGamificationSteps.filter(m => m.day === currentDay);
    const allMessages = [...gamificationMessages, ...contentMessages];

    let totalPointsAwarded = 0;
    let confirmationMessages: string[] = [];

    for (const protocolStep of allMessages) {
        if (isGamificationCheckin(protocolStep)) {
            const perspective = extractPerspective(protocolStep);
            if (!perspective) continue;

            const points = calculatePoints(protocolStep.title, messageText, perspective);

            if (points > 0 && patient.user_id) {
                const type = getActionType(perspective);
                const result = await registerQuickAction(patient.user_id, type, perspective);

                if (result.success) {
                    totalPointsAwarded += points;
                    confirmationMessages.push(
                        generateConfirmationMessage(protocolStep.title, points, perspective)
                    );
                    console.log(`[PROTOCOL-GAMIFICATION] +${points} pts (${perspective})`);
                }
            }
        }
    }

    if (totalPointsAwarded > 0) {
        const message = confirmationMessages.join('\n');
        await sendWhatsappMessage(whatsappNumber, message);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: message,
        });
        return true; // Processado
    }

    return false; // Não processado
}

/**
 * Processa conversa com IA
 */
async function handleAIConversation(
    patient: any,
    messageText: string,
    whatsappNumber: string,
    supabase: any
): Promise<{ success: boolean }> {
    const transformedPatient = transformPatientFromSupabase(patient);
    const aiResponse = await generateChatbotReply({
        patient: transformedPatient,
        patientMessage: messageText,
        protocolContext: '',
    });

    if (aiResponse.decision === 'escalate' && aiResponse.attentionRequest) {
        await supabase.from('attention_requests').insert({
            patient_id: patient.id,
            reason: aiResponse.attentionRequest.reason,
            trigger_message: messageText,
            ai_summary: aiResponse.attentionRequest.aiSummary,
            ai_suggested_reply: aiResponse.attentionRequest.aiSuggestedReply,
            priority: aiResponse.attentionRequest.priority || 2,
        });
        await supabase.from('patients').update({ needs_attention: true }).eq('id', patient.id);
    }

    if (aiResponse.chatbotReply) {
        await sendWhatsappMessage(whatsappNumber, aiResponse.chatbotReply);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'me',
            text: aiResponse.chatbotReply,
        });
    }

    return { success: true };
}

/**
 * Processa fila de mensagens agendadas
 */
export async function processMessageQueue(): Promise<{ success: boolean; processed: number; error?: string }> {
    const supabase = createServiceRoleClient();

    const { data: pendingMessages } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', new Date().toISOString())
        .limit(50);

    if (!pendingMessages) return { success: true, processed: 0 };

    let processed = 0;
    for (const msg of pendingMessages) {
        const sent = await sendWhatsappMessage(msg.patient_whatsapp_number, msg.message_content);
        if (sent) {
            await supabase.from('scheduled_messages')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', msg.id);
            await supabase.from('messages').insert({
                patient_id: msg.patient_id,
                sender: 'system',
                text: msg.message_content,
            });
            processed++;
        }
    }

    return { success: true, processed };
}

/**
 * Verifica check-ins perdidos e envia lembretes
 * 
 * Detecta pacientes com protocolo ativo que não responderam
 * às mensagens de gamificação nas últimas 24h
 */
export async function processMissedCheckins(): Promise<{
    success: boolean;
    processed: number;
    error?: string
}> {
    const supabase = createServiceRoleClient();

    try {
        console.log('[MISSED CHECKINS] Starting verification...');

        // 1. Buscar todos os protocolos ativos
        const { data: activeProtocols, error: protocolError } = await supabase
            .from('patient_protocols')
            .select(`
                *,
                patient:patients(id, full_name, whatsapp_number)
            `)
            .eq('is_active', true);

        if (protocolError) {
            console.error('[MISSED CHECKINS] Error fetching protocols:', protocolError);
            return { success: false, processed: 0, error: protocolError.message };
        }

        if (!activeProtocols || activeProtocols.length === 0) {
            console.log('[MISSED CHECKINS] No active protocols found');
            return { success: true, processed: 0 };
        }

        console.log(`[MISSED CHECKINS] Found ${activeProtocols.length} active protocols`);

        let processedCount = 0;
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const protocol of activeProtocols) {
            // 2. Verificar se há mensagem de gamificação enviada nas últimas 24h
            const { data: recentGamificationMessage } = await supabase
                .from('messages')
                .select('created_at, text')
                .eq('patient_id', protocol.patient_id)
                .eq('sender', 'me')
                .gte('created_at', yesterday.toISOString())
                .ilike('text', '%[GAMIFICAÇÃO]%')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Se não há mensagem de gamificação recente, pular
            if (!recentGamificationMessage) continue;

            // 3. Verificar se paciente respondeu DEPOIS dessa mensagem
            const { data: patientResponse } = await supabase
                .from('messages')
                .select('created_at')
                .eq('patient_id', protocol.patient_id)
                .eq('sender', 'patient')
                .gte('created_at', recentGamificationMessage.created_at)
                .limit(1)
                .maybeSingle();

            // Se paciente já respondeu, não precisa lembrete
            if (patientResponse) continue;

            // 4. Paciente não respondeu! Enviar lembrete
            const reminderMessage = `👋 Olá ${protocol.patient.full_name}! 

Percebi que você ainda não respondeu ao check-in de hoje. 

Não se preocupe, estou aqui para te ajudar! Sua resposta é importante para acompanharmos seu progresso. 💪

Como está indo? 😊`;

            try {
                // Enviar WhatsApp
                await sendWhatsappMessage(protocol.patient.whatsapp_number, reminderMessage);

                // Salvar na tabela de mensagens
                await supabase.from('messages').insert({
                    patient_id: protocol.patient_id,
                    sender: 'me',
                    text: reminderMessage
                });

                console.log(`[MISSED CHECKINS] ✓ Sent reminder to ${protocol.patient.full_name}`);
                processedCount++;

            } catch (sendError) {
                console.error(`[MISSED CHECKINS] Failed to send reminder to ${protocol.patient.full_name}:`, sendError);
                // Continua para próximo paciente
            }
        }

        console.log(`[MISSED CHECKINS] ✅ Processed ${processedCount} reminders`);
        return { success: true, processed: processedCount };

    } catch (error: any) {
        console.error('[MISSED CHECKINS] Fatal error:', error);
        return { success: false, processed: 0, error: error.message };
    }
}
