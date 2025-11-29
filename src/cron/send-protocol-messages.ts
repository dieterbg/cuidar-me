'use server';

/**
 * @fileOverview Agendador de mensagens de protocolo
 * Agenda mensagens ao longo do dia em horários específicos
 * Roda uma vez por dia às 6h da manhã
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { protocols, mandatoryGamificationSteps } from '@/lib/data';

/**
 * Determina o horário de envio baseado no tipo de mensagem
 */
function getScheduledTime(messageTitle: string, baseDate: Date): Date {
    const date = new Date(baseDate);

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
    // Hidratação: 22h (fim do dia, avalia o dia todo)
    else if (messageTitle.includes('Hidratação')) {
        date.setHours(22, 0, 0, 0);
    }
    // Bem-Estar (Sono): 9h (manhã seguinte)
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
export async function scheduleProtocolMessages(): Promise<{
    success: boolean;
    messagesScheduled: number;
    protocolsCompleted: number;
    error?: string;
}> {
    const supabase = createServiceRoleClient();
    const today = new Date();

    console.log('[SCHEDULER] Starting protocol message scheduling...');
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

        if (!activeProtocols || activeProtocols.length === 0) {
            console.log('[SCHEDULER] No active protocols found');
            return { success: true, messagesScheduled: 0, protocolsCompleted: 0 };
        }

        console.log(`[SCHEDULER] Found ${activeProtocols.length} active protocols`);

        let messagesScheduled = 0;
        let protocolsCompleted = 0;

        for (const patientProtocol of activeProtocols) {
            const currentDay = patientProtocol.current_day;
            const protocolId = patientProtocol.protocol.id;
            const durationDays = patientProtocol.protocol.duration_days;
            const patientName = patientProtocol.patient.full_name;

            // Log detalhado: "Fulano está no dia X do protocolo Y"
            console.log(`[SCHEDULER] 👤 ${patientName} está no dia ${currentDay}/${durationDays} do ${patientProtocol.protocol.name}`);

            // Verificar se completou o protocolo
            if (currentDay > durationDays) {
                console.log(`[SCHEDULER] ✓ ${patientName} completou o protocolo! (Dia ${currentDay}/${durationDays})`);

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

            const allMessages = [...gamificationMessages, ...contentMessages];

            if (allMessages.length === 0) {
                console.log(`[SCHEDULER] ⚠️ Nenhuma mensagem para o dia ${currentDay}`);

                // Incrementar dia mesmo sem mensagens
                await supabase
                    .from('patient_protocols')
                    .update({ current_day: currentDay + 1 })
                    .eq('id', patientProtocol.id);

                continue;
            }

            console.log(`[SCHEDULER] 📅 Agendando ${allMessages.length} mensagens para ${patientName}:`);

            // Agendar cada mensagem no horário específico
            for (const message of allMessages) {
                const sendTime = getScheduledTime(message.title, today);

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

                messagesScheduled++;

                const timeStr = sendTime.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                console.log(`[SCHEDULER]   ✓ ${timeStr} → ${message.title}`);
            }

            // Incrementar current_day após agendar todas as mensagens
            await supabase
                .from('patient_protocols')
                .update({ current_day: currentDay + 1 })
                .eq('id', patientProtocol.id);

            console.log(`[SCHEDULER]   ↗️ Dia atualizado: ${currentDay} → ${currentDay + 1}`);
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
