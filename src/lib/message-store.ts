import { createServiceRoleClient } from '@/lib/supabase-server-utils';

// Internal write helper only. Public actions must authorize the actor before
// calling this, because the default client can bypass RLS with service role.
export type StoredMessageInput = {
    sender: 'patient' | 'me' | 'system';
    text: string;
    timestamp?: Date | string;
};

export async function addMessageRecord(
    patientId: string,
    message: StoredMessageInput,
    supabase = createServiceRoleClient()
): Promise<{ success: boolean; error?: string }> {
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

    const { error: updateError } = await supabase
        .from('patients')
        .update({
            last_message: message.text,
            last_message_timestamp: new Date().toISOString(),
        })
        .eq('id', patientId);

    if (updateError) {
        console.error('Error updating patient last message:', updateError);
    }

    return { success: true };
}
