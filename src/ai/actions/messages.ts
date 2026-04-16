'use server';

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
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
    const supabase = createServiceRoleClient();

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
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('send_at', { ascending: true });

    if (error) {
        console.error('Error fetching patient scheduled messages:', error);
        return [];
    }

    // Mapear snake_case do Supabase para camelCase do tipo ScheduledMessage
    return (data || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientWhatsappNumber: row.patient_whatsapp_number,
        messageContent: row.message_content,
        sendAt: row.send_at,
        status: row.status,
        source: row.source,
        createdAt: row.created_at,
        errorInfo: row.error_info,
        metadata: row.metadata,
    }));
}

export async function getScheduledMessagesToday(): Promise<ScheduledMessage[]> {
    const supabase = createServiceRoleClient();
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('id, patient_id, patient_whatsapp_number, message_content, send_at, status, source, created_at')
        .gte('send_at', now.toISOString())
        .lte('send_at', endOfDay.toISOString())
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    if (error) {
        console.error('Error fetching today scheduled messages:', error);
        return [];
    }

    return (data || []).map((msg: Record<string, any>) => ({
        id: msg.id,
        patientId: msg.patient_id,
        patientWhatsappNumber: msg.patient_whatsapp_number,
        messageContent: msg.message_content,
        sendAt: msg.send_at,
        status: msg.status,
        source: msg.source,
        createdAt: msg.created_at,
        errorInfo: null,
    }));
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
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return (data || []).map(msg => ({
        ...msg,
        timestamp: msg.created_at
    })) as Message[];
}
/**
 * Reagenda uma mensagem pendente para um novo send_at.
 * sendAt deve ser pelo menos 10 minutos no futuro.
 */
export async function rescheduleMessage(
    messageId: string,
    sendAt: string // ISO string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    const minAllowed = new Date(Date.now() + 10 * 60 * 1000);
    if (new Date(sendAt) < minAllowed) {
        return { success: false, error: 'O horário deve ser pelo menos 10 minutos no futuro.' };
    }

    const { error } = await supabase
        .from('scheduled_messages')
        .update({ send_at: sendAt })
        .eq('id', messageId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error rescheduling message:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deleteMessages(patientId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    // 1. Delete all messages for the patient
    const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('patient_id', patientId);

    if (deleteError) {
        console.error('Error deleting messages:', deleteError);
        return { success: false, error: deleteError.message };
    }

    // 2. Clear last message info in patients table
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            last_message: null,
            last_message_timestamp: null,
        })
        .eq('id', patientId);

    if (updateError) {
        console.error('Error clearing patient last message:', updateError);
        // We don't return false because the primary action (deleting messages) succeeded
    }

    return { success: true };
}
