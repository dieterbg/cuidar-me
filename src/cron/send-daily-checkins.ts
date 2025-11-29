/**
 * Cron Job: Enviar Check-ins Diários Genéricos
 * Dispara o fluxo de monitoramento de rotina (hidratação, refeições, etc)
 * Baseado no horário preferido do paciente
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { startDailyCheckin } from '@/ai/actions/daily-checkin';
import { loggers } from '@/lib/logger';
import { batchProcess } from '@/lib/error-handler';
import { getHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export async function sendDailyCheckins() {
    const supabase = createServiceRoleClient();
    const logger = loggers.cron;

    // 1. Determinar horário atual no Brasil
    const brazilTime = toZonedTime(new Date(), 'America/Sao_Paulo');
    const currentHour = getHours(brazilTime);

    // Mapear hora atual para preferência (margem de +/- 1h)
    let targetPreference: 'morning' | 'afternoon' | 'night' | null = null;

    if (currentHour >= 8 && currentHour <= 9) targetPreference = 'morning';
    else if (currentHour >= 14 && currentHour <= 15) targetPreference = 'afternoon';
    else if (currentHour >= 19 && currentHour <= 20) targetPreference = 'night';

    if (!targetPreference) {
        logger.info(`[DailyCheckin] Hora atual (${currentHour}h) não corresponde a nenhum turno de envio.`);
        return { processed: 0, skipped: 0, error: null };
    }

    logger.info(`[DailyCheckin] Iniciando envio para turno: ${targetPreference} (${currentHour}h)`);

    try {
        // 2. Buscar pacientes elegíveis
        // - Status active
        // - Plano premium ou vip (freemium não tem check-in diário genérico)
        // - Horário preferido bate com atual
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, full_name, whatsapp_number, plan, preferred_message_time')
            .eq('status', 'active')
            .in('plan', ['premium', 'vip']) // Apenas planos pagos
            .eq('preferred_message_time', targetPreference);

        if (error) throw error;

        if (!patients || patients.length === 0) {
            logger.info('[DailyCheckin] Nenhum paciente encontrado para este horário.');
            return { processed: 0, skipped: 0, error: null };
        }

        logger.info(`[DailyCheckin] Encontrados ${patients.length} pacientes elegíveis.`);

        // 3. Processar envios em lote
        const results = await batchProcess(patients, async (patient: any) => {
            // Verificar se já tem check-in hoje (startDailyCheckin já verifica, mas bom evitar chamada)
            // Vamos deixar o startDailyCheckin lidar com a verificação para garantir consistência

            if (!patient.whatsapp_number) {
                logger.warn(`Paciente sem WhatsApp`, { patientId: patient.id });
                return { success: false, reason: 'no_whatsapp' };
            }

            const result = await startDailyCheckin(
                patient.id,
                patient.whatsapp_number,
                patient.full_name,
                patient.plan as 'premium' | 'vip'
            );

            if (result.success) {
                logger.info(`Check-in enviado`, { patientId: patient.id });
                return { success: true };
            } else {
                // Se erro for "já iniciado", não é falha real
                if (result.error?.includes('already started')) {
                    return { success: false, reason: 'already_started' };
                }

                logger.error(`Falha ao enviar check-in`, new Error(result.error), { patientId: patient.id });
                throw new Error(result.error);
            }
        }, { batchSize: 5, continueOnError: true });

        // Contabilizar
        const processed = results.filter(r => !(r instanceof Error) && r.success).length;
        const skipped = results.length - processed;

        logger.info(`[DailyCheckin] Finalizado. Enviados: ${processed}, Pulados/Falhas: ${skipped}`);

        return { processed, skipped, error: null };

    } catch (error: any) {
        logger.error('[DailyCheckin] Erro fatal no job', error);
        return { processed: 0, skipped: 0, error: error.message };
    }
}
