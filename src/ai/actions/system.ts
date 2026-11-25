'use server';
console.log('[DEBUG] actions/system.ts loaded');

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@/lib/supabase-server';
import type { UserProfile, UserRole } from '@/lib/types';
import { authErrorMessage, requireAdmin } from '@/lib/authz';
import { getTwilioCredentialsInternal } from '@/lib/twilio-credentials';

export async function saveTwilioCredentials(credentials: { accountSid: string; authToken: string; phoneNumber: string }): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin();
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
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado' };
    }
}

export async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null> {
    try {
        await requireAdmin();
        return getTwilioCredentialsInternal();
    } catch {
        return null;
    }
}

// =====================================================
// USER MANAGEMENT ACTIONS
// =====================================================

export async function getSystemUsers(): Promise<UserProfile[]> {
    await requireAdmin();
    const supabase = createClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, photo_url, role')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching system users:', error);
        throw new Error('Não foi possível carregar as contas.');
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        photoURL: row.photo_url,
        role: row.role,
    }));
}

export async function updateUserRole(
    userId: string,
    role: UserRole,
): Promise<{ success: true; role: UserRole } | { success: false; error: string }> {
    try {
        await requireAdmin();
        const supabase = createClient();

        const { data: profile, error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId)
            .select('role')
            .maybeSingle();

        if (error) {
            console.error('Error updating user role:', error);
            return { success: false, error: 'Não foi possível salvar o perfil de acesso.' };
        }

        if (profile?.role !== role) {
            return { success: false, error: 'Não foi possível confirmar a alteração. Recarregue a lista antes de tentar novamente.' };
        }

        return { success: true, role };
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin();
        const supabase = createServiceRoleClient();

    // Deletar usuário do Auth (cascade vai deletar profile)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado' };
    }
}
