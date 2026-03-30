'use server';

/**
 * @fileOverview Agendador de mensagens de protocolo
 * Agenda mensagens ao longo do dia em horários específicos
 * Roda uma vez por dia às 6h da manhã (com idempotência para evitar duplicatas)
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { protocols, mandatoryGamificationSteps } from '@/lib/data';
import { toZonedTime } from 'date-fns-tz';

/**
 * Determina o horário de envio baseado no tipo de mensagem
 * Suporta horários fixos ou intervalos relativos para protocolos de teste
 */
function getScheduledTime(messageTitle: string, baseDate: Date, isFastTrack: boolean = false, offsetMinutes: number = 0): Date {
    const date = new Date(baseDate);

    // Se for fast track, retorna apenas o offset
    if (isFastTrack) {
        date.setMinutes(date.getMinutes() + offsetMinutes);
        return date;
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
        const fastTrackProtocols = ['2412145d-c346-4012-9040-65e9d43073a3'];
        const protocolsToProcess = isPulse
            ? activeProtocols.filter((p: any) => fastTrackProtocols.includes(p.protocol.id))
            : activeProtocols;

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

            // Para pulsos fast-track, checar se já tem mensagens pendentes
            if (isPulse) {
                const { count } = await supabase
                    .from('scheduled_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('patient_id', patientProtocol.patient.id)
                    .eq('status', 'pending');

                if (count && count > 0) {
                    console.log(`[SCHEDULER] ⏭ Pulse ignorado para ID ${patientProtocol.patient.id} - Já tem ${count} mensagens pendentes`);
                    continue;
                }
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
            const gamificationMessages = mandatoryGamificationSteps.filter(m => m.day === currentDay);

            // Limite de 3 mensagens/dia para não cansar o paciente
            // Prioridade: gamificação primeiro, depois conteúdo
            const MAX_MESSAGES_PER_DAY = 3;
            const totalRaw = gamificationMessages.length + contentMessages.length;
            const allMessages = [...gamificationMessages, ...contentMessages].slice(0, MAX_MESSAGES_PER_DAY);

            if (allMessages.length < totalRaw) {
                console.log(`[SCHEDULER] ⚠️ Limite de ${MAX_MESSAGES_PER_DAY} msgs/dia: cortando ${totalRaw - allMessages.length} mensagem(ns) de conteúdo para ${patientName}.`);
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

            const isFastTrack = patientProtocol.protocol.id === '2412145d-c346-4012-9040-65e9d43073a3';
            let scheduledCount = 0;

            // Agendar cada mensagem no horário específico
            for (let idx = 0; idx < allMessages.length; idx++) {
                const message = allMessages[idx];
                const sendTime = getScheduledTime(message.title, today, isFastTrack, (idx + 1) * 5);

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

            // Só incrementar current_day se realmente agendou alguma mensagem
            if (scheduledCount > 0) {
                await supabase
                    .from('patient_protocols')
                    .update({ current_day: currentDay + 1, updated_at: new Date().toISOString() })
                    .eq('id', patientProtocol.id);

                console.log(`[SCHEDULER]   ↗️ Dia atualizado: ${currentDay} → ${currentDay + 1}`);
            } else {
                console.log(`[SCHEDULER]   ⚠️ Nenhuma mensagem agendada (horários já passaram). Dia NÃO avançado.`);
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
