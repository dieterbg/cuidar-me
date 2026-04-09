import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getCurrentUser } from '@/lib/supabase-server-utils';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * POST /api/onboarding/notify-plan-upgrade
 *
 * Envia mensagem WhatsApp ao paciente quando admin faz upgrade de plano
 * e/ou atribui um protocolo a um paciente já ativo.
 *
 * Body: { patientId: string, newPlan: string, protocolName: string }
 * Requer: usuário staff autenticado
 */
export async function POST(request: NextRequest) {
    try {
        // Auth: apenas staff autenticado pode disparar isso
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { patientId, newPlan, protocolName } = await request.json();

        if (!patientId || !newPlan || !protocolName) {
            return NextResponse.json(
                { success: false, error: 'patientId, newPlan e protocolName são obrigatórios' },
                { status: 400 }
            );
        }

        const supabase = createServiceRoleClient();

        // Buscar dados do paciente
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('full_name, whatsapp_number, status')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ success: false, error: 'Paciente não encontrado' }, { status: 404 });
        }

        if (!patient.whatsapp_number) {
            return NextResponse.json({ success: false, error: 'Paciente sem WhatsApp cadastrado' }, { status: 422 });
        }

        // Montar mensagem de acordo com o plano
        const planEmoji = newPlan === 'vip' ? '⭐' : '💎';
        const planLabel = newPlan === 'vip' ? 'VIP' : 'Premium';
        const firstName = (patient.full_name || '').split(' ')[0];

        const message = [
            `${planEmoji} *Boa notícia, ${firstName}!*`,
            ``,
            `Seu plano foi atualizado para *${planLabel}* e o protocolo *${protocolName}* foi iniciado hoje.`,
            ``,
            `A partir de amanhã cedo você começará a receber seus check-ins diários aqui pelo WhatsApp.`,
            ``,
            `Qualquer dúvida, é só responder esta mensagem. 💪`,
        ].join('\n');

        // Enviar via WhatsApp
        const sent = await sendWhatsappMessage(patient.whatsapp_number, message);

        if (!sent) {
            console.error('[notify-plan-upgrade] Falha ao enviar WhatsApp para', patientId);
            return NextResponse.json({ success: false, error: 'Falha ao enviar WhatsApp' }, { status: 500 });
        }

        // Registrar no histórico de mensagens
        const { addMessage } = await import('@/ai/actions/messages');
        await addMessage(patientId, { sender: 'system', text: message });

        // Marcar onboarding como concluído e atualizar o plano.
        // O admin atribuiu um protocolo explicitamente — o onboarding WhatsApp
        // é considerado superado, independentemente de o paciente ter respondido "Sim".
        const { error: onbErr } = await supabase
            .from('onboarding_states')
            .update({
                plan: newPlan,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('patient_id', patientId)
            .is('completed_at', null); // só atualiza se ainda não estava completo

        if (onbErr) {
            // Não é crítico — loga mas não falha o request
            console.warn('[notify-plan-upgrade] Aviso ao atualizar onboarding_states:', onbErr.message);
        }

        return NextResponse.json({ success: true, message: 'Notificação enviada com sucesso' });
    } catch (error: any) {
        console.error('[notify-plan-upgrade] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erro inesperado' },
            { status: 500 }
        );
    }
}
