'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { BADGE_CATALOG, type BadgeDefinition } from '@/lib/badge-catalog';
import { checkBadgeUnlocks, type PatientStats } from '@/lib/badge-unlock-logic';
import { calculateLevel } from '@/lib/level-system';

/**
 * Verifica e concede novos badges ao usuário
 * Chamado após qualquer ação de gamificação (pontos, streak, etc)
 */
export async function awardNewBadges(userId: string): Promise<{
    success: boolean;
    newBadges: BadgeDefinition[];
    message: string;
}> {
    const supabase = createClient();

    try {
        // 1. Buscar dados do paciente
        const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (patientError || !patientData) {
            console.error('Error fetching patient for badges:', patientError);
            return { success: false, newBadges: [], message: 'Erro ao buscar dados.' };
        }

        const patient = patientData as any;
        const currentBadges: string[] = patient.gamification?.badges || [];

        // 2. Coletar estatísticas (Stats) — queries reais do banco
        const patientId = patient.id;

        // Contadores de check-ins por perspectiva
        const [hydrationResult, mealsResult, activityResult, wellbeingResult, commentsResult] = await Promise.all([
            supabase.from('daily_checkins').select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId).not('hydration', 'is', null),
            supabase.from('daily_checkins').select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId).not('breakfast', 'is', null),
            supabase.from('daily_checkins').select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId).not('activity', 'is', null),
            supabase.from('daily_checkins').select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId).not('wellbeing', 'is', null),
            supabase.from('community_comments').select('*', { count: 'exact', head: true })
                .eq('author_id', patientId),
        ]);

        const stats: PatientStats = {
            streak: {
                current: patient.gamification?.streak?.currentStreak || 0,
                longest: patient.gamification?.streak?.longestStreak || 0
            },
            points: {
                total: patient.gamification?.totalPoints || 0
            },
            level: {
                current: typeof patient.gamification?.level === 'number'
                    ? patient.gamification.level
                    : calculateLevel(patient.gamification?.totalPoints || 0)
            },
            perspectives: {
                hidratacao: { checkins: hydrationResult.count || 0, perfectCheckins: 0 },
                alimentacao: { checkins: mealsResult.count || 0, perfectCheckins: 0 },
                movimento: { checkins: activityResult.count || 0, perfectCheckins: 0 },
                disciplina: { checkins: 0, perfectCheckins: 0 },
                bemEstar: { checkins: wellbeingResult.count || 0, perfectCheckins: 0 },
            },
            community: {
                comments: commentsResult.count || 0,
                reactions: 0,
                posts: 0
            },
            special: {
                perfectWeeks: 0,
                weightGoalReached: false
            }
        };

        // 2.1 Enriquecer stats com dados reais do banco (Exemplos)

        // Contar comentários na comunidade
        /*
        const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', patient.id); // Note: author_id usually is patient.id (uuid) not user_id (auth)
        stats.community.comments = commentsCount || 0;
        */

        // 3. Verificar desbloqueios
        const newBadgeIds = checkBadgeUnlocks(currentBadges, stats);

        if (newBadgeIds.length === 0) {
            return { success: true, newBadges: [], message: '' };
        }

        // 4. Adicionar novos badges
        const updatedBadges = [...currentBadges, ...newBadgeIds];

        // Atualizar no banco
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                gamification: {
                    ...patient.gamification,
                    badges: updatedBadges
                }
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating badges:', updateError);
            return { success: false, newBadges: [], message: 'Erro ao salvar badges.' };
        }

        // 5. Preparar retorno
        const newBadgeDefinitions = newBadgeIds
            .map(id => BADGE_CATALOG.find(b => b.id === id))
            .filter(Boolean) as BadgeDefinition[];

        // Revalidar
        revalidatePath('/portal/journey');
        revalidatePath('/portal/achievements');

        const message = newBadgeDefinitions.length === 1
            ? `🏆 Novo badge desbloqueado: ${newBadgeDefinitions[0].name}!`
            : `🏆 ${newBadgeDefinitions.length} novos badges desbloqueados!`;

        return {
            success: true,
            newBadges: newBadgeDefinitions,
            message
        };

    } catch (error) {
        console.error('Exception in awardNewBadges:', error);
        return { success: false, newBadges: [], message: 'Erro interno.' };
    }
}

/**
 * Retorna todos os badges do usuário organizados
 */
export async function getUserBadges(userId: string): Promise<{
    unlocked: BadgeDefinition[];
    locked: BadgeDefinition[];
    totalCount: number;
    unlockedCount: number;
}> {
    const supabase = createClient();

    const { data: patientData } = await supabase
        .from('patients')
        .select('gamification')
        .eq('user_id', userId)
        .single();

    const patient = patientData as any;
    const unlockedIds: string[] = patient?.gamification?.badges || [];

    const unlocked: BadgeDefinition[] = [];
    const locked: BadgeDefinition[] = [];

    BADGE_CATALOG.forEach(badge => {
        if (unlockedIds.includes(badge.id)) {
            unlocked.push(badge);
        } else {
            locked.push(badge);
        }
    });

    return {
        unlocked,
        locked,
        totalCount: BADGE_CATALOG.length,
        unlockedCount: unlocked.length
    };
}
