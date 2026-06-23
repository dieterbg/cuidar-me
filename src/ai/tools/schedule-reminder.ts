import { createServiceRoleClient } from '@/lib/supabase-server-utils';

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
