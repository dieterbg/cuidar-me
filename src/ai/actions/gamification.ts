'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Patient, Perspective } from '@/lib/types';
import { calculateLevel, getLevelName, getStreakMultiplier } from '@/lib/level-system';

/**
 * Adiciona pontos diretamente ao paciente (bypass de rate-limit).
 * Usado pelo sistema de WhatsApp (handlers de protocolo, check-ins de IA).
 */
export async function awardGamificationPoints(
    userId: string,
    perspectiveKey: Perspective,
    basePoints: number,
    supabaseClient?: any
): Promise<{ success: boolean; message: string; pointsEarned: number }> {
    console.log(`[GAMIFICATION] awardGamificationPoints for user ${userId} perspective ${perspectiveKey} basePoints ${basePoints}`);
    const supabase = supabaseClient || createClient();

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

    const patient = patientData as any;
    let pointsEarned = basePoints;
    let message = `Ação registrada! +${pointsEarned} pontos`;

    // Inicializar estrutura se não existir
    if (!patient.gamification) patient.gamification = { totalPoints: 0, level: 1, badges: [], weeklyProgress: { perspectives: {} } };

    // ✨ MULTIPLICADOR DE STREAK ✨
    const currentStreak = patient.gamification?.streak?.currentStreak || 0;
    const multiplier = getStreakMultiplier(currentStreak);
    if (multiplier > 1) {
        pointsEarned = Math.round(basePoints * multiplier);
        message = `Ação registrada! +${pointsEarned} pontos (${multiplier}x streak) 🔥`;
    }

    // Atualizar progresso semanal
    const currentProgress = patient.gamification.weeklyProgress?.perspectives?.[perspectiveKey] || { current: 0, goal: 3, isComplete: false };
    currentProgress.current += 1;

    // Verificar se completou a meta semanal
    if (currentProgress.current >= currentProgress.goal && !currentProgress.isComplete) {
        currentProgress.isComplete = true;
        pointsEarned += 50; // Bônus por completá-la
        message += ' e Meta Semanal Concluída! 🚀';
    }

    // Salvar meta de volta no objeto
    if (!patient.gamification.weeklyProgress.perspectives) patient.gamification.weeklyProgress.perspectives = {};
    patient.gamification.weeklyProgress.perspectives[perspectiveKey] = currentProgress;

    // 3. Atualizar pontos totais e nível
    patient.gamification.totalPoints = (patient.gamification.totalPoints || 0) + pointsEarned;

    // ✨ SISTEMA DE NÍVEIS ✨
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
        message += `\nPARABÉNS! Você subiu para ${levelName}! +${levelUpBonus} pontos bônus! 🎉`;
    }

    // 4. Salvar no banco
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            gamification: patient.gamification,
            total_points: patient.gamification.totalPoints,
            level: patient.gamification.level,
            last_checkin_type: null, // Resetar contexto de check-in
            last_checkin_at: null    // Resetar contexto de check-in
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('Error updating gamification:', updateError);
        return { success: false, message: 'Erro ao salvar progresso.', pointsEarned: 0 };
    }

    // 5. Verificar Badges
    const { awardNewBadges } = await import('./badges');
    const badgeResult = await awardNewBadges(userId);

    if (badgeResult.success && badgeResult.newBadges.length > 0) {
        message += `\n${badgeResult.message}`;
    }

    revalidatePath('/portal/welcome');
    revalidatePath('/portal/journey');

    return { success: true, message, pointsEarned };
}

/**
 * Registra uma ação rápida via Interface Web (ex: botões do dashboard).
 * Aplica regras de anti-cheat (rate-limiting e cooldown).
 */
export async function registerQuickAction(
    userId: string,
    type: 'hydration' | 'mood',
    perspectiveOverride?: Perspective
): Promise<{ success: boolean; message: string; pointsEarned: number }> {
    console.log(`[GAMIFICATION] registerQuickAction (Web UI) called for user ${userId} type ${type}`);
    const supabase = createClient();

    // Buscar rapidamente os bounds de rate limit no paciente
    const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('gamification')
        .eq('user_id', userId)
        .single();

    if (fetchError || !patientData) return { success: false, message: 'Erro ao identificar paciente.', pointsEarned: 0 };

    const gamification = (patientData.gamification as any) || { lastActionLogs: {}, dailyActionCounts: {} };
    if (!gamification.lastActionLogs) gamification.lastActionLogs = {};
    if (!gamification.dailyActionCounts) gamification.dailyActionCounts = {};

    let perspectiveKey: Perspective = perspectiveOverride || (type === 'hydration' ? 'hidratacao' : 'bemEstar');
    let basePoints = type === 'hydration' ? 10 : 15;

    // ✨ ANTI-CHEAT (RATE LIMITING) ✨
    const now = Date.now();
    const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas
    const DAILY_LIMIT = 5;

    // 1. Cooldown Check
    const lastActionTime = gamification.lastActionLogs[perspectiveKey];
    if (lastActionTime && (now - lastActionTime) < COOLDOWN_MS) {
        const minutesLeft = Math.ceil((COOLDOWN_MS - (now - lastActionTime)) / 60000);
        const hoursLeft = Math.floor(minutesLeft / 60);
        const remainingMins = minutesLeft % 60;
        const timeStr = hoursLeft > 0 ? `${hoursLeft}h e ${remainingMins}min` : `${minutesLeft} minutos`;
        return { success: false, message: `Você já registrou isso há pouco! Volte em ${timeStr}. ⏳`, pointsEarned: 0 };
    }

    // 2. Daily Limit Check
    const todayKey = new Date().toISOString().split('T')[0];
    if (!gamification.dailyActionCounts[todayKey]) gamification.dailyActionCounts[todayKey] = {};
    
    const todayCount = gamification.dailyActionCounts[todayKey][perspectiveKey] || 0;
    if (todayCount >= DAILY_LIMIT) {
        return { success: false, message: `Limite diário de 5 atingido para esta atividade. Volte amanhã! 🌟`, pointsEarned: 0 };
    }

    // Registrar a hora do novo clique e incrementar contador diário para anti-cheat
    gamification.lastActionLogs[perspectiveKey] = now;
    gamification.dailyActionCounts[todayKey][perspectiveKey] = todayCount + 1;

    // Atualizar dados de anti-cheat antes de dar os pontos (para prevenir concorrência leve na UI)
    await supabase.from('patients').update({ gamification }).eq('user_id', userId);

    // Chamar a função interna de premiação
    return await awardGamificationPoints(userId, perspectiveKey, basePoints, supabase);
}
