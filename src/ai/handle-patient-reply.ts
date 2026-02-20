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
    profileName: string,
    messageSid?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        console.log(`[handlePatientReply] Processing msg (len: ${messageText.length}, from: ...${whatsappNumber.slice(-4)}, SID: ${messageSid || 'N/A'})`);

        // 0. Idempotency check: se o MessageSid já foi processado, ignorar
        if (messageSid) {
            const { data: existingMessage } = await supabase
                .from('messages')
                .select('id')
                .eq('twilio_sid', messageSid)
                .maybeSingle();

            if (existingMessage) {
                console.log(`[handlePatientReply] Message already processed (SID: ${messageSid}). Skipping.`);
                return { success: true };
            }
        }

        // 1. Buscar paciente (agora APENAS busca, não cria)
        const { findPatientByPhone } = await import('@/services/patient-service');
        const patient = await findPatientByPhone(supabase, whatsappNumber);

        // Se não encontrou paciente, envia mensagem de cadastro e encerra
        if (!patient) {
            console.log(`[HANDLE-REPLY] Unknown number ...${whatsappNumber.slice(-4)}. Sending registration link.`);
            await sendWhatsappMessage(
                whatsappNumber,
                "Olá! 👋 Para utilizar nossa assistente virtual, você precisa ter um cadastro ativo.\n\nPor favor, cadastre-se gratuitamente em: https://clinicadornelles.com.br/cadastro"
            );
            return { success: true };
        }

        // =====================================================
        // 🛑 RATE LIMITING POR PLANO (C4)
        // Protege contra abuso e controla custos Gemini/Twilio
        // =====================================================
        const DAILY_LIMITS: Record<string, number> = {
            freemium: 5,
            premium: 30,
            vip: Infinity,
        };

        const patientPlan = (patient as any).subscription?.plan || 'freemium';
        const dailyLimit = DAILY_LIMITS[patientPlan] ?? DAILY_LIMITS.freemium;

        if (dailyLimit !== Infinity) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { count: todayMsgCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patient.id)
                .eq('sender', 'patient')
                .gte('created_at', todayStart.toISOString());

            if ((todayMsgCount ?? 0) >= dailyLimit) {
                console.log(`[RATE LIMIT] Patient ${patient.id} (${patientPlan}) hit daily limit of ${dailyLimit}`);
                const limitMsg = patientPlan === 'freemium'
                    ? "Você atingiu o limite diário de mensagens do plano gratuito. 💡 Conheça nossos planos Premium para acompanhamento ilimitado! Acesse: https://clinicadornelles.com.br/portal/journey"
                    : "Você atingiu o limite diário de mensagens. Tente novamente amanhã! 😊";
                await sendWhatsappMessage(whatsappNumber, limitMsg);
                return { success: true };
            }
        }

        // 2. Salvar mensagem (incluindo twilio_sid para idempotência futura)
        try {
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'patient',
                text: messageText,
                twilio_sid: messageSid,
            });
        } catch (insertError: any) {
            // Se falhar por duplicidade de SID (23505), apenas ignora (idempotência)
            if (insertError.code === '23505') {
                console.log(`[handlePatientReply] Duplicate MessageSid detected on insert (SID: ${messageSid}). Skipping.`);
                return { success: true };
            }
            throw insertError;
        }

        await supabase.from('patients').update({
            last_message: messageText,
            last_message_timestamp: new Date().toISOString(),
        }).eq('id', patient.id);

        // =====================================================
        // 🚀 FLUXO DE BOAS-VINDAS (PRIMEIRO CONTATO)
        // Se não houver mensagens anteriores do sistema, enviar boas-vindas
        // =====================================================
        const { count: systemMessageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.id)
            .eq('sender', 'system');

        if (systemMessageCount === 0) {
            const { loggers } = await import('@/lib/logger');
            const { sendWelcomeMessage } = await import('./handlers/welcome-handler');

            loggers.ai.info('First contact detected, sending welcome message', { patientId: patient.id });
            await sendWelcomeMessage(patient, supabase);
            return { success: true };
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

        console.log(`[CheckIn] Active: ${hasActiveCheckin}, patientId: ${patient.id}`);

        // =====================================================
        // 🚨 GATE DE EMERGÊNCIA POR KEYWORDS (antes da IA)
        // Detecção determinística de termos críticos — não depende da IA
        // =====================================================
        const EMERGENCY_PATTERNS = [
            /dor.{0,15}(peito|braço|cabeça\s+forte|torax)/i,
            /desmai|desfale|apag|perd.{0,10}(consciência|sentidos)/i,
            /suicid|me\s+mat|não\s+aguento\s+mais|não\s+vejo\s+saída|quero\s+sumir/i,
            /não\s+consigo\s+respir|falta\s+de\s+ar|sufoc/i,
            /reação.{0,15}(medicamento|alergi|remédio)/i,
            /visão\s+(escurec|embara)|quase\s+desmaiei/i,
            /tremed?eira|suando\s+frio|convuls/i,
            /inchaço.{0,15}(língua|garganta|rosto)/i,
        ];

        const isEmergencyByKeyword = EMERGENCY_PATTERNS.some(p => p.test(messageText));

        if (isEmergencyByKeyword) {
            console.log(`[EMERGENCY GATE] Keyword match detected for patient ${patient.id}`);
            const { handleEmergency } = await import('./handlers/emergency-handler');
            return await handleEmergency(patient, messageText, whatsappNumber, supabase);
        }

        // 4. CLASSIFICAR INTENÇÃO usando IA (fallback — emergências já foram tratadas acima)
        const { classifyMessageIntent, MessageIntent } = await import('./message-intent-classifier');

        const classification = await classifyMessageIntent(messageText, {
            hasActiveCheckin,
            checkinTitle,
        });

        console.log(`[Intent] ${classification.intent} (${classification.confidence})`);

        // 5. ROTEAMENTO BASEADO NA INTENÇÃO

        // 5.1 EMERGÊNCIA - Escala imediatamente
        if (classification.intent === MessageIntent.EMERGENCY) {
            const { handleEmergency } = await import('./handlers/emergency-handler');
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
            const { handleProtocolGamification } = await import('./handlers/gamification-handler');
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
        const { handleAIConversation } = await import('./handlers/conversation-handler');
        return await handleAIConversation(patient, messageText, whatsappNumber, supabase);

    } catch (error: any) {
        console.error('[handlePatientReply] Error:', error);
        return { success: false, error: error.message };
    }
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

    // Padrões de números de teste/seed que nunca devem ser enviados em produção
    const TEST_PHONE_PATTERNS = ['999999000', '999990000', '999990001', '999990002', '999990003'];

    let processed = 0;
    for (const msg of pendingMessages) {
        // Proteção: pular números de teste para evitar cobranças desnecessárias no Twilio
        const isTestNumber = TEST_PHONE_PATTERNS.some(pattern => msg.patient_whatsapp_number.includes(pattern));
        if (isTestNumber) {
            console.warn(`[QUEUE] Skipping test number ...${msg.patient_whatsapp_number.slice(-4)}`);
            await supabase.from('scheduled_messages')
                .update({ status: 'error', error_info: 'Test/seed phone number — skipped in production' })
                .eq('id', msg.id);
            continue;
        }

        const sent = await sendWhatsappMessage(msg.patient_whatsapp_number, msg.message_content);
        if (sent) {
            await supabase.from('scheduled_messages')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', msg.id);

            // Record in chat history, propagating metadata for context-aware processing
            await supabase.from('messages').insert({
                patient_id: msg.patient_id,
                sender: 'system',
                text: msg.message_content,
                metadata: msg.metadata || null,
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
            // Proteção: pular números de teste/seed
            const TEST_PHONE_PATTERNS = ['999999000', '999990000', '999990001', '999990002', '999990003'];
            const isTestNumber = TEST_PHONE_PATTERNS.some(p => protocol.patient.whatsapp_number.includes(p));
            if (isTestNumber) {
                console.warn(`[MISSED CHECKINS] Skipping test number ...${protocol.patient.whatsapp_number.slice(-4)}`);
                continue;
            }

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
