'use server';

/**
 * @fileOverview Agendador BULK de mensagens de protocolo
 * Quando um paciente inicia um protocolo (current_day === 1 e sem mensagens pendentes),
 * agenda TODAS as mensagens dos 90 dias de uma vez.
 * O cron roda a cada 5 min apenas para detectar novos protocolos e re-agendar se necessário.
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import {
    protocols,
    getGamificationSteps
} from '@/lib/data';
import { toZonedTime } from 'date-fns-tz';

/**
 * Constrói um Date para um horário específico em BRT (America/Sao_Paulo).
 * BRT não tem mais DST desde 2019, então -03:00 é estável ano-todo.
 */
function brtTime(baseDate: Date, hour: number, minute: number = 0): Date {
    const brazilDate = toZonedTime(baseDate, 'America/Sao_Paulo');
    const dateStr = brazilDate.toISOString().split('T')[0]; // YYYY-MM-DD em BRT
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:00-03:00`);
}

/**
 * Determina o horário de envio baseado no tipo de mensagem.
 * Para bulk scheduling, usa a data do dia do protocolo (não "hoje").
 */
function getScheduledTime(messageTitle: string, calendarDate: Date, isFastTrack: boolean = false, offsetMinutes: number = 0): Date {
    if (isFastTrack) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + offsetMinutes);
        return now;
    }

    // Pesagem: 7h BRT
    if (messageTitle.includes('Peso')) return brtTime(calendarDate, 7);
    // Planejamento: 9h BRT
    if (messageTitle.includes('Planejamento')) return brtTime(calendarDate, 9);
    // Almoço: 14h BRT
    if (messageTitle.includes('Almoço')) return brtTime(calendarDate, 14);
    // Atividade: 19h BRT
    if (messageTitle.includes('Atividade')) return brtTime(calendarDate, 19);
    // Jantar: 20h30 BRT
    if (messageTitle.includes('Jantar')) return brtTime(calendarDate, 20, 30);
    // Bem-Estar (Geral): 21h BRT
    if (messageTitle.includes('Bem-Estar') && !messageTitle.includes('sono')) return brtTime(calendarDate, 21);
    // Hidratação: 20h BRT
    if (messageTitle.includes('Hidratação')) return brtTime(calendarDate, 20);
    // Bem-Estar (Sono): 9h BRT
    if (messageTitle.includes('Bem-Estar') && messageTitle.includes('sono')) return brtTime(calendarDate, 9);
    // Mensagens de conteúdo: 10h BRT
    return brtTime(calendarDate, 10);
}

// IDs dos protocolos fast-track (testes acelerados)
const FAST_TRACK_PROTOCOL_IDS = ['2412145d-c346-4012-9040-65e9d43073a3'];
const MAX_MESSAGES_PER_DAY_PRODUCTION = 3;
const MAX_MESSAGES_PER_DAY_FAST_TRACK = 10;

/**
 * Agenda TODAS as mensagens de um protocolo de uma vez (bulk).
 * Itera do current_day até durationDays, gerando gamificação + conteúdo por dia.
 */
async function bulkScheduleAllDays(
    supabase: any,
    patientProtocol: any
): Promise<number> {
    // start_date vem como "YYYY-MM-DD" — usar meio-dia BRT como âncora para evitar
    // que a conversão UTC→BRT mude o dia (meia-noite UTC = 21h BRT do dia anterior).
    const startDateStr = patientProtocol.start_date; // "YYYY-MM-DD"
    const startDateNoon = new Date(`${startDateStr}T12:00:00-03:00`);
    const protocolId = patientProtocol.protocol.id;
    const durationDays = patientProtocol.protocol.duration_days;
    const currentDay = patientProtocol.current_day;
    const patientId = patientProtocol.patient.id;
    const whatsappNumber = patientProtocol.patient.whatsapp_number;

    // Usar gamificação correta por protocolo (Fundamentos=acolhedor, Performance=técnico, etc.)
    const gamificationSteps = getGamificationSteps(protocolId);
    const protocolData = protocols.find(p => p.id === protocolId);

    const messagesToInsert: any[] = [];

    for (let day = currentDay; day <= durationDays; day++) {
        // Data real no calendário para este dia do protocolo
        // Usar noon BRT como base para que brtTime() extraia a data correta
        const calendarDate = new Date(startDateNoon);
        calendarDate.setDate(calendarDate.getDate() + (day - 1));

        const gamificationMsgs = gamificationSteps.filter(m => m.day === day);
        const contentMsgs = protocolData?.messages.filter(m => m.day === day) || [];

        // Marcar origem de cada mensagem antes de mesclar
        const tagged: { msg: any; isGamification: boolean }[] = [
            ...gamificationMsgs.map(m => ({ msg: m, isGamification: true })),
            ...contentMsgs.map(m => ({ msg: m, isGamification: false })),
        ];

        // Limite de mensagens por dia
        const limited = tagged.slice(0, MAX_MESSAGES_PER_DAY_PRODUCTION);

        for (const { msg: message, isGamification } of limited) {
            const sendTime = getScheduledTime(message.title, calendarDate);

            const messageContent = isGamification
                ? `${message.title}\n\n${message.message}`
                : message.message;

            messagesToInsert.push({
                patient_id: patientId,
                patient_whatsapp_number: whatsappNumber,
                message_content: messageContent,
                send_at: sendTime.toISOString(),
                source: 'protocol',
                status: 'pending',
                metadata: {
                    isGamification,
                    protocolDay: day,
                    perspective: message.perspective || null,
                    checkinTitle: isGamification ? message.title : null,
                    messageTitle: message.title,
                }
            });
        }
    }

    if (messagesToInsert.length === 0) {
        console.log(`[SCHEDULER] ⚠️ Nenhuma mensagem para agendar (dias ${currentDay}-${durationDays})`);
        return 0;
    }

    // Batch insert (100 por batch para Supabase)
    let totalInserted = 0;
    for (let i = 0; i < messagesToInsert.length; i += 100) {
        const batch = messagesToInsert.slice(i, i + 100);
        const { error } = await supabase.from('scheduled_messages').insert(batch);
        if (error) {
            console.error(`[SCHEDULER] ❌ Batch insert falhou no offset ${i}:`, error);
            break;
        }
        totalInserted += batch.length;
    }

    // Calcular resumo por dia
    const daysWithMessages = new Set(messagesToInsert.map(m => m.metadata.protocolDay));
    const firstDate = messagesToInsert[0]?.send_at;
    const lastDate = messagesToInsert[messagesToInsert.length - 1]?.send_at;

    console.log(`[SCHEDULER] 📦 BULK: ${totalInserted} mensagens agendadas para ${daysWithMessages.size} dias`);
    console.log(`[SCHEDULER]   📅 Primeira: ${firstDate}`);
    console.log(`[SCHEDULER]   📅 Última: ${lastDate}`);

    return totalInserted;
}

/**
 * Agenda mensagens de protocolo para todos os pacientes com protocolo ativo.
 *
 * MODO BULK (produção): agenda TODOS os dias restantes de uma vez.
 * MODO FAST-TRACK (teste): agenda apenas o dia atual (comportamento legado).
 *
 * O cron roda a cada 5 min mas só age se não houver mensagens pendentes.
 */
export async function scheduleProtocolMessages(_isPulse: boolean = false): Promise<{
    success: boolean;
    messagesScheduled: number;
    protocolsCompleted: number;
    error?: string;
}> {
    const supabase = createServiceRoleClient();
    const today = new Date();

    console.log(`[SCHEDULER] Starting protocol message scheduling (bulk mode)...`);
    console.log(`[SCHEDULER] Date: ${today.toLocaleDateString('pt-BR')}`);

    try {
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

        const protocolsToProcess = activeProtocols || [];

        if (protocolsToProcess.length === 0) {
            console.log(`[SCHEDULER] No active protocols to process`);
            return { success: true, messagesScheduled: 0, protocolsCompleted: 0 };
        }

        console.log(`[SCHEDULER] Processing ${protocolsToProcess.length} active protocols`);

        let messagesScheduled = 0;
        let protocolsCompleted = 0;

        for (const patientProtocol of protocolsToProcess) {
            const currentDay = patientProtocol.current_day;
            const protocolId = patientProtocol.protocol.id;
            const durationDays = patientProtocol.protocol.duration_days;
            const isFastTrack = FAST_TRACK_PROTOCOL_IDS.includes(protocolId);

            console.log(`[SCHEDULER] 👤 ID: ${patientProtocol.patient.id} dia ${currentDay}/${durationDays} do ${patientProtocol.protocol.name}${isFastTrack ? ' [FAST-TRACK]' : ''}`);

            // ── Verificar se completou o protocolo ──
            if (currentDay > durationDays) {
                console.log(`[SCHEDULER] ✓ ID ${patientProtocol.patient.id} completou o protocolo!`);

                await supabase
                    .from('patient_protocols')
                    .update({
                        is_active: false,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', patientProtocol.id);

                // Mensagem de parabéns
                const congratsTime = brtTime(today, 9);
                await supabase
                    .from('scheduled_messages')
                    .insert({
                        patient_id: patientProtocol.patient.id,
                        patient_whatsapp_number: patientProtocol.patient.whatsapp_number,
                        message_content: `🎉 PARABÉNS! Você completou o ${patientProtocol.protocol.name}! ` +
                            `Foram ${durationDays} dias de dedicação e crescimento. Estamos muito orgulhosos de você! 💪`,
                        send_at: congratsTime.toISOString(),
                        source: 'protocol',
                        status: 'pending',
                        metadata: { messageTitle: 'Parabéns - Conclusão de Protocolo' }
                    });

                // Badge + pontos
                try {
                    const { data: patientRow } = await supabase
                        .from('patients')
                        .select('total_points, badges')
                        .eq('id', patientProtocol.patient.id)
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
                        }).eq('id', patientProtocol.patient.id);
                        console.log(`[SCHEDULER] 🏅 +300 pts + badge protocol_complete`);
                    }
                } catch (badgeErr) {
                    console.error('[SCHEDULER] Erro ao conceder badge:', badgeErr);
                }

                messagesScheduled++;
                protocolsCompleted++;
                continue;
            }

            // ── Verificar se já tem mensagens pendentes (já agendado) ──
            const { count: pendingCount } = await supabase
                .from('scheduled_messages')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patientProtocol.patient.id)
                .eq('status', 'pending')
                .eq('source', 'protocol');

            if (pendingCount && pendingCount > 0) {
                console.log(`[SCHEDULER] ⏭ Já existem ${pendingCount} mensagens pendentes para ID ${patientProtocol.patient.id}. Bulk já ativo.`);
                continue;
            }

            // ── AGENDAR ──
            if (isFastTrack) {
                // Fast-track: agendar apenas o dia atual (comportamento legado)
                const scheduled = await scheduleSingleDay(supabase, patientProtocol, today);
                messagesScheduled += scheduled;
            } else {
                // Produção: BULK — agendar TODOS os dias restantes de uma vez
                console.log(`[SCHEDULER] 📦 Iniciando agendamento BULK para ${patientProtocol.patient.full_name} (dias ${currentDay}-${durationDays})...`);
                const scheduled = await bulkScheduleAllDays(supabase, patientProtocol);
                messagesScheduled += scheduled;

                if (scheduled > 0) {
                    // Marcar que já processamos (updated_at) — não avançar current_day
                    // O queue processor avançará current_day à medida que envia as mensagens
                    await supabase
                        .from('patient_protocols')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', patientProtocol.id);
                }
            }
        }

        console.log(`[SCHEDULER] ✅ Agendamento concluído!`);
        console.log(`[SCHEDULER] 📊 Mensagens agendadas: ${messagesScheduled}`);
        console.log(`[SCHEDULER] 🎉 Protocolos completados: ${protocolsCompleted}`);

        return { success: true, messagesScheduled, protocolsCompleted };

    } catch (error: any) {
        console.error('[SCHEDULER] ❌ Erro:', error);
        return { success: false, messagesScheduled: 0, protocolsCompleted: 0, error: error.message };
    }
}

/**
 * Agenda mensagens apenas para o dia atual (modo fast-track / legado).
 */
async function scheduleSingleDay(supabase: any, patientProtocol: any, today: Date): Promise<number> {
    const currentDay = patientProtocol.current_day;
    const protocolId = patientProtocol.protocol.id;
    const durationDays = patientProtocol.protocol.duration_days;
    const isFastTrack = FAST_TRACK_PROTOCOL_IDS.includes(protocolId);

    const protocolData = protocols.find(p => p.id === protocolId);
    const contentMessages = protocolData?.messages.filter(m => m.day === currentDay) || [];
    const gamificationSteps = getGamificationSteps(protocolId);
    const gamificationMessages = gamificationSteps.filter(m => m.day === currentDay);

    let allMessages: any[] = isFastTrack
        ? contentMessages
        : [...gamificationMessages, ...contentMessages];

    const maxPerDay = isFastTrack ? MAX_MESSAGES_PER_DAY_FAST_TRACK : MAX_MESSAGES_PER_DAY_PRODUCTION;
    allMessages = allMessages.slice(0, maxPerDay);

    if (allMessages.length === 0) {
        console.log(`[SCHEDULER] ⚠️ Nenhuma mensagem para o dia ${currentDay}`);
        await supabase
            .from('patient_protocols')
            .update({ current_day: currentDay + 1 })
            .eq('id', patientProtocol.id);
        return 0;
    }

    console.log(`[SCHEDULER] 📅 Agendando ${allMessages.length} mensagens (dia ${currentDay}):`);
    let scheduledCount = 0;

    for (let idx = 0; idx < allMessages.length; idx++) {
        const message = allMessages[idx];
        const interval = isFastTrack ? 120 : 5;
        const sendTime = getScheduledTime(message.title, today, isFastTrack, idx * interval);

        if (sendTime.getTime() < today.getTime() && !isFastTrack) {
            console.log(`[SCHEDULER]   ⏭ Horário já passou: ${message.title}`);
            continue;
        }

        const isGamification = gamificationMessages.includes(message);
        const messageContent = isGamification
            ? `${message.title}\n\n${message.message}`
            : message.message;

        const { error } = await supabase
            .from('scheduled_messages')
            .insert({
                patient_id: patientProtocol.patient.id,
                patient_whatsapp_number: patientProtocol.patient.whatsapp_number,
                message_content: messageContent,
                send_at: sendTime.toISOString(),
                source: 'protocol',
                status: 'pending',
                metadata: {
                    isGamification,
                    protocolDay: currentDay,
                    perspective: message.perspective || null,
                    checkinTitle: isGamification ? message.title : null,
                    messageTitle: message.title,
                }
            });

        if (error) {
            console.error(`[SCHEDULER]   ❌ Insert falhou para "${message.title}":`, error);
            continue;
        }

        scheduledCount++;
        const timeStr = sendTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        console.log(`[SCHEDULER]   ✓ ${timeStr} → ${message.title}`);
    }

    if (scheduledCount > 0 && isFastTrack) {
        await supabase
            .from('patient_protocols')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', patientProtocol.id);
        console.log(`[SCHEDULER]   📋 FastTrack: ${scheduledCount} msgs agendadas para dia ${currentDay}.`);
    }

    return scheduledCount;
}

/**
 * Cancela todas as mensagens futuras pendentes de um paciente.
 * Usar quando o paciente sai do protocolo ou é resetado.
 */
export async function cancelPendingMessages(patientId: string): Promise<number> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('patient_id', patientId)
        .eq('status', 'pending')
        .eq('source', 'protocol')
        .select('id');

    if (error) {
        console.error(`[SCHEDULER] ❌ Erro ao cancelar mensagens para ${patientId}:`, error);
        return 0;
    }

    const count = data?.length || 0;
    console.log(`[SCHEDULER] 🗑 ${count} mensagens pendentes canceladas para ${patientId}`);
    return count;
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
        const protocolId = patientProtocol.protocol.id;
        const protocolData = protocols.find(p => p.id === protocolId);
        const gamificationSteps = getGamificationSteps(protocolId);

        let totalMessages = 0;
        console.log(`[TEST] 👤 ${patientProtocol.patient.full_name} - Dia ${currentDay}/${patientProtocol.protocol.duration_days}`);

        for (let day = currentDay; day <= patientProtocol.protocol.duration_days; day++) {
            const gamMsgs = gamificationSteps.filter(m => m.day === day);
            const contentMsgs = protocolData?.messages.filter(m => m.day === day) || [];
            const allMsgs = [...gamMsgs, ...contentMsgs].slice(0, MAX_MESSAGES_PER_DAY_PRODUCTION);

            if (allMsgs.length > 0) {
                totalMessages += allMsgs.length;
                if (day <= currentDay + 2 || day === patientProtocol.protocol.duration_days) {
                    console.log(`[TEST] 📅 Dia ${day}: ${allMsgs.length} msgs → ${allMsgs.map(m => m.title).join(', ')}`);
                }
            }
        }

        console.log(`[TEST] 📊 Total: ${totalMessages} mensagens em ${patientProtocol.protocol.duration_days - currentDay + 1} dias`);
        return { success: true, messagesScheduled: totalMessages };

    } catch (error: any) {
        console.error('[TEST] Erro:', error);
        return { success: false, messagesScheduled: 0, error: error.message };
    }
}
