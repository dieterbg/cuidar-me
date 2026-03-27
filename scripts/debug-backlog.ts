import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();

    // Ver TODAS as mensagens do backlog 20-23/03 com detalhes completos de conteúdo
    const { data: msgs } = await s
        .from('scheduled_messages')
        .select('id, send_at, sent_at, status, source, patient_whatsapp_number, content, metadata, error_info')
        .gte('send_at', '2026-03-20T00:00:00Z')
        .lte('send_at', '2026-03-24T23:59:59Z')
        .order('send_at', { ascending: true });

    const lines: string[] = ['\n=== BACKLOG 20-24/03: Detalhes Completos ===\n'];

    msgs?.forEach(m => {
        const sendBrt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const sentBrt = m.sent_at ? new Date(m.sent_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'NÃO ENVIADA';
        const meta = m.metadata as any;
        lines.push(`[${sendBrt}] → enviada: ${sentBrt}`);
        lines.push(`  title: ${meta?.checkinTitle ?? '?'} | perspective: ${meta?.perspective ?? '?'}`);
        lines.push(`  content inicio: ${(m.content as string)?.substring(0, 60)}`);
        lines.push(`  SID: ${m.error_info}`);
        lines.push('');
    });

    // Contar perspectivas únicas no burst
    lines.push('--- Contagem por perspective ---');
    const byPersp: Record<string, number> = {};
    msgs?.forEach(m => {
        const p = (m.metadata as any)?.perspective ?? 'unknown';
        byPersp[p] = (byPersp[p] || 0) + 1;
    });
    Object.entries(byPersp).forEach(([p, c]) => lines.push(`  ${p}: ${c}`));

    writeFileSync('/tmp/backlog-detail.txt', lines.join('\n'), 'utf8');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
