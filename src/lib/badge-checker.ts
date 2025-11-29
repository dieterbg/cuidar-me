/**
 * Badge Checker - Sistema de verificação e desbloqueio automático de badges
 * 
 * Este módulo é chamado sempre que um paciente ganha pontos ou completa ações
 */

import { createClient } from '@supabase/supabase-js';
import { BADGE_CATALOG } from './badge-catalog';
import { checkBadgeUnlocks, extractPatientStats, type PatientStats } from './badge-unlock-logic';
import { getStreakStatus } from './streak-system';
import type { Patient } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

/**
 * Verifica e desbloqueia badges automaticamente para um paciente
 * Deve ser chamado após ganhar pontos ou completar ações importantes
 * 
 * @param patientId - ID do paciente
 * @returns Array de badges NOVOS desbloqueados
 */
export async function checkAndUnlockBadges(patientId: string): Promise<string[]> {
    try {
        // 1. Buscar dados do paciente
        const { data: patient, error: patientError } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            console.error('Erro ao buscar paciente:', patientError);
            return [];
        }

        // 2. Extrair badges atuais
        const currentBadges = patient.badges || [];

        // 3. Coletar estatísticas completas
        const stats = await collectPatientStats(patient);

        // 4. Verificar novos badges
        const newBadges = checkBadgeUnlocks(currentBadges, stats);

        // 5. Se houver badges novos, atualizar no banco e notificar
        if (newBadges.length > 0) {
            const updatedBadges = [...currentBadges, ...newBadges];

            await supabaseAdmin
                .from('patients')
                .update({ badges: updatedBadges })
                .eq('id', patientId);

            // Notificar paciente sobre novos badges
            for (const badgeId of newBadges) {
                await notifyBadgeUnlocked(patientId, badgeId);
            }
        }

        return newBadges;
    } catch (error) {
        console.error('Erro ao verificar badges:', error);
        return [];
    }
}

/**
 * Coleta todas as estatísticas necessárias do paciente
 * Inclui dados do banco (comunidade, histórico)
 */
async function collectPatientStats(patient: any): Promise<PatientStats> {
    // Começar com stats básicas do objeto patient
    const baseStats = extractPatientStats(patient as Patient);

    // Buscar streak do sistema novo
    const streakData = patient.streak_data || await getStreakStatus(patient.id);
    if (streakData) {
        baseStats.streak = {
            current: streakData.currentStreak,
            longest: streakData.longestStreak
        };
    }

    // Buscar estatísticas de comunidade
    const { data: comments } = await supabaseAdmin
        .from('community_comments')
        .select('id')
        .eq('author_id', patient.id);

    const { data: reactions } = await supabaseAdmin
        .from('reactions')
        .select('id')
        .eq('author_id', patient.id);

    const { data: topics } = await supabaseAdmin
        .from('community_topics')
        .select('id')
        .eq('author_id', patient.id);

    baseStats.community = {
        comments: comments?.length || 0,
        reactions: reactions?.length || 0,
        posts: topics?.length || 0
    };

    // Buscar check-ins por perspectiva (health_metrics table)
    const { data: healthMetrics } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('patient_id', patient.id);

    if (healthMetrics) {
        // Contar check-ins de alimentação (meal_checkin)
        const mealCheckins = healthMetrics.filter(m => m.meal_checkin);
        baseStats.perspectives.alimentacao = {
            checkins: mealCheckins.length,
            perfectCheckins: mealCheckins.filter(m => m.meal_checkin === 'A').length
        };

        // Contar atividades físicas
        const physicalActivity = healthMetrics.filter(m => m.physical_activity);
        baseStats.perspectives.movimento = {
            checkins: physicalActivity.length,
            perfectCheckins: 0
        };

        // Contar pesagens
        const weighins = healthMetrics.filter(m => m.weight_kg);
        baseStats.perspectives.disciplina = {
            checkins: weighins.length,
            perfectCheckins: 0
        };
    }

    // Verificar meta de peso
    if (patient.protocol?.weight_goal_kg && patient.initial_weight_kg) {
        const { data: latestWeight } = await supabaseAdmin
            .from('health_metrics')
            .select('weight_kg')
            .eq('patient_id', patient.id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (latestWeight?.weight_kg) {
            baseStats.special.weightGoalReached = latestWeight.weight_kg <= patient.protocol.weight_goal_kg;
        }
    }

    // Calcular semanas perfeitas (simplificado - pode ser expandido)
    const { data: weeklyProgress } = await supabaseAdmin
        .from('weekly_progress')
        .select('*')
        .eq('patient_id', patient.id)
        .order('week_start_date', { ascending: false });

    if (weeklyProgress) {
        // Contar semanas onde TODAS as perspectivas atingiram a meta
        const perfectWeeks = weeklyProgress.filter(week => {
            return (
                week.alimentacao_current >= week.alimentacao_goal &&
                week.movimento_current >= week.movimento_goal &&
                week.hidratacao_current >= week.hidratacao_goal &&
                week.disciplina_current >= week.disciplina_goal &&
                week.bem_estar_current >= week.bem_estar_goal
            );
        });
        baseStats.special.perfectWeeks = perfectWeeks.length;
    }

    return baseStats;
}

/**
 * Notifica paciente sobre badge desbloqueado
 * Pode enviar via WhatsApp ou criar notificação no app
 */
async function notifyBadgeUnlocked(patientId: string, badgeId: string): Promise<void> {
    const badge = BADGE_CATALOG.find(b => b.id === badgeId);
    if (!badge) return;

    console.log(`🎉 Badge desbloqueado para paciente ${patientId}: ${badge.name}`);

    // TODO: Enviar mensagem via WhatsApp
    // const { data: patient } = await supabaseAdmin
    //   .from('patients')
    //   .select('whatsapp_number, full_name')
    //   .eq('id', patientId)
    //   .single();

    // if (patient) {
    //   await sendWhatsAppMessage(
    //     patient.whatsapp_number,
    //     `🎉 Parabéns! Você desbloqueou um novo badge: ${badge.icon} ${badge.name}\n\n${badge.description}`
    //   );
    // }

    // Por enquanto, apenas log
    console.log(`Badge: ${badge.icon} ${badge.name} - ${badge.description}`);
}

/**
 * Retorna progresso para próximo badge não desbloqueado
 * Útil para mostrar na UI
 */
export async function getNextBadgeProgress(patientId: string): Promise<{
    badgeId: string;
    name: string;
    icon: string;
    progress: number; // 0-100
    description: string;
} | null> {
    try {
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (!patient) return null;

        const currentBadges = patient.badges || [];
        const stats = await collectPatientStats(patient);

        // Encontrar badges não desbloqueados e calcular progresso
        const unlockedBadges = BADGE_CATALOG.filter(b => !currentBadges.includes(b.id));

        for (const badge of unlockedBadges) {
            const { type, requirement, perspectiveKey } = badge.criteria;
            let current = 0;
            let target = typeof requirement === 'number' ? requirement : 100;

            switch (type) {
                case 'streak':
                    current = stats.streak.current;
                    break;
                case 'points':
                    current = stats.points.total;
                    break;
                case 'perspective':
                    if (perspectiveKey) {
                        const pStats = stats.perspectives[perspectiveKey];
                        current = badge.id === 'nutrition_expert'
                            ? pStats?.perfectCheckins || 0
                            : pStats?.checkins || 0;
                    }
                    break;
                case 'community':
                    if (badge.id.includes('comment')) current = stats.community.comments;
                    if (badge.id.includes('reaction')) current = stats.community.reactions;
                    break;
            }

            const progress = Math.min((current / target) * 100, 100);

            // Retornar o badge mais próximo de ser desbloqueado
            if (progress > 0 && progress < 100) {
                return {
                    badgeId: badge.id,
                    name: badge.name,
                    icon: badge.icon,
                    progress: Math.round(progress),
                    description: `${current}/${target} - ${badge.description}`
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Erro ao calcular progresso de badges:', error);
        return null;
    }
}
