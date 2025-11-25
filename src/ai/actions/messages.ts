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

import type { ScheduledMessage } from '@/lib/types';

// ... (código anterior)

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

export async function getScheduledMessagesForPatient(patientId: string): Promise<ScheduledMessage[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('send_at', { ascending: true });

    if (error) {
        console.error('Error fetching patient scheduled messages:', error);
        return [];
    }

    return data || [];
}

export async function updateScheduledMessage(
    messageId: string,
    updates: Partial<ScheduledMessage>
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('scheduled_messages')
        .update(updates)
        .eq('id', messageId);

    if (error) {
        console.error('Error updating scheduled message:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function resolvePatientAttention(
    patientId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Get current user for resolvedBy field
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    // Update patient to clear attention flag
    const { error: patientError } = await supabase
        .from('patients')
        .update({ needs_attention: false })
        .eq('id', patientId);

    if (patientError) {
        console.error('Error resolving patient attention:', patientError);
        return { success: false, error: patientError.message };
    }

    // Mark any active attention requests as resolved
    const { error: requestError } = await supabase
        .from('attention_requests')
        .update({
            is_resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
        })
        .eq('patient_id', patientId)
        .eq('is_resolved', false);

    if (requestError) {
        console.error('Error updating attention requests:', requestError);
        // Don't fail the whole operation if just the request update fails
    }

    return { success: true };
}

import type { Message } from '@/lib/types';

export async function getMessages(patientId: string): Promise<Message[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return data as Message[];
}
