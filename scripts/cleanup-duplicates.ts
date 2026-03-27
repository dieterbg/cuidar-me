import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

const PATIENT_NUMBER = 'whatsapp:+5551998770099';

async function run() {
    const s = createServiceRoleClient();

    // 1. Ver todas as mensagens pending restantes
    const { data: pending } = await s
        .from('scheduled_messages')
        .select('id, send_at, message_content, status')
        .eq('patient_whatsapp_number', PATIENT_NUMBER)
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    console.log(`\n📬 ${pending?.length ?? 0} mensagens pending restantes:`);
    pending?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`  [${m.id.substring(0, 8)}] ${brt} | ${m.message_content.substring(0, 80)}`);
    });

    // 2. Cancelar TODAS que estão atrasadas (send_at < agora) — já foram ou seriam spam
    const now = new Date().toISOString();
    const { data: cancelled, error } = await s
        .from('scheduled_messages')
        .update({ status: 'cancelled', error_info: 'Cancelado: backlog de número inválido — evitar spam' })
        .eq('patient_whatsapp_number', PATIENT_NUMBER)
        .eq('status', 'pending')
        .lt('send_at', now)
        .select('id');

    if (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }

    console.log(`\n✅ ${cancelled?.length ?? 0} mensagens atrasadas canceladas (eram spam)`);

    // 3. Ver o que ficou (mensagens futuras legítimas)
    const { data: future } = await s
        .from('scheduled_messages')
        .select('id, send_at, message_content')
        .eq('patient_whatsapp_number', PATIENT_NUMBER)
        .eq('status', 'pending')
        .gt('send_at', now)
        .order('send_at', { ascending: true })
        .limit(5);

    console.log(`\n🚀 ${future?.length ?? 0} mensagens futuras legítimas ainda agendadas:`);
    future?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`  → ${brt} | ${m.message_content.substring(0, 60)}`);
    });

    // 4. Stats finais
    const { count: sentCount } = await s
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('patient_whatsapp_number', PATIENT_NUMBER)
        .eq('status', 'sent');

    const { count: cancelCount } = await s
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('patient_whatsapp_number', PATIENT_NUMBER)
        .eq('status', 'cancelled');

    console.log(`\n📊 Total: ${sentCount} enviadas | ${cancelCount} canceladas`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
