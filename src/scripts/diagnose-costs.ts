import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing env vars');
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('=== DIAGNÓSTICO DE CUSTOS TWILIO ===\n');

    // 1. Total na fila de mensagens agendadas
    const { count: totalScheduled } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true });
    console.log(`📬 Total na fila (scheduled_messages): ${totalScheduled}`);

    // 2. Por status
    for (const status of ['pending', 'sent', 'error']) {
        const { count } = await supabase
            .from('scheduled_messages')
            .select('*', { count: 'exact', head: true })
            .eq('status', status);
        console.log(`   - ${status}: ${count}`);
    }

    // 3. Mensagens agendadas por número de destino (top 10)
    console.log('\n📞 Top destinatários na fila (pending):');
    const { data: byPhone } = await supabase
        .from('scheduled_messages')
        .select('patient_whatsapp_number')
        .eq('status', 'pending')
        .limit(200);

    if (byPhone) {
        const counts: Record<string, number> = {};
        byPhone.forEach(m => {
            counts[m.patient_whatsapp_number] = (counts[m.patient_whatsapp_number] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        sorted.forEach(([phone, count]) => {
            console.log(`   ${phone}: ${count} mensagens pendentes`);
        });
    }

    // 4. Pacientes com protocolo ativo
    const { count: activeProtocols } = await supabase
        .from('patient_protocols')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    console.log(`\n🔄 Protocolos ativos: ${activeProtocols}`);

    // 5. Total de pacientes
    const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });
    console.log(`👥 Total de pacientes no banco: ${totalPatients}`);

    // 6. Mensagens enviadas com erro (números inválidos)
    const { data: errorMsgs } = await supabase
        .from('scheduled_messages')
        .select('patient_whatsapp_number, error_info, send_at')
        .eq('status', 'error')
        .limit(5);
    if (errorMsgs && errorMsgs.length > 0) {
        console.log('\n❌ Últimas mensagens com erro:');
        errorMsgs.forEach(m => {
            console.log(`   ${m.patient_whatsapp_number} | ${m.error_info?.substring(0, 80)} | ${m.send_at}`);
        });
    }

    // 7. Mensagens agendadas recentes (últimas 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentScheduled } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', yesterday);
    console.log(`\n🕐 Mensagens agendadas nas últimas 24h: ${recentScheduled}`);
}

diagnose().catch(console.error);
