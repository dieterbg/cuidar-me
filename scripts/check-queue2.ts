import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import * as fs from 'fs';

async function run() {
    const s = createServiceRoleClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const twoDaysAhead = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

    // 1. Fila de mensagens agendadas
    const { data: queue, error: qError } = await s
        .from('scheduled_messages')
        .select('id, patient_whatsapp_number, status, send_at, patient:patients(full_name, plan)')
        .gte('send_at', oneDayAgo)
        .lte('send_at', twoDaysAhead)
        .order('send_at', { ascending: true });

    if (qError) throw new Error(`Queue error: ${qError.message}`);

    // 2. Protocolos ativos
    const { data: protocols, error: pError } = await s
        .from('patient_protocols')
        .select('current_day, is_active, updated_at, patient:patients(full_name, plan), protocol:protocols(name, duration_days)')
        .eq('is_active', true)
        .is('completed_at', null);

    if (pError) throw new Error(`Protocol error: ${pError.message}`);

    const lines: string[] = [];
    lines.push(`=== RELATÓRIO ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ===\n`);

    lines.push('--- PROTOCOLOS ATIVOS ---');
    if (!protocols || protocols.length === 0) {
        lines.push('Nenhum protocolo ativo.');
    } else {
        protocols.forEach((p: any) => {
            lines.push(`• ${p.patient?.full_name} (${p.patient?.plan}) → ${p.protocol?.name}: dia ${p.current_day}/${p.protocol?.duration_days} | updated_at: ${p.updated_at}`);
        });
    }

    lines.push('\n--- MENSAGENS AGENDADAS ---');
    if (!queue || queue.length === 0) {
        lines.push('Nenhuma mensagem na fila.');
    } else {
        queue.forEach((m: any) => {
            const sendAt = new Date(m.send_at);
            const marker = sendAt < now ? '[PASSADO]' : '[FUTURO] ';
            const sendAtBRT = sendAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            lines.push(`${marker} ${sendAtBRT} | ${m.status} | ${m.patient?.full_name} (${m.patient?.plan}) | ${m.patient_whatsapp_number}`);
        });
        const counts: Record<string, number> = {};
        queue.forEach((m: any) => { counts[m.status] = (counts[m.status] || 0) + 1; });
        lines.push('\nRESUMO:');
        Object.entries(counts).forEach(([s, c]) => lines.push(`  ${s}: ${c}`));
    }

    const report = lines.join('\n');
    fs.writeFileSync('scripts/queue-report.txt', report, 'utf8');
    console.log(report);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
