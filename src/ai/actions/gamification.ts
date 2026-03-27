'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Patient, Perspective } from '@/lib/types';
import { calculateLevel, getLevelName, getStreakMultiplier } from '@/lib/level-system';

export async function registerQuickAction(
    userId: string,
    type: 'hydration' | 'mood',
    perspectiveOverride?: Perspective
): Promise<{ success: boolean; message: string; pointsEarned: number }> {
    console.log(`[GAMIFICATION] registerQuickAction called for user ${userId} type ${type} perspective ${perspectiveOverride || 'auto'}`);
    const supabase = createClient();

    // 1. Buscar dados atuais do paciente
    const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (fetchError || !patientData) {
        console.error('Error fetching patient for gamification:', fetchError);
        return { success: false, message: 'Erro ao identificar paciente.', pointsEarned: 0 };
    }

    const patient = patientData as any; // Cast temporário para manipular o JSON
    let pointsEarned = 0;
    let message = '';

    // Inicializar estrutura se não existir (segurança)
    // NOTA: level agora é number (1-20), mas compatível com string antiga
    if (!patient.gamification) patient.gamification = { totalPoints: 0, level: 1, badges: [], weeklyProgress: { perspectives: {} } };

    // 2. Definir qual perspectiva atualizar
    let perspectiveKey: Perspective | null = null;

    // Se foi fornecida uma perspectiva específica, usar ela
    if (perspectiveOverride) {
        perspectiveKey = perspectiveOverride;
        pointsEarned = type === 'hydration' ? 10 : 15;
        message = `Ação registrada! +${pointsEarned} pontos`;
    } else {
        // Lógica padrão (retrocompatibilidade)
        if (type === 'hydration') {
            perspectiveKey = 'hidratacao';
            pointsEarned = 10;
            message = 'Hidratação registrada! +10 pontos 💧';
        } else if (type === 'mood') {
            perspectiveKey = 'bemEstar';
            pointsEarned = 15;
            message = 'Humor registrado! +15 pontos ☀️';
        }
    }

    if (perspectiveKey) {
        // ✨ MULTIPLICADOR DE STREAK ✨
        const currentStreak = patient.gamification?.streak?.currentStreak || 0;
        const multiplier = getStreakMultiplier(currentStreak);
        if (multiplier > 1) {
            pointsEarned = Math.round(pointsEarned * multiplier);
            message = `Ação registrada! +${pointsEarned} pontos (${multiplier}x streak) 🔥`;
        }

        // ✨ ANTI-CHEAT (RATE LIMITING) ✨
        const now = Date.now();
        const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas de espera entre cliques no mesmo botão
        const DAILY_LIMIT = 5;

        if (!patient.gamification.lastActionLogs) {
            patient.gamification.lastActionLogs = {};
        }

        // 1. Cooldown Check
        const lastActionTime = patient.gamification.lastActionLogs[perspectiveKey];
        if (lastActionTime && (now - lastActionTime) < COOLDOWN_MS) {
            const minutesLeft = Math.ceil((COOLDOWN_MS - (now - lastActionTime)) / 60000);
            const hoursLeft = Math.floor(minutesLeft / 60);
            const remainingMins = minutesLeft % 60;
            const timeStr = hoursLeft > 0 ? `${hoursLeft}h e ${remainingMins}min` : `${minutesLeft} minutos`;

            return {
                success: false,
                message: `Você já registrou isso há pouco tempo! Tente novamente em ${timeStr}. ⏳`,
                pointsEarned: 0
            };
        }

        // 2. Daily Limit Check
        const todayKey = new Date().toISOString().split('T')[0];
        if (!patient.gamification.dailyActionCounts) {
            patient.gamification.dailyActionCounts = {};
        }
        if (!patient.gamification.dailyActionCounts[todayKey]) {
            patient.gamification.dailyActionCounts[todayKey] = {};
        }

        const todayCount = patient.gamification.dailyActionCounts[todayKey][perspectiveKey] || 0;
        if (todayCount >= DAILY_LIMIT) {
            return {
                success: false,
                message: `Você já atingiu o limite diário de 5 registros para esta categoria. Volte amanhã! 🌟`,
                pointsEarned: 0
            };
        }

        // Registrar a hora do novo clique e incrementar contador diário
        patient.gamification.lastActionLogs[perspectiveKey] = now;
        patient.gamification.dailyActionCounts[todayKey][perspectiveKey] = todayCount + 1;

        // Atualizar progresso semanal
        const currentProgress = patient.gamification.weeklyProgress?.perspectives?.[perspectiveKey] || { current: 0, goal: 3, isComplete: false };

        currentProgress.current += 1;

        // Verificar se completou a meta
        if (currentProgress.current >= currentProgress.goal && !currentProgress.isComplete) {
            currentProgress.isComplete = true;
            pointsEarned += 50; // Bônus por completar meta
            message += ' e Meta Semanal Concluída! 🚀';
        }

        // Salvar de volta no objeto
        if (!patient.gamification.weeklyProgress.perspectives) patient.gamification.weeklyProgress.perspectives = {};
        patient.gamification.weeklyProgress.perspectives[perspectiveKey] = currentProgress;
    }

    // 3. Atualizar pontos totais e nível
    patient.gamification.totalPoints = (patient.gamification.totalPoints || 0) + pointsEarned;

    // ✨ NOVO SISTEMA DE 20 NÍVEIS ✨
    const oldLevel = patient.gamification.level;
    const newLevel = calculateLevel(patient.gamification.totalPoints);
    patient.gamification.level = newLevel;

    // Verificar se subiu de nível — dar bônus de 100 × nível
    const oldLevelNum = typeof oldLevel === 'number' ? oldLevel : 1;
    if (newLevel > oldLevelNum) {
        const levelUpBonus = 100 * newLevel;
        patient.gamification.totalPoints += levelUpBonus;
        pointsEarned += levelUpBonus;
        const levelName = getLevelName(newLevel);
        message = `PARABÉNS! Você subiu para ${levelName}! +${levelUpBonus} pontos bônus! 🎉`;
    }

    // 4. Salvar no banco
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            gamification: patient.gamification,
            // Também atualiza colunas soltas se existirem, para compatibilidade
            total_points: patient.gamification.totalPoints,
            level: patient.gamification.level
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('Error updating gamification:', updateError);
        return { success: false, message: 'Erro ao salvar progresso.', pointsEarned: 0 };
    }

    // 5. Verificar Badges (Assíncrono, mas aguardamos para retornar mensagem se houver)
    // Import dinâmico para evitar dependência circular se houver, ou import normal no topo
    const { awardNewBadges } = await import('./badges');
    const badgeResult = await awardNewBadges(userId);

    if (badgeResult.success && badgeResult.newBadges.length > 0) {
        message += `\n${badgeResult.message}`;
    }

    revalidatePath('/portal/welcome');
    revalidatePath('/portal/journey');

    return { success: true, message, pointsEarned };
}
