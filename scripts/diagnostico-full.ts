import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();

    // Todos os scheduled_messages dos últimos 7 dias por status
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: all } = await s
        .from('scheduled_messages')
        .select('id, send_at, status, source, error_info, patient_whatsapp_number, metadata')
        .gte('send_at', since7d)
        .order('send_at', { ascending: true })
        .limit(100);

    // Estado dos patient_protocols
    const { data: protocols } = await s
        .from('patient_protocols')
        .select('id, current_day, started_at, is_active, patient:patients(id, full_name, whatsapp_number)')
        .limit(20);

    const lines: string[] = ['\n=== DIAGNÓSTICO COMPLETO ===\n'];

    lines.push('--- Patient Protocols ---');
    protocols?.forEach(p => {
        const pat = (p as any).patient;
        lines.push(`  ${pat?.full_name} (${pat?.whatsapp_number}) | active: ${p.is_active} | day: ${p.current_day} | started: ${p.started_at?.split('T')[0]}`);
    });

    lines.push('\n--- Scheduled Messages (7 dias, por status) ---');
    const byStatus: Record<string, number> = {};
    all?.forEach(m => {
        byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    });
    Object.entries(byStatus).forEach(([s, c]) => lines.push(`  ${s}: ${c}`));

    lines.push('\n--- Detalhes por dia ---');
    const byDay: Record<string, {sent: number, failed: number, pending: number}> = {};
    all?.forEach(m => {
        const day = new Date(m.send_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        if (!byDay[day]) byDay[day] = {sent:0, failed:0, pending:0};
        if (m.status === 'sent') byDay[day].sent++;
        else if (m.status === 'failed') byDay[day].failed++;
        else byDay[day].pending++;
    });
    Object.entries(byDay).forEach(([day, stats]) => {
        lines.push(`  ${day}: ✅${stats.sent} ❌${stats.failed} ⏳${stats.pending}`);
    });

    lines.push('\n--- Mensagens FAILED ---');
    all?.filter(m => m.status === 'failed').forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        lines.push(`  ${brt} | ${m.error_info}`);
    });

    lines.push('\n--- Mensagens PENDING ainda futuras ---');
    const nowIso = new Date().toISOString();
    all?.filter(m => m.status === 'pending').forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const past = m.send_at < nowIso ? '(PASSADO!)' : '(futuro)';
        lines.push(`  ${brt} ${past} | ${m.error_info || '-'}`);
    });

    const out = lines.join('\n');
    writeFileSync('/tmp/diagnostico.txt', out, 'utf8');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
