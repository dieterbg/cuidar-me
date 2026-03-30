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

        // 0. Idempotency check: Removido pois twilio_sid não existe no DB.
        // Se houver necessidade de idempotência rigorosa, deve-se adicionar a coluna twilio_sid (texto, único) na tabela messages.

        // 1. Buscar paciente (agora APENAS busca, não cria)
        const { findPatientByPhone } = await import('@/services/patient-service');
        const patientRaw = await findPatientByPhone(supabase, whatsappNumber);
        const patient = patientRaw ? transformPatientFromSupabase(patientRaw) : null;

        // Se não encontrou paciente, envia mensagem de cadastro e encerra
        if (!patient) {
            console.log(`[HANDLE-REPLY] Unknown number ${whatsappNumber}. Sending registration link.`);
            await sendWhatsappMessage(
                whatsappNumber,
                "Olá! 👋 Para utilizar nossa assistente virtual, você precisa ter um cadastro ativo.\n\nPor favor, entre em contato com a Clínica Dornelles para se cadastrar: https://www.clinicadornelles.com.br"
            );
            return { success: true };
        }

        // =====================================================
        // 🛑 RATE LIMITING POR PLANO (C4)
        // Protege contra abuso e controla custos Gemini/Twilio
        // =====================================================
        const DAILY_LIMITS: Record<string, number> = {
            freemium: 5,     // Restored as per user request
            premium: 100,    // Increased from 30
            vip: Infinity,
        };

        const patientPlan = patient.subscription.plan || 'freemium';
        console.log(`[handlePatientReply] Patient ${patient.id} plan: ${patientPlan}`);
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

                // Salvar no histórico para o admin ver o bloqueio
                await supabase.from('messages').insert({
                    patient_id: patient.id,
                    sender: 'me',
                    text: limitMsg,
                });

                return { success: true };
            }
        }

        // 2. Salvar mensagem (incluindo twilio_sid para idempotência futura)
        // 2. Salvar mensagem (sem twilio_sid pois a coluna não existe no banco atual)
        const { error: insertError } = await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'patient',
            text: messageText,
        });

        if (insertError) {
            console.error(`[handlePatientReply] Insert message error:`, insertError);
            throw insertError;
        }

        await supabase.from('patients').update({
            last_message: messageText,
            last_message_timestamp: new Date().toISOString(),
        }).eq('id', patient.id);

        // =====================================================
        // 🛑 GATE 1: OPT-OUT (SAIR)
        // Determinístico, alta prioridade
        // =====================================================
        const OPT_OUT_KEYWORDS = ['sair', 'stop', 'cancelar', 'parar', 'unsubscribe'];
        const normalizedMsg = messageText.toLowerCase().trim();

        if (OPT_OUT_KEYWORDS.includes(normalizedMsg)) {
            console.log(`[OPT-OUT] Keyword detected for patient ${patient.id}`);
            const { handleOptOut } = await import('./handlers/opt-out-handler');
            await handleOptOut(patient, whatsappNumber, supabase);
            return { success: true };
        }

        // =====================================================
        // 🚀 GATE 2: ONBOARDING ATIVO
        // Intercepta qualquer mensagem se o paciente estiver em onboarding
        // =====================================================
        const { isOnboardingActive, handleOnboardingReply } = await import('./actions/onboarding');
        const onboardingActive = await isOnboardingActive(patient.id);

        if (onboardingActive) {
            console.log(`[ONBOARDING] Active flow detected for patient ${patient.id}. Routing to handler.`);
            const result = await handleOnboardingReply(patient.id, whatsappNumber, messageText, patient.fullName);
            return { success: result.success };
        }

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

        // =====================================================
        // 🛑 GATE FREEMIUM: BLOQUEIO TOTAL DE CONVERSA
        // Freemium = Somente Broadcast (dica diária).
        // QUALQUER mensagem de um Freemium → Upsell para Premium.
        // (Exceto: opt-out e onboarding, já tratados acima)
        // (Exceto: emergências por keyword, tratadas abaixo)
        // =====================================================
        if (patientPlan === 'freemium') {
            // Ainda detecta emergências por keyword para Freemium
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
                console.log(`[EMERGENCY GATE] Keyword match for FREEMIUM patient ${patient.id}. Sending safety message (no escalation).`);
                const safetyMsg = `⚠️ Percebemos que você pode estar passando por uma situação de saúde importante.\n\nPor favor, procure atendimento médico imediatamente:\n\n🚑 **SAMU:** Ligue **192**\n🏥 **Pronto-socorro** mais próximo\n📞 **CVV (apoio emocional):** Ligue **188**\n\nSua saúde é prioridade. Não deixe de buscar ajuda profissional! ❤️`;

                await sendWhatsappMessage(whatsappNumber, safetyMsg);
                await supabase.from('messages').insert({
                    patient_id: patient.id,
                    sender: 'me',
                    text: safetyMsg,
                });
                return { success: true };
            }

            // Qualquer outra mensagem → upsell
            console.log(`[FREEMIUM GATE] Blocking chat for patient ${patient.id}. Sending upsell.`);
            const upsellMsg = `Obrigado pela sua mensagem! 😊\n\nNo plano Gratuito, você recebe dicas de saúde diárias às 8h.\n\n💎 Quer ir além? Com o Plano **Premium** você tem:\n✅ Assistente de saúde com IA 24h\n✅ Check-in diário personalizado\n✅ Gamificação e conquistas\n✅ Protocolos de acompanhamento\n\nFale com a clínica para fazer o upgrade! 🚀`;

            await sendWhatsappMessage(whatsappNumber, upsellMsg);
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'me',
                text: upsellMsg,
            });
            return { success: true };
        }

        // =====================================================
        // A PARTIR DAQUI: APENAS PREMIUM E VIP
        // =====================================================

        // 3. DETECTAR CHECK-INS ATIVOS
        // Verificar se enviamos mensagem de protocolo nas últimas 24h
        // Buscamos as últimas mensagens do sistema e filtramos por [GAMIFICAÇÃO] ou metadado isGamification
        const { data: recentSystemMessages } = await supabase
            .from('messages')
            .select('text, created_at, metadata')
            .eq('patient_id', patient.id)
            .in('sender', ['me', 'system'])
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        const recentProtocolMessage = recentSystemMessages?.find((m: any) =>
            (m.text && m.text.includes('[GAMIFICAÇÃO]')) ||
            (m.metadata && (m.metadata as any).isGamification === true)
        );

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

        // 4. CLASSIFICAR INTENÇÃO usando IA
        const { classifyMessageIntent, MessageIntent } = await import('./message-intent-classifier');

        const classification = await classifyMessageIntent(messageText, {
            hasActiveCheckin,
            checkinTitle,
        });

        console.log(`[Intent] ${classification.intent} (${classification.confidence})`);

        // 5. ROTEAMENTO BASEADO NA INTENÇÃO (PREMIUM/VIP ONLY)

        // 5.1 EMERGÊNCIA - Escala imediatamente
        if (classification.intent === MessageIntent.EMERGENCY) {
            const { handleEmergency } = await import('./handlers/emergency-handler');
            return await handleEmergency(patient, messageText, whatsappNumber, supabase);
        }

        // 5.2 SOCIAL - Resposta rápida
        if (classification.intent === MessageIntent.SOCIAL || classification.intent === MessageIntent.QUESTION) {
            const { handleAIConversation } = await import('./handlers/conversation-handler');
            return await handleAIConversation(patient, messageText, whatsappNumber, supabase);
        }

        // 5.3 DAILY CHECK-IN (check-in diário genérico - para pacientes SEM protocolo ativo)
        // Se o paciente está num check-in diário ativo, rotear para o handler correto
        const { isDailyCheckinActive, handleDailyCheckinReply } = await import('./actions/daily-checkin');
        const hasDailyCheckin = await isDailyCheckinActive(patient.id);

        if (hasDailyCheckin) {
            console.log(`[ROUTING] Patient ${patient.id} has active daily check-in. Routing to daily check-in handler.`);
            const checkinResult = await handleDailyCheckinReply(
                patient.id,
                whatsappNumber,
                messageText,
                patient.name,
                patientPlan as 'premium' | 'vip'
            );

            if (checkinResult.success) {
                return { success: true };
            }
            // Se falhou (ex: check-in expirado), cai para o fluxo normal abaixo
        }

        // 5.4 PROTOCOLOS + GAMIFICAÇÃO (se ativo)
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
        // Log deep error to database for mapping
        try {
            const supabase = createServiceRoleClient();
            // Tenta inserir log básico primeiro (sem metadata para evitar erro de coluna)
            await supabase.from('messages').insert({
                patient_id: (error as any).patientId || null, // Se tivermos o ID
                sender: 'system',
                text: `[FATAL-ERROR] handlePatientReply: ${error.message || error}`
            });

            // Tenta inserir atenção se possível
            console.error('Critical Error in handlePatientReply:', error.stack);
        } catch (logErr) {
            console.error('Failed to log error to DB:', logErr);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Processa fila de mensagens agendadas
 */
export async function processMessageQueue(): Promise<{ success: boolean; processed: number; error?: string }> {
    const supabase = createServiceRoleClient();

    const { data: pendingMessages, error: queueError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', new Date().toISOString())
        .limit(50);

    if (queueError) {
        console.error('[QUEUE] ❌ Erro ao buscar mensagens pendentes:', JSON.stringify(queueError));
        return { success: false, processed: 0, error: queueError.message };
    }

    if (!pendingMessages || pendingMessages.length === 0) return { success: true, processed: 0 };

    // Padrões de números de teste/seed que nunca devem ser enviados em produção
    const TEST_PHONE_PATTERNS = ['999999000', '999990000', '999990001', '999990002', '999990003'];

    let processed = 0;
    for (const msg of pendingMessages) {
        // ✨ ATOMIC CLAIM: Marcar como 'sending' ANTES de enviar.
        // Se outra instância concorrente já pegou esta mensagem, o WHERE falha e retorna vazio.
        const { data: claimed } = await supabase
            .from('scheduled_messages')
            .update({ status: 'sending' })
            .eq('id', msg.id)
            .eq('status', 'pending')
            .select('id');

        if (!claimed || claimed.length === 0) {
            console.log(`[QUEUE] ⏭ Mensagem ${msg.id} já foi reclamada por outro processo. Pulando.`);
            continue;
        }

        // Logic to determine if we should use a template (Bypass 24h window for protocols)
        let contentSid = undefined;
        let contentVariables = undefined;

        if (msg.source === 'protocol' || (msg.metadata && (msg.metadata as any).isGamification)) {
            const metadata = (msg.metadata as any) || {};
            const title = metadata.checkinTitle || metadata.messageTitle || metadata.title || '';

            // Map gamification titles to specific check-in templates
            if (title.includes('Hidratação')) contentSid = process.env.TWILIO_CHECKIN_WATER_SID;
            else if (title.includes('Café')) contentSid = process.env.TWILIO_CHECKIN_BREAKFAST_SID;
            else if (title.includes('Almoço')) contentSid = process.env.TWILIO_CHECKIN_LUNCH_SID;
            else if (title.includes('Jantar')) contentSid = process.env.TWILIO_CHECKIN_DINNER_SID;
            else if (title.includes('Lanche')) contentSid = process.env.TWILIO_CHECKIN_SNACKS_SID;
            else if (title.includes('Atividade')) contentSid = process.env.TWILIO_CHECKIN_ACTIVITY_SID;
            else if (title.includes('Bem-Estar')) contentSid = process.env.TWILIO_CHECKIN_WELLBEING_SID;
            else if (title.includes('Peso')) contentSid = process.env.TWILIO_CHECKIN_WEIGHT_SID;

            // Fallback: template genérico para mensagens de protocolo sem template específico
            // (Planejamento Semanal, dicas, reflexões, etc.)
            // Sem isso, essas mensagens falham com erro 63016 fora da janela de 24h.
            if (!contentSid) {
                contentSid = process.env.TWILIO_PROTOCOL_CONTENT_SID;
                if (contentSid) {
                    console.log(`[QUEUE] 📝 Usando template genérico para: "${title || msg.message_content?.substring(0, 50)}"`);
                } else {
                    console.warn(`[QUEUE] ⚠️ Sem template genérico (TWILIO_PROTOCOL_CONTENT_SID). Enviando "${title}" via body — pode falhar fora da janela de 24h.`);
                }
            }

            if (contentSid) {
                // Fetch patient name separately (avoids join issues with RLS)
                const { data: patientRow } = await supabase
                    .from('patients')
                    .select('full_name')
                    .eq('id', msg.patient_id)
                    .single();
                const patientName = patientRow?.full_name?.split(' ')[0] || "lá";

                // templates expect: {{1}} = name, {{2}} = content
                contentVariables = {
                    "1": patientName,
                    "2": msg.message_content
                };
            }
        }

        const twilioSid = await sendWhatsappMessage(msg.patient_whatsapp_number, msg.message_content, {
            contentSid,
            contentVariables
        });

        if (twilioSid) {
            await supabase.from('scheduled_messages')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    error_info: `Sent via Twilio SID: ${twilioSid}${contentSid ? ' (Template)' : ''}`
                })
                .eq('id', msg.id);

            // Record in chat history, propagating metadata for context-aware processing
            await supabase.from('messages').insert({
                patient_id: msg.patient_id,
                sender: 'system',
                text: msg.message_content,
                metadata: msg.metadata || null,
            });
            processed++;
        } else {
            // Se falhou, marcar como erro e registrar no log
            await supabase.from('scheduled_messages')
                .update({
                    status: 'failed',
                    error_info: `Failed to send via Twilio API${contentSid ? ` (ContentSID: ${contentSid})` : ''}`
                })
                .eq('id', msg.id);
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
