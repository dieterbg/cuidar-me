import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import * as fs from 'fs';

async function run() {
    const s = createServiceRoleClient();
    const lines: string[] = [];

    // 1. Todos os pacientes reais
    const { data: patients } = await s
        .from('patients')
        .select('id, full_name, whatsapp_number, plan, is_active')
        .order('full_name');

    lines.push('=== PACIENTES CADASTRADOS ===');
    patients?.forEach((p: any) => {
        lines.push(`• [${p.is_active ? 'ATIVO' : 'INATIVO'}] ${p.full_name} | ${p.whatsapp_number} | ${p.plan}`);
    });

    // 2. Protocolos ativos
    const { data: protos } = await s
        .from('patient_protocols')
        .select('current_day, is_active, updated_at, patient:patients(full_name, whatsapp_number), protocol:protocols(name, duration_days)')
        .eq('is_active', true)
        .is('completed_at', null);

    lines.push('\n=== PROTOCOLOS ATIVOS ===');
    protos?.forEach((p: any) => {
        lines.push(`• ${p.patient?.full_name} (${p.patient?.whatsapp_number}) → ${p.protocol?.name}: dia ${p.current_day}/${p.protocol?.duration_days}`);
    });

    // 3. Mensagens pending
    const { data: pending } = await s
        .from('scheduled_messages')
        .select('id, patient_whatsapp_number, status, send_at, patient:patients(full_name)')
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    lines.push('\n=== MENSAGENS PENDING ===');
    if (!pending || pending.length === 0) {
        lines.push('(nenhuma)');
    } else {
        const now = new Date();
        pending.forEach((m: any) => {
            const sendAt = new Date(m.send_at);
            const brt = sendAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const marker = sendAt < now ? '⚠️ ATRASADA' : '🔜 FUTURA  ';
            lines.push(`${marker} | ${brt} | ${m.patient?.full_name} | ${m.patient_whatsapp_number}`);
        });
    }

    // 4. Últimas mensagens sent/failed das últimas 48h
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: recent } = await s
        .from('scheduled_messages')
        .select('patient_whatsapp_number, status, send_at, error_log, patient:patients(full_name)')
        .in('status', ['sent', 'failed'])
        .gte('send_at', twoDaysAgo)
        .order('send_at', { ascending: false })
        .limit(10);

    lines.push('\n=== RECENTES sent/failed (48h) ===');
    if (!recent || recent.length === 0) {
        lines.push('(nenhuma)');
    } else {
        recent.forEach((m: any) => {
            const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            lines.push(`[${m.status.toUpperCase()}] ${brt} | ${m.patient?.full_name} | erro: ${m.error_log || 'N/A'}`);
        });
    }

    const report = lines.join('\n');
    fs.writeFileSync('scripts/audit-report.txt', report, 'utf8');
    console.log('Relatório salvo em scripts/audit-report.txt');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
