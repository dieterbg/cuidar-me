import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();
    // Últimas 24h
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { data } = await s
        .from('scheduled_messages')
        .select('id, send_at, status, source, error_info, message_content, metadata')
        .eq('patient_whatsapp_number', 'whatsapp:+5551998770099')
        .gte('send_at', since)
        .order('send_at', { ascending: true })
        .limit(30);

    const lines: string[] = ['\n=== Últimas 24h de scheduled_messages ===\n'];

    data?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const icon = m.status === 'sent' ? '✅' : m.status === 'failed' ? '❌' : '⏳';
        const meta = m.metadata ? JSON.stringify(m.metadata) : '{}';
        lines.push(`${icon} [${m.status.toUpperCase()}] ${brt}`);
        lines.push(`   id: ${m.id} | source: ${m.source}`);
        lines.push(`   meta: ${meta}`);
        lines.push(`   content: ${m.message_content.substring(0, 100)}`);
        lines.push(`   error_info: ${m.error_info || '-'}`);
        lines.push('');
    });

    const out = lines.join('\n');
    writeFileSync('/tmp/fila.txt', out, 'utf8');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
