'use server';

import type { Perspective } from '@/lib/types';
import { getAuthenticatedUserAndRole } from '@/lib/authz';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { applyGamificationPoints, applyQuickAction, type GamificationResult } from '@/lib/gamification-core';

// Server actions de gamificação expostas ao navegador.
// SEGURANÇA: toda função exportada aqui é um endpoint público. Por isso:
//  - o usuário é sempre o da sessão (userId do cliente só é aceito se for igual);
//  - a quantidade de pontos NUNCA vem do cliente — é definida no servidor.
// A lógica de pontuação fica em src/lib/gamification-core.ts (não exposta).

const PROFILE_COMPLETION_POINTS = 50;

async function resolveSessionUser(requestedUserId?: string): Promise<{ userId: string } | { error: GamificationResult }> {
    try {
        const auth = await getAuthenticatedUserAndRole();
        if (requestedUserId && requestedUserId !== auth.userId) {
            return { error: { success: false, message: 'Acesso negado.', pointsEarned: 0 } };
        }
        return { userId: auth.userId };
    } catch {
        return { error: { success: false, message: 'Não autenticado.', pointsEarned: 0 } };
    }
}

/**
 * Registra uma ação rápida via Interface Web (ex: botões do dashboard).
 * Aplica regras de anti-cheat (rate-limiting e cooldown).
 */
export async function registerQuickAction(
    userId: string,
    type: 'hydration' | 'mood',
    perspectiveOverride?: Perspective
): Promise<GamificationResult> {
    const session = await resolveSessionUser(userId);
    if ('error' in session) return session.error;

    if (type !== 'hydration' && type !== 'mood') {
        return { success: false, message: 'Ação inválida.', pointsEarned: 0 };
    }

    console.log(`[GAMIFICATION] registerQuickAction (Web UI) called for user ${session.userId} type ${type}`);
    return applyQuickAction(createServiceRoleClient(), session.userId, type, perspectiveOverride);
}

/**
 * Concede os pontos de perfil completo (+50 disciplina) uma única vez.
 * O servidor confere se o perfil está de fato completo — o cliente não
 * informa pontos nem pode repetir a concessão.
 */
export async function awardProfileCompletionPoints(): Promise<GamificationResult> {
    const session = await resolveSessionUser();
    if ('error' in session) return session.error;

    const supabase = createServiceRoleClient();
    const { data: patient, error } = await supabase
        .from('patients')
        .select('birth_date, gender, goal, gamification')
        .eq('user_id', session.userId)
        .single();

    if (error || !patient) {
        return { success: false, message: 'Erro ao identificar paciente.', pointsEarned: 0 };
    }

    const isComplete = !!(patient.birth_date && patient.gender && patient.goal);
    if (!isComplete) {
        return { success: false, message: 'Perfil ainda incompleto.', pointsEarned: 0 };
    }

    const gamification = (patient.gamification as any) || {};
    if (gamification.profileCompletionAwarded) {
        return { success: false, message: 'Pontos de perfil já concedidos.', pointsEarned: 0 };
    }

    // Marca antes de pontuar para impedir concessão dupla em cliques repetidos.
    const { error: markError } = await supabase
        .from('patients')
        .update({ gamification: { ...gamification, profileCompletionAwarded: true } })
        .eq('user_id', session.userId);

    if (markError) {
        return { success: false, message: 'Erro ao salvar progresso.', pointsEarned: 0 };
    }

    return applyGamificationPoints(supabase, session.userId, 'disciplina', PROFILE_COMPLETION_POINTS);
}
