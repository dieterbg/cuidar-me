import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();
    const umaHoraAtras = new Date(Date.now() - 3600 * 1000).toISOString();

    const { data } = await s
        .from('scheduled_messages')
        .select('send_at, message_content, status')
        .eq('patient_whatsapp_number', 'whatsapp:+5551998770099')
        .in('status', ['pending', 'sent'])
        .gte('send_at', umaHoraAtras)
        .order('send_at', { ascending: true })
        .limit(20);

    const lines: string[] = ['\nPróximas mensagens agendadas:\n'];

    data?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const icon = m.status === 'sent' ? '✅' : '⏳';
        lines.push(`${icon} ${brt}  [${m.status.toUpperCase()}]`);
        lines.push(`   ${m.message_content.substring(0, 120)}`);
        lines.push('');
    });

    const out = lines.join('\n');
    writeFileSync('/tmp/proximas.txt', out, 'utf8');
    console.log(out);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
