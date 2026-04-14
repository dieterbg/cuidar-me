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

        console.log(`[DEBUG-PATIENT] ========== PATIENT LOOKUP ==========`);
        console.log(`[DEBUG-PATIENT] whatsappNumber: "${whatsappNumber}"`);
        console.log(`[DEBUG-PATIENT] found: ${!!patientRaw}`);
        if (patientRaw) {
            console.log(`[DEBUG-PATIENT] patientRaw.id: "${patientRaw.id}"`);
            console.log(`[DEBUG-PATIENT] patientRaw.user_id: "${patientRaw.user_id}"`);
            console.log(`[DEBUG-PATIENT] patientRaw.full_name: "${patientRaw.full_name}"`);
            console.log(`[DEBUG-PATIENT] patientRaw.last_checkin_type: "${patientRaw.last_checkin_type}"`);
            console.log(`[DEBUG-PATIENT] patientRaw.last_checkin_at: "${patientRaw.last_checkin_at}"`);
            console.log(`[DEBUG-PATIENT] patientRaw.plan: "${patientRaw.plan}"`);
            console.log(`[DEBUG-PATIENT] transformed patient.userId: "${patient?.userId}"`);
        }
        console.log(`[DEBUG-PATIENT] ====================================`);

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
            console.log(`[EMERGENCY GATE] Keyword match detected for patient ${patient.id}`);
            const { handleEmergency } = await import('./handlers/emergency-handler');
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

        console.log(`[DEBUG-GATE] ========== CHECK-IN GATE ==========`);
        console.log(`[DEBUG-GATE] patientId: ${patient.id}`);
        console.log(`[DEBUG-GATE] patientRaw.last_checkin_type: "${pendingType}"`);
        console.log(`[DEBUG-GATE] patientRaw.last_checkin_at: "${(patientRaw as any).last_checkin_at}"`);
        console.log(`[DEBUG-GATE] pendingAt parsed: ${pendingAt?.toISOString() || 'null'}`);
        console.log(`[DEBUG-GATE] age: ${ageMs !== null ? (ageMs / 60000).toFixed(1) + ' min' : 'N/A'}`);
        console.log(`[DEBUG-GATE] isPendingCheckin: ${isPendingCheckin}`);
        console.log(`[DEBUG-GATE] messageText: "${messageText}"`);
        console.log(`[DEBUG-GATE] patient.userId: "${(patient as any).userId}"`);
        console.log(`[DEBUG-GATE] patient.user_id: "${(patient as any).user_id}"`);
        console.log(`[DEBUG-GATE] patientRaw.user_id: "${(patientRaw as any).user_id}"`);
        console.log(`[DEBUG-GATE] ====================================`);

        if (isPendingCheckin) {
            console.log(`[DEBUG-GATE] ✅ Entering checkin handler for type="${pendingType}"`);
            const { processCheckinResponse } = await import('./handlers/checkin-response-handler');
            const result = await processCheckinResponse(
                patient, messageText, pendingType, whatsappNumber, supabase
            );

            console.log(`[DEBUG-GATE] Handler returned: processed=${result.processed}`);

            if (result.processed) {
                console.log(`[ROUTING] ✅ Check-in consumed: "${pendingType}" → "${messageText}". IA silenced.`);
                return { success: true };
            }
            // Resposta não reconhecida como simples → continua para IA
            console.log(`[ROUTING] ⚠️ Check-in pending but reply not simple. Passing to AI.`);
        } else {
            console.log(`[DEBUG-GATE] ❌ NOT entering checkin handler. Reason: ${!pendingType ? 'no last_checkin_type' : !pendingAt ? 'no last_checkin_at' : 'expired (>' + (ageMs! / 60000).toFixed(0) + 'min)'}`);
        }

        // =====================================================
        // 🚀 PRIORIDADE 2: CLASSICAÇÃO DE INTENÇÃO POR IA
        // Se a gamificação não consumiu a mensagem, deixa a IA classificar.
        // =====================================================
        const { classifyMessageIntent, MessageIntent } = await import('./message-intent-classifier');

        const classification = await classifyMessageIntent(messageText, {
            hasActiveCheckin: !!isPendingCheckin,
            checkinTitle: pendingType || undefined,
        });

        console.log(`[Intent] ${classification.intent} (${classification.confidence})`);

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
            const { handleAIConversation } = await import('./handlers/conversation-handler');
            return await handleAIConversation(patient, messageText, whatsappNumber, supabase);
        }

        // 5.5 IA CONVERSACIONAL (padrão)
        const { handleAIConversation: defaultConv } = await import('./handlers/conversation-handler');
        return await defaultConv(patient, messageText, whatsappNumber, supabase);

    } catch (error: any) {
        console.error('[handlePatientReply] Error:', error);
        try {
            const supabase = createServiceRoleClient();
            await supabase.from('messages').insert({
                patient_id: (error as any).patientId || null,
                sender: 'system',
                text: `[FATAL-ERROR] handlePatientReply: ${error.message || error}`
            });
        } catch (logErr) {
            console.error('Failed to log error to DB:', logErr);
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
    const MAX_AGE_HOURS = 24; // Mensagens mais velhas que isso são descartadas (stale) - aumentado para 24h para testes
    const BATCH_LIMIT = 30;   // Máximo de mensagens por execução do cron
    const processedPatientsCount = new Map<string, number>(); // Para permitir até X mensagens por paciente por run

    const { data: pendingMessages, error: queueError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', now.toISOString())
        .order('send_at', { ascending: true }) // Priorizar as mais antigas
        .limit(BATCH_LIMIT * 5); // Busca mais para filtrar duplicatas controladas de paciente

    if (queueError) {
        console.error('[QUEUE] Erro ao buscar mensagens pendentes:', JSON.stringify(queueError));
        return { success: false, processed: 0, error: queueError.message };
    }

    if (!pendingMessages || pendingMessages.length === 0) {
        return { success: true, processed: 0 };
    }

    let processed = 0;
    let skipped = 0;

    for (const msg of pendingMessages) {
        if (processed >= BATCH_LIMIT) break;

        // 1. Verificar se já atingimos o limite por paciente nesta execução
        // FIX 4.1: Limite aumentado para 10 (suporta protocolos de teste com até 7 msgs/dia)
        const patientCount = processedPatientsCount.get(msg.patient_id) || 0;
        if (patientCount >= 10) {
            continue;
        }

        const ageMs = now.getTime() - new Date(msg.send_at).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        if (ageHours > MAX_AGE_HOURS) {
            console.log(`[QUEUE] ⏭ Skipping stale message ${msg.id} (${ageHours.toFixed(1)}h old)`);
            await supabase.from('scheduled_messages')
                .update({ status: 'sent', error_info: `Skipped: ${ageHours.toFixed(0)}h late` })
                .eq('id', msg.id);
            skipped++;
            continue;
        }

        processedPatientsCount.set(msg.patient_id, patientCount + 1);

        let contentSid = undefined;
        let contentVariables = undefined;

        if (msg.source === 'protocol' || (msg.metadata && (msg.metadata as any).isGamification)) {
            const metadata = (msg.metadata as any) || {};
            const title = metadata.checkinTitle || metadata.messageTitle || metadata.title || '';
            const isGamification = !!metadata.isGamification;

            const env = (key: string) => process.env[key]?.trim();

            // ── FIX 3: TEMPLATES DE GAMIFICAÇÃO USAM TEMPLATES GENÉRICOS DE PROTOCOLO ──
            // Mensagens de gamificação de protocolo contêm o texto completo com A/B/C
            // no message_content. Usamos templates genéricos que exibem o conteúdo textual,
            // em vez dos templates interativos do daily-checkin (que têm formato diferente).
            if (isGamification) {
                if (title.includes('Peso')) contentSid = env('TWILIO_CHECKIN_WEIGHT_SID');
                else if (title.includes('Reflexão') || title.includes('Sono') || title.includes('Bem-Estar'))
                    contentSid = env('TWILIO_PROTOCOL_REFLEXAO_SID');
                else
                    contentSid = env('TWILIO_PROTOCOL_INCENTIVO_SID');
            }

            // ── TEMPLATES NÃO-INTERATIVOS: para mensagens de conteúdo do protocolo ──
            if (!contentSid) {
                if (
                    title.includes('Dica') || title.includes('Curiosidade') || title.includes('Energia')
                ) contentSid = env('TWILIO_PROTOCOL_DICA_SID');
                else if (
                    title.includes('Reflexão') || title.includes('Respiração') || title.includes('Sono')
                ) contentSid = env('TWILIO_PROTOCOL_REFLEXAO_SID');
                else if (
                    title.includes('Incentivo') || title.includes('Movimento') || title.includes('Quase') ||
                    title.includes('Bem-vindo') || title.includes('Parabéns') || title.includes('Conquista')
                ) contentSid = env('TWILIO_PROTOCOL_INCENTIVO_SID');
            }

            if (!contentSid) {
                contentSid = env('TWILIO_PROTOCOL_INCENTIVO_SID');
                console.log(`[QUEUE] 📝 Template incentivo (fallback) para: "${title || msg.message_content?.substring(0, 50)}"`);
            }

            if (contentSid) {
                const { data: patientRow } = await supabase
                    .from('patients')
                    .select('full_name')
                    .eq('id', msg.patient_id)
                    .single();
                const patientName = patientRow?.full_name?.split(' ')[0] || "lá";

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
            // Atualizar o contexto do paciente para que a IA saiba qual foi a ÚLTIMA mensagem enviada
            const checkinTitle = (msg.metadata as any)?.checkinTitle || (msg.metadata as any)?.title || (msg.metadata as any)?.messageTitle || 'Mensagem do Sistema';
            const { data: updateData, error: updateErr } = await supabase.from('patients').update({
                last_checkin_type: checkinTitle,
                last_checkin_at: new Date().toISOString()
            }).eq('id', msg.patient_id).select('id, last_checkin_type, last_checkin_at, user_id').single();

            console.log(`[DEBUG-QUEUE] ========== MESSAGE CONTEXT SET ==========`);
            console.log(`[DEBUG-QUEUE] patient_id: ${msg.patient_id}`);
            console.log(`[DEBUG-QUEUE] contextTitle: "${checkinTitle}"`);
            console.log(`[DEBUG-QUEUE] isGamification: ${!!(msg.metadata && (msg.metadata as any).isGamification)}`);
            console.log(`[DEBUG-QUEUE] update result: ${JSON.stringify(updateData)}`);
            console.log(`[DEBUG-QUEUE] update error: ${updateErr ? JSON.stringify(updateErr) : 'none'}`);
            console.log(`[DEBUG-QUEUE] ================================================`);

            await supabase.from('scheduled_messages')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    error_info: `Sent via Twilio SID: ${twilioSid}${contentSid ? ' (Template)' : ''}`
                })
                .eq('id', msg.id);

            await supabase.from('messages').insert({
                patient_id: msg.patient_id,
                sender: 'system',
                text: msg.message_content,
                metadata: msg.metadata || null,
            });
            processed++;

            // ✨ FIX 4.2: Avançar current_day quando todas as msgs DO DIA foram enviadas ✨
            // Com bulk scheduling, existem mensagens pendentes para dias futuros.
            // Só conta como "dia concluído" quando não há mais msgs pendentes com send_at <= agora.
            if (msg.source === 'protocol') {
                const protocolDay = (msg.metadata as any)?.protocolDay;

                // Contar apenas mensagens pendentes que JÁ estão no horário (due now)
                const { count: remainingDueCount } = await supabase
                    .from('scheduled_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('patient_id', msg.patient_id)
                    .eq('status', 'pending')
                    .eq('source', 'protocol')
                    .lte('send_at', now.toISOString());

                if (!remainingDueCount || remainingDueCount === 0) {
                    // Todas as msgs do horário foram enviadas — avançar current_day
                    const { data: pp } = await supabase
                        .from('patient_protocols')
                        .select('id, current_day, protocol_id, protocol:protocols(duration_days)')
                        .eq('patient_id', msg.patient_id)
                        .eq('is_active', true)
                        .single();

                    if (pp && protocolDay) {
                        const nextDay = protocolDay + 1;
                        const durationDays = (pp.protocol as any)?.duration_days || 90;

                        if (nextDay > durationDays) {
                            await supabase
                                .from('patient_protocols')
                                .update({
                                    current_day: nextDay,
                                    is_active: false,
                                    completed_at: new Date().toISOString()
                                })
                                .eq('id', pp.id);

                            // Badge + pontos de conclusão
                            try {
                                const { data: patientRow } = await supabase
                                    .from('patients')
                                    .select('total_points, badges')
                                    .eq('id', msg.patient_id)
                                    .single();

                                if (patientRow) {
                                    const currentBadges: any[] = patientRow.badges || [];
                                    const hasBadge = currentBadges.some((b: any) => b.id === 'protocol_complete');
                                    await supabase.from('patients').update({
                                        total_points: (patientRow.total_points || 0) + 300,
                                        badges: hasBadge ? currentBadges : [
                                            ...currentBadges,
                                            { id: 'protocol_complete', earnedAt: new Date().toISOString() }
                                        ]
                                    }).eq('id', msg.patient_id);
                                    console.log(`[QUEUE] 🏅 +300 pts + badge protocol_complete para ${msg.patient_id}`);
                                }
                            } catch (badgeErr) {
                                console.error('[QUEUE] Erro ao conceder badge:', badgeErr);
                            }

                            console.log(`[QUEUE] 🎉 Protocolo completado para ${msg.patient_id}! (Dia ${protocolDay}/${durationDays})`);
                        } else if (nextDay > pp.current_day) {
                            // Só avança se protocolDay é maior que current_day (evita regressão)
                            await supabase
                                .from('patient_protocols')
                                .update({ current_day: nextDay })
                                .eq('id', pp.id);
                            console.log(`[QUEUE] ↗️ Dia avançado: ${pp.current_day} → ${nextDay} para ${msg.patient_id}`);
                        }
                    }
                } else {
                    console.log(`[QUEUE] 📋 ${remainingDueCount} msgs de protocolo pendentes (due) para ${msg.patient_id}`);
                }
            }
        } else {
            // Se falhou, registrar erro mas manter como 'sent' para evitar reenvio infinito
            // (enum message_status só aceita 'pending' e 'sent')
            await supabase.from('scheduled_messages')
                .update({
                    status: 'sent',
                    error_info: `FAILED to send via Twilio API${contentSid ? ` (ContentSID: ${contentSid})` : ''}`
                })
                .eq('id', msg.id);
        }
    }

    return { success: true, processed, skipped };
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
