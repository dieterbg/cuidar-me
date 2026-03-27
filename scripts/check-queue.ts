import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const s = createServiceRoleClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const twoDaysAhead = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

    const { data, error } = await s
        .from('scheduled_messages')
        .select(`
            id, 
            patient_whatsapp_number, 
            status, 
            send_at, 
            metadata,
            patient:patients(full_name, plan)
        `)
        .gte('send_at', oneDayAgo)
        .lte('send_at', twoDaysAhead)
        .order('send_at', { ascending: true });

    if (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }

    console.log(`\n=== FILA (últimas 24h + próximas 48h) ===`);
    console.log(`Hora atual BRT: ${now.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}\n`);

    if (!data || data.length === 0) {
        console.log('Nenhuma mensagem encontrada no período.');
        process.exit(0);
    }

    data.forEach(m => {
        const name = (m.patient as any)?.full_name || 'Desconhecido';
        const plan = (m.patient as any)?.plan || '?';
        const sendAt = new Date(m.send_at);
        const isPast = sendAt < now;
        const marker = isPast ? '⬅️ PASSADO' : '➡️ FUTURO ';
        const sendAtBRT = sendAt.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
        console.log(`${marker} | ${sendAtBRT} | ${m.status.padEnd(10)} | ${name} (${plan}) | template: ${m.twilio_content_sid || 'N/A'}`);
    });

    const byStatus: Record<string, number> = {};
    data.forEach(m => {
        byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    });

    console.log('\n--- RESUMO ---');
    Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });

    process.exit(0);
}

run();
