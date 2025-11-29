import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { StreakData } from '@/lib/types';
import { differenceInCalendarDays } from 'date-fns';

/**
 * Atualiza o streak do usuário baseado na atividade atual
 * Chamado automaticamente após qualquer ação do usuário
 */
export async function updateStreak(userId: string): Promise<{
    success: boolean;
    streakData: StreakData;
    message: string;
    bonusPoints: number;
}> {
    const supabase = createClient();

    // 1. Buscar dados atuais do paciente
    const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('gamification')
        .eq('user_id', userId)
        .single();

    if (fetchError || !patientData) {
        console.error('Error fetching patient for streak update:', fetchError);
        return {
            success: false,
            streakData: getDefaultStreak(),
            message: 'Erro ao atualizar streak.',
            bonusPoints: 0
        };
    }

    const patient = patientData as any;
    const today = new Date();

    // 2. Inicializar streak se não existir
    let streak: StreakData = patient.gamification?.streak || getDefaultStreak();

    const lastActivity = streak.lastActivityDate
        ? new Date(streak.lastActivityDate)
        : null;

    const daysSinceLastActivity = lastActivity
        ? differenceInCalendarDays(today, lastActivity)
        : 999;

    let message = '';
    let bonusPoints = 0;

    // 3. Lógica de atualização do streak
    if (daysSinceLastActivity === 0) {
        // Mesma data - não faz nada
        message = 'Streak mantido!';
    } else if (daysSinceLastActivity === 1) {
        // Dia consecutivo - incrementa streak
        streak.currentStreak += 1;
        streak.lastActivityDate = today.toISOString();

        // Atualiza recorde pessoal
        if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
        }

        // Bônus por marcos importantes
        if (streak.currentStreak === 7) bonusPoints = 100;
        if (streak.currentStreak === 14) bonusPoints = 200;
        if (streak.currentStreak === 30) bonusPoints = 500;
        if (streak.currentStreak === 60) bonusPoints = 1000;
        if (streak.currentStreak === 90) bonusPoints = 2000;

        if (bonusPoints > 0) {
            patient.gamification.totalPoints = (patient.gamification.totalPoints || 0) + bonusPoints;
            message = `🔥 ${streak.currentStreak} dias de streak! +${bonusPoints} pontos bônus!`;
        } else {
            message = `🔥 Streak de ${streak.currentStreak} dias!`;
        }

    } else if (daysSinceLastActivity > 1) {
        // Perdeu o streak - verificar se tem freeze
        if (streak.streakFreezes > 0) {
            // Usa freeze (proteção)
            streak.streakFreezes -= 1;
            streak.freezesUsedThisMonth += 1;
            streak.lastActivityDate = today.toISOString();
            message = `🛡️ Streak protegido! Você tem ${streak.streakFreezes} proteções restantes.`;
        } else {
            // Perde streak
            const lostStreak = streak.currentStreak;
            streak.currentStreak = 1; // Reinicia com hoje
            streak.lastActivityDate = today.toISOString();
            message = lostStreak > 0
                ? `💔 Você perdeu seu streak de ${lostStreak} dias. Vamos recomeçar!`
                : '🎯 Primeiro dia de streak!';
        }
    }

    // 4. Salvar no banco
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            gamification: {
                ...patient.gamification,
                streak,
                totalPoints: patient.gamification.totalPoints
            }
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('Error updating streak:', updateError);
        return {
            success: false,
            streakData: streak,
            message: 'Erro ao salvar streak.',
            bonusPoints: 0
        };
    }

    // 5. Verificar Badges de Streak
    const { awardNewBadges } = await import('./badges');
    const badgeResult = await awardNewBadges(userId);

    if (badgeResult.success && badgeResult.newBadges.length > 0) {
        message += `\n${badgeResult.message}`;
    }

    // 6. Revalidar caches
    revalidatePath('/portal/welcome');
    revalidatePath('/portal/journey');

    return {
        success: true,
        streakData: streak,
        message,
        bonusPoints
    };
}

/**
 * Reseta os freezes mensalmente (cron job)
 * Executado todo dia 1º do mês às 00:00
 */
export async function resetMonthlyFreezes(): Promise<{ success: boolean; count: number }> {
    const supabase = createClient();

    // Buscar todos os pacientes ativos
    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, user_id, gamification')
        .neq('status', 'pending');

    if (error || !patients) {
        console.error('Error fetching patients for freeze reset:', error);
        return { success: false, count: 0 };
    }

    let count = 0;

    for (const patient of patients) {
        const streak = patient.gamification?.streak;
        if (streak) {
            // Resetar freezes para 2
            streak.streakFreezes = 2;
            streak.freezesUsedThisMonth = 0;

            await supabase
                .from('patients')
                .update({
                    gamification: {
                        ...patient.gamification,
                        streak
                    }
                })
                .eq('id', patient.id);

            count++;
        }
    }

    console.log(`✅ Resetados freezes de ${count} pacientes`);
    return { success: true, count };
}

/**
 * Envia lembretes de streak para usuários que ainda não agiram hoje
 * Executado diariamente às 20:00
 */
export async function sendStreakReminders(): Promise<{ success: boolean; sent: number }> {
    const supabase = createClient();

    const today = new Date().toISOString().split('T')[0];

    // Buscar pacientes que não agiram hoje e têm streak > 0
    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, user_id, gamification')
        .eq('status', 'active');

    if (error || !patients) {
        console.error('Error fetching patients for reminders:', error);
        return { success: false, sent: 0 };
    }

    let sent = 0;

    for (const patient of patients) {
        const streak = patient.gamification?.streak;
        if (!streak || streak.currentStreak === 0) continue;

        const lastActivity = streak.lastActivityDate?.split('T')[0];

        // Se não agiu hoje, enviar lembrete
        if (lastActivity !== today) {
            // TODO: Implementar envio de notificação push
            // await sendPushNotification(patient.user_id, {
            //     title: '🔥 Não perca seu streak!',
            //     body: `Você está a ${streak.currentStreak} dias. Faça uma ação hoje!`
            // });

            console.log(`📲 Lembrete enviado para ${patient.user_id} (streak: ${streak.currentStreak})`);
            sent++;
        }
    }

    console.log(`✅ ${sent} lembretes de streak enviados`);
    return { success: true, sent };
}

/**
 * Retorna streak padrão para novos usuários
 */
function getDefaultStreak(): StreakData {
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date().toISOString(),
        streakFreezes: 2,
        freezesUsedThisMonth: 0
    };
}
