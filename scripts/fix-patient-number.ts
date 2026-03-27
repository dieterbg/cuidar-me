import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

const NEW_NUMBER = 'whatsapp:+5551998770099';
const OLD_NUMBER = 'whatsapp:+29232221420180838';

async function run() {
    const s = createServiceRoleClient();

    // 1. Atualizar número do paciente
    const { data: patient, error: pErr } = await s
        .from('patients')
        .update({ whatsapp_number: NEW_NUMBER })
        .eq('whatsapp_number', OLD_NUMBER)
        .select('id, full_name, whatsapp_number')
        .single();

    if (pErr) {
        console.error('Erro ao atualizar paciente:', pErr.message);
        process.exit(1);
    }
    console.log(`✅ Paciente atualizado: ${patient.full_name} → ${patient.whatsapp_number}`);

    // 2. Atualizar número nas mensagens pending
    const { data: updated, error: mErr } = await s
        .from('scheduled_messages')
        .update({ patient_whatsapp_number: NEW_NUMBER })
        .eq('patient_whatsapp_number', OLD_NUMBER)
        .eq('status', 'pending')
        .select('id, send_at');

    if (mErr) {
        console.error('Erro ao atualizar mensagens:', mErr.message);
        process.exit(1);
    }
    console.log(`✅ ${updated?.length ?? 0} mensagens pending atualizadas com o novo número`);

    // 3. Listar mensagens atrasadas que agora podem ser enviadas
    const now = new Date().toISOString();
    const { data: overdue } = await s
        .from('scheduled_messages')
        .select('id, send_at, message_content')
        .eq('patient_whatsapp_number', NEW_NUMBER)
        .eq('status', 'pending')
        .lte('send_at', now)
        .order('send_at', { ascending: true });

    console.log(`\n📬 ${overdue?.length ?? 0} mensagens ATRASADAS prontas para envio:`);
    overdue?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`  • ${brt} | ${m.message_content.substring(0, 60)}...`);
    });

    // 4. Marcar mensagens muito atrasadas (>3 dias) como cancelled para não spammar
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { data: cancelled } = await s
        .from('scheduled_messages')
        .update({ status: 'cancelled', error_info: 'Número inválido no cadastro - cancelado após correção' })
        .eq('patient_whatsapp_number', NEW_NUMBER)
        .eq('status', 'pending')
        .lt('send_at', threeDaysAgo)
        .select('id');

    if (cancelled && cancelled.length > 0) {
        console.log(`\n⚠️  ${cancelled.length} mensagens com mais de 3 dias → canceladas (não vamos spammar o paciente)`);
    }

    // 5. Confirmar pendentes restantes (mensagens recentes a enviar)
    const { data: remaining } = await s
        .from('scheduled_messages')
        .select('id, send_at')
        .eq('patient_whatsapp_number', NEW_NUMBER)
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    console.log(`\n🚀 ${remaining?.length ?? 0} mensagens serão enviadas no próximo ciclo do cron`);
    remaining?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`  → ${brt}`);
    });

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
