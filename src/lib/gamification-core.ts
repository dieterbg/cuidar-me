import { revalidatePath } from 'next/cache';
import type { Perspective } from '@/lib/types';
import { calculateLevel, getLevelName, getStreakMultiplier } from '@/lib/level-system';

// Núcleo da gamificação — SÓ para uso no servidor.
// Este arquivo NÃO tem 'use server', então suas funções não viram endpoints
// públicos (server actions). Quem chama é responsável por já ter autorizado
// o usuário e por passar o client Supabase adequado (service-role nos
// handlers de WhatsApp; service-role após checagem de sessão nas actions web).

export type GamificationResult = { success: boolean; message: string; pointsEarned: number };

/**
 * Adiciona pontos diretamente ao paciente (bypass de rate-limit).
 * Usado pelo sistema de WhatsApp (handlers de protocolo, check-ins de IA).
 */
export async function applyGamificationPoints(
    supabase: any,
    userId: string,
    perspectiveKey: Perspective,
    basePoints: number
): Promise<GamificationResult> {
    console.log(`[GAMIFICATION] applyGamificationPoints for user ${userId} perspective ${perspectiveKey} basePoints ${basePoints}`);

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
    if (!patient.gamification.weeklyProgress) patient.gamification.weeklyProgress = { perspectives: {} };
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
    const { awardNewBadges } = await import('@/ai/actions/badges');
    const badgeResult = await awardNewBadges(userId);

    if (badgeResult.success && badgeResult.newBadges.length > 0) {
        message += `\n${badgeResult.message}`;
    }

    revalidatePath('/portal/welcome');
    revalidatePath('/portal/journey');

    return { success: true, message, pointsEarned };
}

/**
 * Ação rápida (hidratação / humor) com regras de anti-cheat
 * (cooldown de 4h e limite diário de 5 por perspectiva).
 */
export async function applyQuickAction(
    supabase: any,
    userId: string,
    type: 'hydration' | 'mood',
    perspectiveOverride?: Perspective
): Promise<GamificationResult> {
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

    const perspectiveKey: Perspective = perspectiveOverride || (type === 'hydration' ? 'hidratacao' : 'bemEstar');
    const basePoints = type === 'hydration' ? 10 : 15;

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
    return await applyGamificationPoints(supabase, userId, perspectiveKey, basePoints);
}
