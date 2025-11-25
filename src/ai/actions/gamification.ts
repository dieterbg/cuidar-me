'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Patient, Perspective } from '@/lib/types';

export async function registerQuickAction(userId: string, type: 'hydration' | 'mood'): Promise<{ success: boolean; message: string; pointsEarned: number }> {
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
    if (!patient.gamification) patient.gamification = { totalPoints: 0, level: 'Iniciante', badges: [], weeklyProgress: { perspectives: {} } };

    // 2. Definir qual perspectiva atualizar
    let perspectiveKey: Perspective | null = null;

    if (type === 'hydration') {
        perspectiveKey = 'hidratacao';
        pointsEarned = 10;
        message = 'Hidratação registrada! +10 pontos 💧';
    } else if (type === 'mood') {
        perspectiveKey = 'bemEstar';
        pointsEarned = 15;
        message = 'Humor registrado! +15 pontos ☀️';
    }

    if (perspectiveKey) {
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

    // Lógica simples de nível
    const oldLevel = patient.gamification.level;
    if (patient.gamification.totalPoints >= 2000) patient.gamification.level = 'Mestre';
    else if (patient.gamification.totalPoints >= 1000) patient.gamification.level = 'Veterano';
    else if (patient.gamification.totalPoints >= 500) patient.gamification.level = 'Praticante';

    if (patient.gamification.level !== oldLevel) {
        message = `PARABÉNS! Você subiu para o nível ${patient.gamification.level}! 🎉`;
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

    revalidatePath('/portal/welcome');
    revalidatePath('/portal/journey');

    return { success: true, message, pointsEarned };
}
