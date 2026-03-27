import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { writeFileSync } from 'fs';

async function run() {
    const s = createServiceRoleClient();

    // Pegar todos os pacientes + últimas mensagens enviadas a eles
    const { data: patients } = await s
        .from('patients')
        .select('id, full_name, whatsapp_number, is_test_patient')
        .limit(20);

    // Pegar os scheduled_messages com o número do telefone real
    const { data: msgs } = await s
        .from('scheduled_messages')
        .select('id, send_at, status, patient_whatsapp_number, error_info')
        .eq('status', 'sent')
        .order('send_at', { ascending: false })
        .limit(15);

    // Pegar os registros de messages (histórico de chat) para ver o que foi gravado
    const { data: chatHistory } = await s
        .from('messages')
        .select('id, patient_id, sender, created_at, text')
        .eq('sender', 'system')
        .order('created_at', { ascending: false })
        .limit(10);

    const lines: string[] = ['\n=== DIAGNÓSTICO DE NÚMERO + ENTREGA ===\n'];

    lines.push('--- Pacientes cadastrados ---');
    patients?.forEach(p => {
        lines.push(`  ${p.full_name} | tel: ${p.whatsapp_number} | test: ${p.is_test_patient}`);
    });

    lines.push('\n--- Últimas mensagens enviadas (+ número usado) ---');
    msgs?.forEach(m => {
        const brt = new Date(m.send_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        lines.push(`  ${brt} | para: ${m.patient_whatsapp_number} | ${m.status} | ${m.error_info}`);
    });

    lines.push('\n--- Histórico de mensagens do sistema ---');
    chatHistory?.forEach(m => {
        const brt = new Date(m.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        lines.push(`  ${brt} | patient_id: ${m.patient_id} | "${m.text?.substring(0, 50)}..."`);
    });

    writeFileSync('/tmp/numero-debug.txt', lines.join('\n'), 'utf8');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
