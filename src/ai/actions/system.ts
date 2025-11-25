'use server';
console.log('[DEBUG] actions/system.ts loaded');

import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export async function saveTwilioCredentials(credentials: { accountSid: string; authToken: string; phoneNumber: string }): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
        .from('system_config')
        .upsert({
            key: 'twilio_credentials',
            value: credentials,
        });

    if (error) {
        console.error('Error saving Twilio credentials:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'twilio_credentials')
        .single();

    if (error || !data) {
        return null;
    }

    return data.value as any;
}
