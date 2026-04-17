'use server';

import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Processa a solicitação de opt-out (SAIR) do paciente
 */
export async function handleOptOut(
    patient: any,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ success: boolean }> {
    try {
        console.log(`[OptOutHandler] Processing opt-out for patient ${patient.id}`);

        // 1. Atualizar status do paciente
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                status: 'pending', // Volta para pendente/inativo
                needs_attention: true, // Avisar equipe que houve opt-out
            })
            .eq('id', patient.id);

        if (updateError) throw updateError;

        // 2. Registrar o motivo no histórico
        await supabase.from('attention_requests').insert({
            patient_id: patient.id,
            reason: 'O paciente solicitou a interrupção das mensagens (SAIR).',
            priority: 1, // Alta prioridade para revisão humana
        });

        // 3. Enviar confirmação de despedida
        const goodbyeMsg = "Entendido. Você não receberá mais minhas mensagens diárias. 🛑\n\nCaso queira voltar a participar, entre em contato com nossa equipe pela plataforma web.\n\nAté logo!";
        await sendWhatsappMessage(whatsappNumber, goodbyeMsg);

        // 4. Salvar no histórico de mensagens
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'me',
            text: goodbyeMsg,
        });

        // 5. Business event + audit (LGPD: opt-out é evento importante)
        await log.business({ eventType: 'opt_out', patientId: patient.id });
        await log.audit({
            actorId: patient.userId ?? null,
            actorRole: 'patient',
            action: 'opt_out',
            resourceType: 'patient',
            resourceId: patient.id,
            patientId: patient.id,
            metadata: { method: 'whatsapp_keyword' },
        });

        return { success: true };

    } catch (error: any) {
        console.error('[OptOutHandler] Error processing opt-out:', error);
        return { success: false };
    }
}
