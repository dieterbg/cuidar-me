import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();

    // Ver o conteúdo exato das scheduled_messages com send_at entre 20/03 e agora
    const since = '2026-03-20T00:00:00.000Z';
    const { data: msgs, error: msgErr } = await s
        .from('scheduled_messages')
        .select('id, send_at, sent_at, status, patient_id, patient_whatsapp_number, source, metadata->checkinTitle, error_info')
        .gte('send_at', since)
        .order('send_at', { ascending: true })
        .limit(50);

    // Ver o patient_id correspondente
    const patientId = msgs?.[0]?.patient_id;
    let patient = null;
    if (patientId) {
        const { data } = await s.from('patients').select('*').eq('id', patientId).single();
        patient = data;
    }

    const lines: string[] = ['\n=== CRONOLOGIA DETALHADA ===\n'];

    lines.push(`Paciente encontrado: ${patient ? JSON.stringify(patient) : '(não encontrado)'}`);
    lines.push('');

    lines.push('--- scheduled_messages desde 20/03 ---');
    msgs?.forEach(m => {
        const sendBrt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const sentBrt = m.sent_at ? new Date(m.sent_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';
        lines.push(`  send: ${sendBrt} | sent: ${sentBrt} | status: ${m.status} | tel: ${m.patient_whatsapp_number}`);
        lines.push(`    SID/error: ${m.error_info}`);
    });

    // Agora ver mensagens que o paciente enviou de VOLTA (replies)
    lines.push('\n--- Replies do paciente (mensagens recebidas) ---');
    if (patientId) {
        const { data: replies } = await s
            .from('messages')
            .select('id, created_at, sender, text')
            .eq('patient_id', patientId)
            .in('sender', ['patient', 'user'])
            .order('created_at', { ascending: false })
            .limit(10);
        replies?.forEach(r => {
            const brt = new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            lines.push(`  ${brt} | "${r.text?.substring(0, 60)}"`);
        });
    }

    if (msgErr) lines.push(`ERROR: ${JSON.stringify(msgErr)}`);

    writeFileSync('/tmp/cronologia.txt', lines.join('\n'), 'utf8');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
