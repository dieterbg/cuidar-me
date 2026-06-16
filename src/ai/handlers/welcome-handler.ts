'use server';

import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';
import type { Patient } from '@/lib/types';
import { loggers } from '@/lib/logger';

/**
 * Envia mensagem de boas-vindas proativa baseada no plano do paciente
 */
export async function sendWelcomeMessage(
    patient: Patient,
    supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
    try {
        loggers.ai.info('[WelcomeHandler] Sending welcome message', {
            patientId: patient.id,
            plan: patient.plan,
        });

        let message = '';

        // 1. Lógica para FREEMIUM
        if (patient.plan === 'freemium') {
            message = `Olá ${patient.fullName.split(' ')[0]}! 👋 Bem-vindo(a) ao Cuidar.me.

Sou sua assistente de saúde pessoal. 🤖

Estou aqui para te ajudar a ter uma vida mais saudável. Como você está no plano **Gratuito**, você tem acesso a:
✅ Dicas de saúde básicas
✅ Acompanhamento de peso

⚠️ **Dica Importante:** Para eu conseguir te ajudar melhor, preciso que você complete seu perfil no nosso site:
https://clinicadornelles.com.br/portal/profile

Quer conhecer nossos planos Premium com nutricionista e protocolos personalizados? Digite *PLANOS* a qualquer momento.`;
        }

        // 2. Lógica para PREMIUM / VIP
        else {
            // Verificar se já tem protocolo ativo
            const { data: activeProtocol } = await supabase
                .from('patient_protocols')
                .select('*, protocol:protocols(name)')
                .eq('patient_id', patient.id)
                .eq('is_active', true)
                .single();

            if (activeProtocol) {
                message = `Olá ${patient.fullName.split(' ')[0]}! 👋 Que bom ter você aqui no Cuidar.me.

Sou sua assistente de saúde pessoal e vou te acompanhar no seu protocolo **${activeProtocol.protocol.name}**. 🚀

Vou te mandar lembretes, dicas e tarefas diárias para garantir que você alcance seus objetivos.

Para começarmos bem, certifique-se de que seu perfil está completo no site:
https://clinicadornelles.com.br/portal/profile

Vamos juntos nessa jornada! 💪`;
            } else {
                message = `Olá ${patient.fullName.split(' ')[0]}! 👋 Bem-vindo(a) ao Cuidar.me Premium! 🌟

Sou sua assistente de saúde pessoal. Vi que você ainda não escolheu seu protocolo de saúde.

Por favor, acesse o portal para selecionar o melhor programa para você:
https://clinicadornelles.com.br/portal/journey

Assim que você escolher, começaremos nosso acompanhamento diário! 😉`;
            }
        }

        // Enviar mensagem
        await sendWhatsappMessage(patient.whatsappNumber, message);

        // Registrar mensagem no histórico
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: message,
        });

        return { success: true };

    } catch (error: any) {
        loggers.ai.error('[WelcomeHandler] Error sending welcome message', error, {
            patientId: patient.id,
        });
        return { success: false, error: error.message };
    }
}
