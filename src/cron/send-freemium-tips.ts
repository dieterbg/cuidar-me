/**
 * Cron Job: Enviar Dicas Diárias para Pacientes Freemium
 * Objetivo: Manter engajamento e gerar valor sem custo de conversa IA
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { sendWhatsappMessage } from '@/lib/twilio';
import { loggers } from '@/lib/logger';
import { batchProcess } from '@/lib/error-handler';
import { toZonedTime } from 'date-fns-tz';
import { getHours } from 'date-fns';

// Biblioteca de dicas genéricas (Exemplo)
const FREEMIUM_TIPS = [
    "💧 Dica do Cuidar: Sabia que beber água em jejum ajuda a despertar o metabolismo? Que tal começar com um copo agora? 🌅",
    "🥗 Dica do Cuidar: Tente incluir uma cor nova no seu prato hoje. Variedade de cores significa variedade de nutrientes! 🥕🥦",
    "🚶 Dica do Cuidar: 10 minutos de caminhada após as refeições podem melhorar significativamente sua digestão. Vamos tentar? 💪",
    "🧠 Dica do Cuidar: Tire 2 minutos para respirar fundo agora. O controle da respiração é o primeiro passo para o controle do peso. ✨",
    "🍎 Dica do Cuidar: Prefira a fruta inteira ao suco. As fibras ajudam a manter a saciedade por mais tempo! 🍎",
    "😴 Dica do Cuidar: Uma boa noite de sono é essencial para regular os hormônios da fome. Tente dormir 15min mais cedo hoje! 💤",
    "🧂 Dica do Cuidar: Menos sal, mais sabor! Experimente usar ervas naturais (alecrim, orégano, manjericão) para temperar. 🌿"
];

export async function sendFreemiumTips() {
    const supabase = createServiceRoleClient();
    const logger = loggers.cron;

    // 1. Verificar horário (Apenas às 8h)
    const brazilTime = toZonedTime(new Date(), 'America/Sao_Paulo');
    const currentHour = getHours(brazilTime);

    if (currentHour !== 8) {
        logger.info(`[FreemiumTips] Fora do horário de envio (8h). Hora atual: ${currentHour}h`);
        return { processed: 0, error: null };
    }

    try {
        // 2. Buscar pacientes Freemium ativos
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, full_name, whatsapp_number')
            .eq('status', 'active')
            .eq('plan', 'freemium');

        if (error) throw error;

        if (!patients || patients.length === 0) {
            logger.info('[FreemiumTips] Nenhum paciente freemium ativo encontrado.');
            return { processed: 0, error: null };
        }

        logger.info(`[FreemiumTips] Iniciando envio para ${patients.length} pacientes.`);

        // 3. Escolher dica baseada no dia do mês (para variar)
        const dayOfMonth = new Date().getDate();
        const tipIndex = dayOfMonth % FREEMIUM_TIPS.length;
        const baseTip = FREEMIUM_TIPS[tipIndex];

        // 4. Processar envios
        const results = await batchProcess(patients, async (patient: any) => {
            if (!patient.whatsapp_number) return { success: false };

            const firstName = patient.full_name.split(' ')[0];
            const personalizedTip = `Bom dia, ${firstName}! ${baseTip}\n\n💡 _Quer suporte 24h e check-in diário? Conheça o Plano Premium!_`;

            const sent = await sendWhatsappMessage(patient.whatsapp_number, personalizedTip);

            if (sent) {
                // Registrar no histórico
                await supabase.from('messages').insert({
                    patient_id: patient.id,
                    sender: 'system',
                    text: personalizedTip,
                    metadata: { type: 'freemium_tip', tip_index: tipIndex }
                });
                return { success: true };
            }
            return { success: false };
        }, { batchSize: 5, continueOnError: true });

        const processed = results.filter(r => !(r instanceof Error) && r.success).length;
        logger.info(`[FreemiumTips] Finalizado. Enviados: ${processed}`);

        return { processed, error: null };

    } catch (error: any) {
        logger.error('[FreemiumTips] Erro fatal', error);
        return { processed: 0, error: error.message };
    }
}
