// src/lib/supabase-server-utils.ts
import { createClient } from './supabase-server';
import { cookies } from 'next/headers';

/**
 * Obtém o usuário autenticado atual no servidor
 * @returns User ID ou null se não autenticado
 */
export async function getCurrentUser() {
    const supabase = createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}

/**
 * Obtém o perfil completo do usuário autenticado
 */
export async function getCurrentUserProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return profile;
}

/**
 * Verifica se o usuário tem permissão de admin
 */
export async function isAdmin() {
    const profile = await getCurrentUserProfile();
    return profile?.role === 'admin';
}

/**
 * Verifica se o usuário é da equipe (admin, equipe_saude, assistente)
 */
export async function isStaff() {
    const profile = await getCurrentUserProfile();
    return profile?.role && ['admin', 'equipe_saude', 'assistente'].includes(profile.role);
}

/**
 * Cria um cliente Supabase com Service Role (para operações administrativas)
 * ATENÇÃO: Use apenas em Server Actions, nunca exponha ao cliente!
 */
export function createServiceRoleClient() {
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');

    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}
