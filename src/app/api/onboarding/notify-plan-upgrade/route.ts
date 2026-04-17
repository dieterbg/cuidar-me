import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getCurrentUser } from '@/lib/supabase-server-utils';
import { sendWhatsappMessage } from '@/lib/twilio';
import { scheduleProtocolMessages } from '@/cron/send-protocol-messages';

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

        let { patientId, newPlan, protocolName } = await request.json();
        
        // Evitar "protocolo Protocolo..."
        if (protocolName) {
            protocolName = protocolName.replace(/^Protocolo\s+/i, '').trim();
        }

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

        // Buscar estado de onboarding para ver se precisamos confirmar conclusão
        const { data: onboarding } = await supabase
            .from('onboarding_states')
            .select('completed_at')
            .eq('patient_id', patientId)
            .maybeSingle();

        const isJustCompleting = onboarding && !onboarding.completed_at;

        // Montar mensagem de acordo com o plano
        const planEmoji = newPlan === 'vip' ? '⭐' : '💎';
        const planLabel = newPlan === 'vip' ? 'VIP' : 'Premium';
        const firstName = (patient.full_name || '').split(' ')[0];

        let messageParts = [];

        if (isJustCompleting) {
            messageParts.push(`Pronto! 🌅 Seu cadastro está completo.\n`);
        }

        messageParts.push(`${planEmoji} *Boa notícia, ${firstName}!*`);
        messageParts.push(``);
        messageParts.push(`Seu plano foi atualizado para *${planLabel}* e o protocolo *${protocolName}* foi iniciado hoje.`);
        messageParts.push(``);
        messageParts.push(`A partir de amanhã cedo você começará a receber seus check-ins diários aqui pelo WhatsApp.`);
        messageParts.push(``);
        messageParts.push(`Qualquer dúvida, é só responder esta mensagem. 💪`);

        const message = messageParts.join('\n');

        // Usar template aprovado se disponível — necessário fora da janela de 24h
        // TWILIO_PLAN_UPGRADE_SID: template dedicado (vars: {{1}}=nome, {{2}}=plano, {{3}}=protocolo)
        // Fallback principal (UTILITY): TWILIO_PROTOCOLO_REGISTRO_SID (vars: dia, total, protocolo, nome, conteúdo)
        // Fallback legado (MARKETING, deprecated): TWILIO_PROTOCOL_INCENTIVO_SID
        const upgradeSid = process.env.TWILIO_PLAN_UPGRADE_SID?.trim();
        const registroSid = process.env.TWILIO_PROTOCOLO_REGISTRO_SID?.trim();
        const legacySid = process.env.TWILIO_PROTOCOL_INCENTIVO_SID?.trim();
        const contentSid = upgradeSid || registroSid || legacySid;

        let contentVariables: Record<string, string> | undefined;
        if (upgradeSid) {
            contentVariables = { "1": firstName, "2": `${planEmoji} ${planLabel}`, "3": protocolName };
        } else if (registroSid) {
            // TWILIO_PROTOCOLO_REGISTRO_SID — UTILITY (vars: dia, durationDays, protocolo, nome, conteúdo)
            contentVariables = { "1": "1", "2": "90", "3": protocolName, "4": firstName, "5": message };
        } else if (legacySid) {
            contentVariables = { "1": firstName, "2": message };
        }

        // Enviar via WhatsApp
        const sent = await sendWhatsappMessage(patient.whatsapp_number, message, {
            contentSid,
            contentVariables,
        });

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

        // AGENDAMENTO AUTOMÁTICO: dispara o scheduler imediatamente para que as mensagens
        // apareçam no painel sem precisar de F5 ou esperar o cron de 5min.
        try {
            await scheduleProtocolMessages();
        } catch (schedErr) {
            console.error('[notify-plan-upgrade] Falha ao disparar agendamento automático:', schedErr);
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
