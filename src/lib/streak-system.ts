/**
 * Streak System - Sistema de Sequências para Gamificação
 * 
 * Gerencia o streak (sequência de dias consecutivos) dos pacientes.
 * 
 * Funcionalidades:
 * - Rastrear dias consecutivos de atividade
 * - Proteção de streak com "freezes"
 * - Reset automático de freezes mensalmente
 * - Recordes pessoais
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente admin para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    streakFreezes: number;
    freezesUsedThisMonth: number;
    lastFreezeResetDate?: string | null;
}

/**
 * Atualiza o streak de um paciente após uma atividade
 * 
 * @param patientId - ID do paciente
 * @returns Dados atualizados do streak
 */
export async function updateStreakAfterActivity(
    patientId: string
): Promise<StreakData | null> {
    try {
        // Chamar função SQL que calcula o streak
        const { data, error } = await supabaseAdmin.rpc('update_patient_streak', {
            p_patient_id: patientId,
        });

        if (error) {
            console.error('Erro ao atualizar streak:', error);
            return null;
        }

        return data as StreakData;
    } catch (error) {
        console.error('Erro ao atualizar streak:', error);
        return null;
    }
}

/**
 * Verifica o status atual do streak de um paciente
 * 
 * @param patientId - ID do paciente
 * @returns Dados do streak ou null
 */
export async function getStreakStatus(
    patientId: string
): Promise<StreakData | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('patients')
            .select('streak_data')
            .eq('id', patientId)
            .single();

        if (error) {
            console.error('Erro ao buscar streak:', error);
            return null;
        }

        return data?.streak_data as StreakData;
    } catch (error) {
        console.error('Erro ao buscar streak:', error);
        return null;
    }
}

/**
 * Usa um freeze de streak para proteger a sequência
 * 
 * @param patientId - ID do paciente
 * @returns true se sucesso, false se não tiver freeze disponível
 */
export async function useStreakFreeze(
    patientId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabaseAdmin.rpc('use_streak_freeze', {
            p_patient_id: patientId,
        });

        if (error) {
            console.error('Erro ao usar freeze:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('Erro ao usar freeze:', error);
        return false;
    }
}

/**
 * Verifica se o streak está em risco de quebrar
 * (última atividade foi há mais de 1 dia)
 * 
 * @param streakData - Dados do streak
 * @returns true se streak está em risco
 */
export function isStreakAtRisk(streakData: StreakData): boolean {
    if (!streakData.lastActivityDate) {
        return false;
    }

    const lastActivity = new Date(streakData.lastActivityDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff >= 1;
}

/**
 * Reset mensal de freezes (cron job)
 * Deve ser executado todo dia 1 de cada mês
 */
export async function resetMonthlyFreezes(): Promise<void> {
    try {
        const today = new Date();

        // Buscar todos os pacientes
        const { data: patients, error } = await supabaseAdmin
            .from('patients')
            .select('id, streak_data');

        if (error) {
            console.error('Erro ao buscar pacientes para reset:', error);
            return;
        }

        // Atualizar cada paciente
        const updates = patients.map(async (patient) => {
            const streakData = patient.streak_data as StreakData;

            const updatedStreak = {
                ...streakData,
                streakFreezes: 2, // Reset para 2 freezes
                freezesUsedThisMonth: 0,
                lastFreezeResetDate: today.toISOString(),
            };

            return supabaseAdmin
                .from('patients')
                .update({ streak_data: updatedStreak })
                .eq('id', patient.id);
        });

        await Promise.all(updates);
        console.log(`Reset de freezes concluído para ${patients.length} pacientes`);
    } catch (error) {
        console.error('Erro no reset mensal de freezes:', error);
    }
}

/**
 * Formatar streak para exibição
 * 
 * @param currentStreak - Número de dias
 * @returns String formatada com emoji
 */
export function formatStreakDisplay(currentStreak: number): string {
    if (currentStreak === 0) {
        return '🔥 Comece sua sequência!';
    }

    return `🔥 ${currentStreak} ${currentStreak === 1 ? 'dia' : 'dias'} de sequência!`;
}
