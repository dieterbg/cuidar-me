'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Patient, Perspective } from '@/lib/types';
import { calculateLevel, getLevelName } from '@/lib/level-system';

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
        // ✨ ANTI-CHEAT (RATE LIMITING) ✨
        // Evita que o paciente clique no botão 50 vezes seguidas no painel web para "farmar" pontos.
        const now = Date.now();
        const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora de espera entre cliques no mesmo botão

        if (!patient.gamification.lastActionLogs) {
            patient.gamification.lastActionLogs = {};
        }

        const lastActionTime = patient.gamification.lastActionLogs[perspectiveKey];
        if (lastActionTime && (now - lastActionTime) < COOLDOWN_MS) {
            const minutesLeft = Math.ceil((COOLDOWN_MS - (now - lastActionTime)) / 60000);
            return {
                success: false,
                message: `Você já registrou isso há pouco tempo! Tente novamente em ${minutesLeft} minutos. ⏳`,
                pointsEarned: 0
            };
        }

        // Registrar a hora do novo clique
        patient.gamification.lastActionLogs[perspectiveKey] = now;

        // Atualizar progresso semanal
        const currentProgress = patient.gamification.weeklyProgress?.perspectives?.[perspectiveKey] || { current: 0, goal: 5, isComplete: false };

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

    // Verificar se subiu de nível
    const oldLevelNum = typeof oldLevel === 'number' ? oldLevel : 1;
    if (newLevel !== oldLevelNum) {
        const levelName = getLevelName(newLevel);
        message = `PARABÉNS! Você subiu para ${levelName}! 🎉`;
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
