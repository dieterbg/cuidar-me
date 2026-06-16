import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export interface TwilioCredentials {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
}

export async function getTwilioCredentialsInternal(): Promise<TwilioCredentials | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'twilio_credentials')
        .single();

    if (error || !data) {
        return null;
    }

    return data.value as TwilioCredentials;
}
