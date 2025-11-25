'use server';
console.log('[DEBUG] actions/system.ts loaded');

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@/lib/supabase-server';
import type { UserProfile } from '@/lib/types';

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

// =====================================================
// USER MANAGEMENT ACTIONS
// =====================================================

export async function getSystemUsers(): Promise<UserProfile[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching system users:', error);
        return [];
    }

    return data || [];
}

export async function updateUserRole(
    userId: string,
    role: 'admin' | 'equipe_saude' | 'assistente' | 'paciente' | 'pendente'
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

    if (error) {
        console.error('Error updating user role:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    // Deletar usuário do Auth (cascade vai deletar profile)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
