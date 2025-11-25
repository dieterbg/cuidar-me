'use server';

import { createClient } from '@/lib/supabase-server';
import { sendWhatsappMessage as sendWhatsappMessageTwilio } from '@/lib/twilio';

export async function addMessage(
    patientId: string,
    message: { sender: 'patient' | 'me' | 'system'; text: string; timestamp?: Date | string }
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('messages')
        .insert({
            patient_id: patientId,
            sender: message.sender,
            text: message.text,
        });

    if (error) {
        console.error('Error adding message:', error);
        return { success: false, error: error.message };
    }

    // Atualizar última mensagem do paciente
    await supabase
        .from('patients')
        .update({
            last_message: message.text,
            last_message_timestamp: new Date().toISOString(),
        })
        .eq('id', patientId);

    return { success: true };
}

export async function addMessageAndSendWhatsapp(
    patientId: string,
    to: string,
    text: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Enviar via Twilio
        const sent = await sendWhatsappMessageTwilio(to, text);
        if (!sent) {
            throw new Error("A mensagem não pôde ser enviada via Twilio.");
        }

        // 2. Salvar no banco
        await addMessage(patientId, { sender: 'me', text });

        return { success: true };
    } catch (error: any) {
        console.error('[Server Action] Erro em addMessageAndSendWhatsapp:', error);
        return { success: false, error: error.message };
    }
}

export async function scheduleReminder(
    patientId: string,
    whatsappNumber: string,
    message: string,
    sendAt: Date
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('scheduled_messages')
        .insert({
            patient_id: patientId,
            patient_whatsapp_number: whatsappNumber,
            message_content: message,
            send_at: sendAt.toISOString(),
            source: 'dynamic_reminder',
            status: 'pending',
        });

    if (error) {
        console.error('Error scheduling reminder:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
