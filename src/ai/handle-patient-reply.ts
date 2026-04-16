'use server';

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { loggers } from '@/lib/logger';

const logger = loggers.ai;

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
    let patient: any = null;

    try {
        logger.info('Processing patient message', { 
            whatsappNumber, 
            messageLength: messageText.length, 
            messageSid 
        });

        // 0. Idempotency check: Removido pois twilio_sid não existe no DB.
        // Se houver necessidade de idempotência rigorosa, deve-se adicionar a coluna twilio_sid (texto, único) na tabela messages.

        // 1. Buscar paciente (agora APENAS busca, não cria)
        const { findPatientByPhone } = await import('@/services/patient-service');
        const patientRaw = await findPatientByPhone(supabase, whatsappNumber);
        patient = patientRaw ? transformPatientFromSupabase(patientRaw) : null;

        logger.debug('Patient lookup details', { 
            found: !!patientRaw, 
            patientId: patientRaw?.id, 
            fullName: patientRaw?.full_name,
            plan: patientRaw?.plan
        });

        // Se não encontrou paciente, envia mensagem de cadastro e encerra
        if (!patient) {
            logger.info('Unknown number, sending registration link', { whatsappNumber });
            const registrationLink = `https://clinicadornelles.com.br/cadastro?phone=${encodeURIComponent(whatsappNumber)}`;
            const messageText = `Olá! 👋 Notamos que você ainda não possui um cadastro completo conosco. Para utilizar nossa assistente virtual, por favor entre em contato com a Clínica Dornelles para se cadastrar: ${registrationLink}`;
            
            await sendWhatsappMessage(whatsappNumber, messageText);
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
        logger.info('Patient plan identified', { patientId: patient.id, plan: patientPlan });
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
                logger.warn('Rate limit hit', { 
                    patientId: patient.id, 
                    plan: patientPlan, 
                    limit: dailyLimit 
                });
                const limitMsg = patientPlan === 'freemium'
                    ? "Você atingiu o limite diário de mensagens do plano gratuito. 💡 Conheça nossos planos Premium para acompanhamento ilimitado! Acesse: https://clinicadornelles.com.br/portal/journey"
                    : "Você atingiu o limite diário de mensagens. Tente novamente amanhã! 😊";
                await sendWhatsappMessage(whatsappNumber, limitMsg);

                // Salvar no histórico para o admin ver o bloqueio
                await supabase.from('messages').insert({
                    patient_id: patient.id,
                    sender: 'system',
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
            logger.error('Insert message error', insertError, { patientId: patient.id });
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
            logger.info('Opt-out keyword detected', { patientId: patient.id, keyword: normalizedMsg });
            const { handleOptOut } = await import('@/ai/handlers/opt-out-handler');
            await handleOptOut(patient, whatsappNumber, supabase);
            return { success: true };
        }

        // =====================================================
        // 🚀 GATE 2: ONBOARDING ATIVO
        // Intercepta qualquer mensagem se o paciente estiver em onboarding
        // =====================================================
        const { isOnboardingActive, handleOnboardingReply } = await import('@/ai/actions/onboarding');
        const onboardingActive = await isOnboardingActive(patient.id);

        if (onboardingActive) {
            logger.info('Routing to onboarding handler', { patientId: patient.id });
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
            const { sendWelcomeMessage } = await import('@/ai/handlers/welcome-handler');

            logger.info('First contact detected, sending welcome message', { patientId: patient.id });
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
                logger.info('Emergency keyword match for FREEMIUM patient', { patientId: patient.id });
                const safetyMsg = `⚠️ Percebemos que você pode estar passando por uma situação de saúde importante.\n\nPor favor, procure atendimento médico imediatamente:\n\n🚑 **SAMU:** Ligue **192**\n🏥 **Pronto-socorro** mais próximo\n📞 **CVV (apoio emocional):** Ligue **188**\n\nSua saúde é prioridade. Não deixe de buscar ajuda profissional! ❤️`;

                await sendWhatsappMessage(whatsappNumber, safetyMsg);
                await supabase.from('messages').insert({
                    patient_id: patient.id,
                    sender: 'system',
                    text: safetyMsg,
                });
                return { success: true };
            }

            // Qualquer outra mensagem → upsell
            logger.info('Blocking freemium chat, sending upsell', { patientId: patient.id });
            const upsellMsg = `Obrigado pela sua mensagem! 😊\n\nNo plano Gratuito, você recebe dicas de saúde diárias às 8h.\n\n💎 Quer ir além? Com o Plano **Premium** você tem:\n✅ Assistente de saúde com IA 24h\n✅ Check-in diário personalizado\n✅ Gamificação e conquistas\n✅ Protocolos de acompanhamento\n\nFale com a clínica para fazer o upgrade! 🚀`;

            await sendWhatsappMessage(whatsappNumber, upsellMsg);
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'system',
                text: upsellMsg,
            });
            return { success: true };
        }

        // =====================================================
        // A PARTIR DAQUI: APENAS PREMIUM E VIP
        // =====================================================

        // =====================================================
        // 🚨 GATE DE EMERGÊNCIA POR KEYWORDS (prioridade máxima)
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
            logger.info('Emergency keyword match detected', { patientId: patient.id });
            const { handleEmergency } = await import('@/ai/handlers/emergency-handler');
            return await handleEmergency(patient, messageText, whatsappNumber, supabase);
        }

        // =====================================================
        // 🎮 GATE DE CHECK-IN PENDENTE (leitura direta do DB)
        // Se last_checkin_type está preenchido e dentro de 2h,
        // tenta processar como resposta simples (A/B/C, Sim/Não, número).
        // Respostas complexas passam direto para a IA.
        // =====================================================
        const pendingType = (patientRaw as any).last_checkin_type as string | null;
        const pendingAt = (patientRaw as any).last_checkin_at ? new Date((patientRaw as any).last_checkin_at) : null;
        const ageMs = pendingAt ? Date.now() - pendingAt.getTime() : null;
        const isPendingCheckin = pendingType && pendingAt &&
            (ageMs! < 2 * 60 * 60 * 1000); // janela de 2 horas

        logger.debug('Check-in gate details', { 
            patientId: patient.id, 
            pendingType,
            ageMin: ageMs !== null ? (ageMs / 60000).toFixed(1) : null,
            isPendingCheckin
        });

        if (isPendingCheckin) {
            logger.debug('Entering checkin handler', { patientId: patient.id, pendingType });
            const { processCheckinResponse } = await import('@/ai/handlers/checkin-response-handler');
            const result = await processCheckinResponse(
                patient, messageText, pendingType!, whatsappNumber, supabase
            );

            if (result.processed) {
                logger.info('Check-in response consumed', { 
                    patientId: patient.id, 
                    type: pendingType 
                });
                return { success: true };
            }
            logger.info('Check-in pending but reply not simple, passing to AI', { patientId: patient.id });
        } else {
            logger.debug('Skipping checkin handler', { 
                patientId: patient.id, 
                reason: !pendingType ? 'no last_checkin_type' : !pendingAt ? 'no last_checkin_at' : 'expired' 
            });
        }

        // =====================================================
        // 🚀 PRIORIDADE 2: CLASSICAÇÃO DE INTENÇÃO POR IA
        // Se a gamificação não consumiu a mensagem, deixa a IA classificar.
        // =====================================================
        const { classifyMessageIntent, MessageIntent } = await import('@/ai/message-intent-classifier');

        const classification = await classifyMessageIntent(messageText, {
            hasActiveCheckin: !!isPendingCheckin,
            checkinTitle: pendingType || undefined,
        });

        logger.info('Message intent classified', { 
            patientId: patient.id, 
            intent: classification.intent, 
            confidence: classification.confidence 
        });

        // =====================================================
        // 🚀 PRIORIDADE 3: ROTEAMENTO BASEADO NA INTENÇÃO (IA)
        // =====================================================
        if (classification.intent === MessageIntent.EMERGENCY) {
            // Log emergency decision
            await supabase.from('ai_decision_logs').insert({
                message_sid: messageSid,
                patient_id: patient.id,
                intent: classification.intent,
                confidence: classification.confidence,
                decision: 'ESCALATE',
                reason: classification.reason,
                metadata: { source: 'keyword_or_classifier' }
            });

            const { handleEmergency } = await import('./handlers/emergency-handler');
            return await handleEmergency(patient, messageText, whatsappNumber, supabase);
        }

        // ... (resto do código)

        // Log general decision before proceeding to conversation
        await supabase.from('ai_decision_logs').insert({
            message_sid: messageSid,
            patient_id: patient.id,
            intent: classification.intent,
            confidence: classification.confidence,
            decision: 'REPLY',
            reason: classification.reason,
            metadata: { hasActiveCheckin: !!isPendingCheckin }
        });

        // Se a IA classificar como resposta de check-in mas o handler acima falou que NÃO era válido, 
        // deixamos a IA responder algo genérico se necessário, ou encaminhamos para a conversa normal.

        // 5.3 DAILY CHECK-IN — REMOVIDO
        // Premium/VIP sempre tem protocolo. Sem protocolo = sem check-ins automáticos.
        // Gamificação é o único sistema de check-ins (dentro de protocolos).

        // 5.4 SOCIAL - Resposta rápida
        if (classification.intent === MessageIntent.SOCIAL || classification.intent === MessageIntent.QUESTION) {
            const { handleAIConversation } = await import('@/ai/handlers/conversation-handler');
            return await handleAIConversation(patient, messageText, whatsappNumber, supabase);
        }

        // 5.5 IA CONVERSACIONAL (padrão)
        const { handleAIConversation: defaultConv } = await import('@/ai/handlers/conversation-handler');
        return await defaultConv(patient, messageText, whatsappNumber, supabase);

    } catch (error: any) {
        logger.error('Error in handlePatientReply', { 
            error: error.message, 
            stack: error.stack,
            whatsappNumber 
        });
        try {
            const supabase = createServiceRoleClient();
            await supabase.from('messages').insert({
                patient_id: patient?.id || null,
                sender: 'system',
                text: `[FATAL-ERROR] handlePatientReply: ${error.message || error}`
            });
        } catch (logErr) {
            logger.error('Failed to log error to DB', logErr);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Processa fila de mensagens agendadas
 */
export async function processMessageQueue(externalSupabase?: any): Promise<{ success: boolean; processed: number; skipped?: number; error?: string }> {
    const supabase = externalSupabase || createServiceRoleClient();
    const now = new Date();
    const MAX_AGE_HOURS = 24;
    const BATCH_LIMIT = 30;
    const CONCURRENT = 10; // mensagens Twilio em paralelo por chunk

    // ── Env vars computados uma vez (não por mensagem) ──
    const env = (key: string) => process.env[key]?.trim();
    const templateConfig = {
        usingNewTemplates: !!(env('TWILIO_PROTOCOLO_REGISTRO_SID') && env('TWILIO_CHECKIN_DIARIO_SID') && env('TWILIO_PESAGEM_SEMANAL_SID')),
        sidPesagem: env('TWILIO_PESAGEM_SEMANAL_SID') || env('TWILIO_CHECKIN_WEIGHT_SID'),
        sidCheckin: env('TWILIO_CHECKIN_DIARIO_SID')  || env('TWILIO_PROTOCOL_INCENTIVO_SID'),
        sidRegistro: env('TWILIO_PROTOCOLO_REGISTRO_SID') || env('TWILIO_PROTOCOL_INCENTIVO_SID'),
    };

    // ── 1. Buscar mensagens due ──
    const { data: pendingMessages, error: queueError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', now.toISOString())
        .order('send_at', { ascending: true })
        .limit(BATCH_LIMIT * 5);

    if (queueError) {
        logger.error('Erro ao buscar pendentes na fila', queueError);
        return { success: false, processed: 0, error: queueError.message };
    }
    if (!pendingMessages || pendingMessages.length === 0) {
        return { success: true, processed: 0 };
    }

    // ── 2. Filtrar: limite por paciente + stale ──
    const patientCountMap = new Map<string, number>();
    const toProcess: typeof pendingMessages = [];
    const staleMessages: typeof pendingMessages = [];

    for (const msg of pendingMessages) {
        const ageHours = (now.getTime() - new Date(msg.send_at).getTime()) / 3600000;
        if (ageHours > MAX_AGE_HOURS) { staleMessages.push(msg); continue; }
        const count = patientCountMap.get(msg.patient_id) || 0;
        if (count >= 10) continue;
        patientCountMap.set(msg.patient_id, count + 1);
        toProcess.push(msg);
        if (toProcess.length >= BATCH_LIMIT) break;
    }

    // Marcar stale em paralelo (sem bloquear)
    if (staleMessages.length > 0) {
        await Promise.all(staleMessages.map((msg: any) => {
            const h = ((now.getTime() - new Date(msg.send_at).getTime()) / 3600000).toFixed(0);
            logger.debug('Skipping stale message', { messageId: msg.id, ageHours: h });
            return supabase.from('scheduled_messages')
                .update({ status: 'sent', error_info: `Skipped: ${h}h late` })
                .eq('id', msg.id);
        }));
    }

    if (toProcess.length === 0) return { success: true, processed: 0, skipped: staleMessages.length };

    // ── 3. PRE-FETCH paciente + protocolo em UMA query (elimina N+1) ──
    const uniquePatientIds = [...new Set(toProcess.map((m: any) => m.patient_id))];
    const { data: patientRows } = await supabase
        .from('patients')
        .select(`
            id, full_name,
            patient_protocols!inner (
                id, current_day, is_active,
                protocols:protocol_id ( name, duration_days )
            )
        `)
        .in('id', uniquePatientIds)
        .eq('patient_protocols.is_active', true);

    const patientMap = new Map<string, any>(
        (patientRows || []).map((p: any) => [p.id, p])
    );

    // ── 4. Processar em chunks paralelos de CONCURRENT ──
    let processed = 0;
    let skipped = staleMessages.length;

    for (let i = 0; i < toProcess.length; i += CONCURRENT) {
        const chunk = toProcess.slice(i, i + CONCURRENT);
        const results = await Promise.all(
            chunk.map((msg: any) => _processSingleMessage(msg, supabase, patientMap, now, templateConfig))
        );
        for (const r of results) {
            if (r === 'sent') processed++;
            else if (r === 'skipped' || r === 'failed') skipped++;
        }
    }

    logger.info('Queue processing finished', { 
        processed, 
        skipped, 
        patientsCount: uniquePatientIds.length 
    });
    return { success: true, processed, skipped };
}

/**
 * Processa uma única mensagem: claim atômico → Twilio → DB updates.
 * Extraído do loop para permitir execução paralela via Promise.all.
 */
async function _processSingleMessage(
    msg: any,
    supabase: any,
    patientMap: Map<string, any>,
    now: Date,
    templateConfig: { usingNewTemplates: boolean; sidPesagem?: string; sidCheckin?: string; sidRegistro?: string }
): Promise<'sent' | 'skipped' | 'failed'> {
    const { usingNewTemplates, sidPesagem, sidCheckin, sidRegistro } = templateConfig;

    // Resolver template e variáveis
    let contentSid: string | undefined;
    let contentVariables: Record<string, string> | undefined;

    if (msg.source === 'protocol' || msg.metadata?.isGamification) {
        const metadata = msg.metadata || {};
        const title = metadata.checkinTitle || metadata.messageTitle || metadata.title || '';
        const isGamification = !!metadata.isGamification;
        const protocolDay = metadata.protocolDay || 1;

        const patientRow = patientMap.get(msg.patient_id);
        const patientName = patientRow?.full_name?.split(' ')[0] || 'lá';
        const activeProto = patientRow?.patient_protocols?.[0];
        const protocolName = activeProto?.protocols?.name || 'Cuidar.me';
        const durationDays = activeProto?.protocols?.duration_days || protocolDay;

        if (isGamification) {
            if (title.includes('Peso') || title.toLowerCase().includes('pesagem')) {
                contentSid = sidPesagem;
                contentVariables = usingNewTemplates
                    ? { "1": String(protocolDay), "2": protocolName, "3": patientName }
                    : { "1": patientName, "2": msg.message_content };
            } else {
                contentSid = sidCheckin;
                contentVariables = usingNewTemplates
                    ? { "1": String(protocolDay), "2": protocolName, "3": patientName, "4": msg.message_content }
                    : { "1": patientName, "2": msg.message_content };
            }
        } else {
            contentSid = sidRegistro;
            contentVariables = usingNewTemplates
                ? { "1": String(protocolDay), "2": String(durationDays), "3": protocolName, "4": patientName, "5": msg.message_content }
                : { "1": patientName, "2": msg.message_content };
        }
    }

    // ── Atomic claim: só prossegue se ganhou o lock ──
    const { data: claimed } = await supabase
        .from('scheduled_messages')
        .update({ status: 'sent', error_info: 'claiming...' })
        .eq('id', msg.id)
        .eq('status', 'pending')
        .select('id');

    if (!claimed || claimed.length === 0) {
        console.log(`[QUEUE] ⏭ Msg ${msg.id} já reivindicada — skip`);
        return 'skipped';
    }

    // ── Enviar via Twilio ──
    const twilioSid = await sendWhatsappMessage(msg.patient_whatsapp_number, msg.message_content, {
        contentSid, contentVariables
    });

    if (twilioSid) {
        const checkinTitle = msg.metadata?.checkinTitle || msg.metadata?.title || msg.metadata?.messageTitle || 'Mensagem do Sistema';

        // Três writes em paralelo (context + mark sent + log)
        await Promise.all([
            supabase.from('patients').update({
                last_checkin_type: checkinTitle,
                last_checkin_at: new Date().toISOString()
            }).eq('id', msg.patient_id),

            supabase.from('scheduled_messages').update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                error_info: `Sent via Twilio SID: ${twilioSid}${contentSid ? ' (Template)' : ''}`
            }).eq('id', msg.id),

            supabase.from('messages').insert({
                patient_id: msg.patient_id,
                sender: 'system',
                text: msg.message_content,
                metadata: msg.metadata || null,
            }),
        ]);

        // Avançar current_day se todas as msgs due foram enviadas
        if (msg.source === 'protocol') {
            const protocolDay = msg.metadata?.protocolDay;
            const { count: remainingDueCount } = await supabase
                .from('scheduled_messages')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', msg.patient_id)
                .eq('status', 'pending')
                .eq('source', 'protocol')
                .lte('send_at', now.toISOString());

            if (!remainingDueCount || remainingDueCount === 0) {
                const patientRow = patientMap.get(msg.patient_id);
                const pp = patientRow?.patient_protocols?.[0];

                if (pp && protocolDay) {
                    const nextDay = protocolDay + 1;
                    const durationDays = pp.protocols?.duration_days || 90;

                    if (nextDay > durationDays) {
                        await supabase.from('patient_protocols').update({
                            current_day: nextDay, is_active: false, completed_at: new Date().toISOString()
                        }).eq('id', pp.id);
                        try {
                            const { data: patRow } = await supabase.from('patients').select('total_points, badges').eq('id', msg.patient_id).single();
                            if (patRow) {
                                const badges = patRow.badges || [];
                                const hasBadge = badges.some((b: any) => b.id === 'protocol_complete');
                                await supabase.from('patients').update({
                                    total_points: (patRow.total_points || 0) + 300,
                                    badges: hasBadge ? badges : [...badges, { id: 'protocol_complete', earnedAt: new Date().toISOString() }]
                                }).eq('id', msg.patient_id);
                            }
                        } catch {}
                        console.log(`[QUEUE] 🎉 Protocolo completo: ${msg.patient_id} (dia ${protocolDay}/${durationDays})`);
                    } else if (nextDay > pp.current_day) {
                        await supabase.from('patient_protocols').update({ current_day: nextDay }).eq('id', pp.id);
                        console.log(`[QUEUE] ↗️ ${msg.patient_id}: dia ${pp.current_day} → ${nextDay}`);
                    }
                }
            }
        }

        return 'sent';
    } else {
        await supabase.from('scheduled_messages').update({
            status: 'sent',
            error_info: `FAILED to send via Twilio API${contentSid ? ` (ContentSID: ${contentSid})` : ''}`
        }).eq('id', msg.id);
        return 'failed';
    }
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

                logger.info('Missed checkin reminder sent', { patientName: protocol.patient.full_name });
                processedCount++;

            } catch (sendError) {
                logger.error('Failed to send missed checkin reminder', sendError as Error, { 
                    patientName: protocol.patient.full_name 
                });
                // Continua para próximo paciente
            }
        }

        logger.info('Missed checkins processing finished', { processed: processedCount });
        return { success: true, processed: processedCount };

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Fatal error in processMissedCheckins', err);
        return { success: false, processed: 0, error: err.message };
    }
}
