'use server';

/**
 * @fileOverview Agendador de mensagens de protocolo
 * Agenda mensagens ao longo do dia em horários específicos
 * Roda uma vez por dia às 6h da manhã (com idempotência para evitar duplicatas)
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { 
    protocols, 
    mandatoryGamificationSteps,
    fundamentosGamificationSteps,
    performanceGamificationSteps
} from '@/lib/data';
import { toZonedTime } from 'date-fns-tz';

/**
 * Determina o horário de envio baseado no tipo de mensagem
 * Suporta horários fixos ou intervalos relativos para protocolos de teste
 */
function getScheduledTime(messageTitle: string, baseDate: Date, isFastTrack: boolean = false, offsetMinutes: number = 0): Date {
    const date = new Date(baseDate);

    // Se for fast track, o agendamento é relativo ao AGORA (ao pulsar do cron)
    // para evitar rajadas de mensagens com horários do passado.
    if (isFastTrack) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + offsetMinutes);
        return now;
    }

    // Pesagem: 7h (jejum, ao acordar)
    if (messageTitle.includes('Peso')) {
        date.setHours(7, 0, 0, 0);
    }
    // Planejamento: 9h (início do dia)
    else if (messageTitle.includes('Planejamento')) {
        date.setHours(9, 0, 0, 0);
    }
    // Almoço: 14h (após almoço)
    else if (messageTitle.includes('Almoço')) {
        date.setHours(14, 0, 0, 0);
    }
    // Atividade: 19h (fim da tarde)
    else if (messageTitle.includes('Atividade')) {
        date.setHours(19, 0, 0, 0);
    }
    // Jantar: 20h30 (após jantar)
    else if (messageTitle.includes('Jantar')) {
        date.setHours(20, 30, 0, 0);
    }
    // Bem-Estar (Geral): 21h (noite)
    else if (messageTitle.includes('Bem-Estar') && !messageTitle.includes('sono')) {
        date.setHours(21, 0, 0, 0);
    }
    // Hidratação: 20h (início da noite — ainda dá tempo de se hidratar se necessário)
    else if (messageTitle.includes('Hidratação')) {
        date.setHours(20, 0, 0, 0);
    }
    // Bem-Estar (Sono): 9h (manhã depois)
    else if (messageTitle.includes('Bem-Estar') && messageTitle.includes('sono')) {
        date.setHours(9, 0, 0, 0);
    }
    // Mensagens de conteúdo: 10h (meio da manhã)
    else {
        date.setHours(10, 0, 0, 0);
    }

    return date;
}

/**
 * Agenda mensagens de protocolo para todos os pacientes com protocolo ativo
 * Deve ser chamado uma vez por dia às 6h da manhã
 */
export async function scheduleProtocolMessages(isPulse: boolean = false): Promise<{
    success: boolean;
    messagesScheduled: number;
    protocolsCompleted: number;
    error?: string;
}> {
    const supabase = createServiceRoleClient();
    const today = new Date();
    const brazilNow = toZonedTime(today, 'America/Sao_Paulo');
    const todayDateStr = brazilNow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[SCHEDULER] Starting protocol message scheduling (Pulse: ${isPulse})...`);
    console.log(`[SCHEDULER] Date: ${today.toLocaleDateString('pt-BR')}`);

    try {
        // Buscar todos os pacientes com protocolo ativo
        const { data: activeProtocols, error: fetchError } = await supabase
            .from('patient_protocols')
            .select(`
                *,
                patient:patients (
                    id,
                    full_name,
                    whatsapp_number
                ),
                protocol:protocols (
                    id,
                    name,
                    duration_days
                )
            `)
            .eq('is_active', true)
            .is('completed_at', null);

        if (fetchError) {
            console.error('[SCHEDULER] Error fetching active protocols:', fetchError);
            return { success: false, messagesScheduled: 0, protocolsCompleted: 0, error: fetchError.message };
        }

        // Se for Pulse, filtrar apenas protocolos de teste/rápidos
        // Senao, filtrar para ignorar protocolos pulse
        const fastTrackProtocols = ['2412145d-c346-4012-9040-65e9d43073a3'];
        const protocolsToProcess = isPulse
            ? activeProtocols.filter((p: any) => fastTrackProtocols.includes(p.protocol.id))
            : activeProtocols.filter((p: any) => !fastTrackProtocols.includes(p.protocol.id));

        if (!protocolsToProcess || protocolsToProcess.length === 0) {
            console.log(`[SCHEDULER] No protocols to process (Pulse: ${isPulse})`);
            return { success: true, messagesScheduled: 0, protocolsCompleted: 0 };
        }

        console.log(`[SCHEDULER] Processing ${protocolsToProcess.length} protocols`);

        let messagesScheduled = 0;
        let protocolsCompleted = 0;

        for (const patientProtocol of protocolsToProcess) {
            const currentDay = patientProtocol.current_day;
            const protocolId = patientProtocol.protocol.id;
            const durationDays = patientProtocol.protocol.duration_days;
            const patientName = patientProtocol.patient.full_name;

            // Log detalhado: "ID do paciente está no dia X do protocolo Y"
            console.log(`[SCHEDULER] 👤 ID: ${patientProtocol.patient.id} está no dia ${currentDay}/${durationDays} do ${patientProtocol.protocol.name}`);

            // ✨ IDEMPOTÊNCIA: Verificar se já agendamos mensagens para este paciente HOJE ✨
            // Isso previne que o cron rode múltiplas vezes no mesmo dia e duplique/avance
            const updatedAtDate = patientProtocol.updated_at
                ? new Date(patientProtocol.updated_at).toISOString().split('T')[0]
                : null;

            if (updatedAtDate === todayDateStr && !isPulse) {
                console.log(`[SCHEDULER] ⏭ Já processado hoje: ID ${patientProtocol.patient.id} (updated_at: ${updatedAtDate})`);
                continue;
            }

            // ✨ IDEMPOTÊNCIA (Pulse e Normal): Verificar se já existem mensagens pendentes ✨
            // Se já há mensagens agendadas (pending) para este paciente, não reagendar.
            // Isso evita destruir mensagens que ainda não foram enviadas pelo queue processor.
            const { count: pendingCount } = await supabase
                .from('scheduled_messages')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patientProtocol.patient.id)
                .eq('status', 'pending')
                .eq('source', 'protocol');

            if (pendingCount && pendingCount > 0) {
                console.log(`[SCHEDULER] ⏭ Já existem ${pendingCount} mensagens pendentes para ID ${patientProtocol.patient.id}. Aguardando processamento.`);
                continue;
            }

            // Verificar se completou o protocolo
            if (currentDay > durationDays) {
                console.log(`[SCHEDULER] ✓ ID ${patientProtocol.patient.id} completou o protocolo! (Dia ${currentDay}/${durationDays})`);

                await supabase
                    .from('patient_protocols')
                    .update({
                        is_active: false,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', patientProtocol.id);

                // Agendar mensagem de parabéns para 9h
                const congratsTime = new Date(today);
                congratsTime.setHours(9, 0, 0, 0);

                const congratsMessage = `🎉 PARABÉNS! Você completou o ${patientProtocol.protocol.name}! ` +
                    `Foram ${durationDays} dias de dedicação e crescimento. Estamos muito orgulhosos de você! 💪`;

                await supabase
                    .from('scheduled_messages')
                    .insert({
                        patient_id: patientProtocol.patient.id,
                        patient_whatsapp_number: patientProtocol.patient.whatsapp_number,
                        message_content: congratsMessage,
                        send_at: congratsTime.toISOString(),
                        source: 'protocol',
                        status: 'pending'
                    });

                messagesScheduled++;
                protocolsCompleted++;
                continue;
            }

            // Buscar mensagens do dia
            const protocolData = protocols.find(p => p.id === protocolId);
            const contentMessages = protocolData?.messages.filter(m => m.day === currentDay) || [];
            const isFastTrack = protocolId === '2412145d-c346-4012-9040-65e9d43073a3';

            let allMessages: any[] = [];
            
            if (isFastTrack) {
                // Modo Fast-Track usa apenas as mensagens configuradas NO arquivo protocols.ts
                allMessages = contentMessages;
                console.log(`[SCHEDULER] 🧪 MODO TESTE (15 min): Usando ${allMessages.length} mensagens configuradas.`);
            } else {
                const gamificationMessages = mandatoryGamificationSteps.filter(m => m.day === currentDay);
                allMessages = [...gamificationMessages, ...contentMessages];
            }

            // Limite de mensagens/dia: 10 para teste intensivo (Dia 1 tem 7), 3 p/ produção
            const MAX_MESSAGES_PER_DAY = isFastTrack ? 10 : 3;
            const totalRaw = allMessages.length;
            allMessages = allMessages.slice(0, MAX_MESSAGES_PER_DAY);

            if (allMessages.length < totalRaw) {
                console.log(`[SCHEDULER] ⚠️ Limite de ${MAX_MESSAGES_PER_DAY} msgs/dia: cortando ${totalRaw - allMessages.length} mensagem(ns).`);
            }

            if (allMessages.length === 0) {
                console.log(`[SCHEDULER] ⚠️ Nenhuma mensagem para o dia ${currentDay}`);

                // Incrementar dia mesmo sem mensagens
                await supabase
                    .from('patient_protocols')
                    .update({ current_day: currentDay + 1 })
                    .eq('id', patientProtocol.id);

                continue;
            }

            console.log(`[SCHEDULER] 📅 Agendando ${allMessages.length} mensagens para ID ${patientProtocol.patient.id}:`);

            let scheduledCount = 0;

            // Agendar cada mensagem no horário específico
            for (let idx = 0; idx < allMessages.length; idx++) {
                const message = allMessages[idx];
            // Intervalo de 120 minutos (2 horas) para o teste intensivo conforme solicitado
            const interval = isFastTrack ? 120 : 5;
            const sendTime = getScheduledTime(message.title, today, isFastTrack, idx * interval);

                // ✨ PROTEÇÃO: Nunca agendar mensagem para horário que já passou ✨
                if (sendTime.getTime() < today.getTime() && !isFastTrack) {
                    console.log(`[SCHEDULER]   ⏭ Horário já passou: ${message.title} (${sendTime.toLocaleTimeString('pt-BR')})`);
                    continue;
                }

                // Verificar se é mensagem de gamificação
                const isGamification = message.title?.includes('[GAMIFICAÇÃO]') || false;

                // Preparar conteúdo da mensagem (adicionar tag se gamificação)
                const messageContent = isGamification
                    ? `${message.title}\n\n${message.message}`
                    : message.message;

                // Preparar metadata
                const metadata = {
                    isGamification,
                    protocolDay: currentDay,
                    perspective: message.perspective || null,
                    checkinTitle: isGamification ? message.title : null,
                    messageTitle: message.title, // Sempre salvar título para logging e fallback de template
                };

                // ✨ FIX 2: Dedup habilitado para TODOS os modos (inclusive FastTrack) ✨
                // Verifica se esta mensagem já existe (pending OU sent) nas últimas 24h
                // Janela de 24h evita falsos positivos em gamificação recorrente (mesma msg em semanas diferentes)
                {
                    const dedupWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const { data: existing } = await supabase
                        .from('scheduled_messages')
                        .select('id')
                        .eq('patient_id', patientProtocol.patient.id)
                        .in('status', ['pending', 'sent'])
                        .eq('message_content', messageContent)
                        .gte('created_at', dedupWindowStart)
                        .limit(1)
                        .maybeSingle();

                    if (existing) {
                        console.log(`[SCHEDULER]   ⏭ Dedup: "${message.title}" já agendada/enviada`);
                        continue;
                    }
                }

                await supabase
                    .from('scheduled_messages')
                    .insert({
                        patient_id: patientProtocol.patient.id,
                        patient_whatsapp_number: patientProtocol.patient.whatsapp_number,
                        message_content: messageContent,
                        send_at: sendTime.toISOString(),
                        source: 'protocol',
                        status: 'pending',
                        metadata
                    });

                scheduledCount++;
                messagesScheduled++;

                const timeStr = sendTime.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                console.log(`[SCHEDULER]   ✓ ${timeStr} → ${message.title}`);
            }

            // ✨ FIX 1.3: Comportamento diferente para FastTrack vs Produção ✨
            // - FastTrack: NÃO avança dia aqui → será feito pelo processMessageQueue
            //   (porque roda vários triggers por dia, precisa esperar envio das mensagens)
            // - Produção: Avança dia aqui como antes → cron roda 1x/dia, mensagens já
            //   estão agendadas com horários fixos e serão processadas ao longo do dia
            if (scheduledCount > 0) {
                if (isFastTrack) {
                    // FastTrack: apenas registrar, dia avançará no queue
                    await supabase
                        .from('patient_protocols')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', patientProtocol.id);
                    console.log(`[SCHEDULER]   📋 FastTrack: ${scheduledCount} msgs agendadas para dia ${currentDay}. Dia avançará após envio.`);
                } else {
                    // Produção: avançar dia agora (comportamento original)
                    const nextDay = currentDay + 1;
                    if (nextDay > durationDays) {
                        // Protocolo completado
                        await supabase
                            .from('patient_protocols')
                            .update({
                                current_day: nextDay,
                                is_active: false,
                                completed_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', patientProtocol.id);
                        protocolsCompleted++;
                        console.log(`[SCHEDULER]   🎉 Protocolo completado! (Dia ${currentDay}/${durationDays})`);
                    } else {
                        await supabase
                            .from('patient_protocols')
                            .update({
                                current_day: nextDay,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', patientProtocol.id);
                        console.log(`[SCHEDULER]   ✅ ${scheduledCount} msgs agendadas. Dia avançado: ${currentDay} → ${nextDay}`);
                    }
                }
            } else {
                console.log(`[SCHEDULER]   ⚠️ Nenhuma mensagem agendada (horários já passaram ou dedup).`);
            }
        }

        console.log(`[SCHEDULER] ✅ Agendamento concluído!`);
        console.log(`[SCHEDULER] 📊 Mensagens agendadas: ${messagesScheduled}`);
        console.log(`[SCHEDULER] 🎉 Protocolos completados: ${protocolsCompleted}`);

        return {
            success: true,
            messagesScheduled,
            protocolsCompleted
        };

    } catch (error: any) {
        console.error('[SCHEDULER] ❌ Erro:', error);
        return {
            success: false,
            messagesScheduled: 0,
            protocolsCompleted: 0,
            error: error.message
        };
    }
}

/**
 * Função auxiliar para testar o agendamento manualmente
 */
export async function testProtocolScheduling(patientId: string): Promise<{
    success: boolean;
    messagesScheduled: number;
    error?: string;
}> {
    const supabase = createServiceRoleClient();
    const today = new Date();

    console.log(`[TEST] Testando agendamento para paciente ${patientId}`);

    try {
        const { data: patientProtocol, error } = await supabase
            .from('patient_protocols')
            .select(`
                *,
                patient:patients (
                    id,
                    full_name,
                    whatsapp_number
                ),
                protocol:protocols (
                    id,
                    name,
                    duration_days
                )
            `)
            .eq('patient_id', patientId)
            .eq('is_active', true)
            .single();

        if (error || !patientProtocol) {
            return { success: false, messagesScheduled: 0, error: 'Protocolo ativo não encontrado' };
        }

        const currentDay = patientProtocol.current_day;
        const protocolData = protocols.find(p => p.id === patientProtocol.protocol.id);
        const contentMessages = protocolData?.messages.filter(m => m.day === currentDay) || [];
        const gamificationMessages = mandatoryGamificationSteps.filter(m => m.day === currentDay);

        const allMessages = [...gamificationMessages, ...contentMessages];

        console.log(`[TEST] 👤 ${patientProtocol.patient.full_name} - Dia ${currentDay}/${patientProtocol.protocol.duration_days}`);
        console.log(`[TEST] 📅 ${allMessages.length} mensagens para agendar:`);

        for (const message of allMessages) {
            const sendTime = getScheduledTime(message.title, today);
            const timeStr = sendTime.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            console.log(`[TEST]   ${timeStr} → ${message.title}`);
        }

        return { success: true, messagesScheduled: allMessages.length };

    } catch (error: any) {
        console.error('[TEST] Erro:', error);
        return { success: false, messagesScheduled: 0, error: error.message };
    }
}
