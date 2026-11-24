import type { SupabaseClient } from '@supabase/supabase-js';

export const STAFF_ROLES = ['admin', 'equipe_saude', 'assistente'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export type AppRole = StaffRole | 'paciente' | 'pendente';

export async function getProfileRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    return error ? null : profile?.role ?? null;
}
