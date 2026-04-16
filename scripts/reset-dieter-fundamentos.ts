/**
 * Reseta o paciente Dieter e reinicia o Protocolo Fundamentos do dia 1.
 *
 * Passos:
 *  1. Cancela todas as mensagens pendentes (status=pending)
 *  2. Reseta patient_protocols: current_day=1, start_date=hoje (BRT), completed_at=null, is_active=true
 *  3. Limpa estado de gamificação ativo no paciente (last_checkin_type, last_checkin_at, needs_attention)
 *  4. Chama scheduleProtocolMessages() → dispara bulk schedule de todos os 90 dias
 *
 * Uso: npx tsx scripts/reset-dieter-fundamentos.ts
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';

const DIETER_ID = '47651920-53c9-49e7-b883-bf28eaf70dd2';
const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('\n🔄 RESET DO DIETER — Protocolo Fundamentos do dia 1\n');

    // 1. Cancelar mensagens pendentes
    const { data: deleted, error: delErr } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('patient_id', DIETER_ID)
        .eq('status', 'pending')
        .select('id');
    if (delErr) throw delErr;
    console.log(`  ✓ 1. Deletadas ${deleted?.length || 0} mensagens pendentes`);

    // 2. Reset patient_protocols — hoje em BRT como start_date (YYYY-MM-DD no fuso BRT)
    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000); // UTC-3
    const todayBRT = nowBRT.toISOString().slice(0, 10);
    const { data: updatedProto, error: protoErr } = await supabase
        .from('patient_protocols')
        .update({
            current_day: 1,
            start_date: todayBRT,
            completed_at: null,
            is_active: true,
            updated_at: new Date().toISOString(),
        })
        .eq('patient_id', DIETER_ID)
        .eq('protocol_id', FUNDAMENTOS_ID)
        .select();
    if (protoErr) throw protoErr;
    console.log(`  ✓ 2. Protocolo resetado (start_date=${todayBRT}, current_day=1):`, updatedProto?.length);

    // 3. Limpar estado de check-in / atenção no paciente
    const { error: patErr } = await supabase
        .from('patients')
        .update({
            last_checkin_type: null,
            last_checkin_at: null,
            needs_attention: false,
        })
        .eq('id', DIETER_ID);
    if (patErr) throw patErr;
    console.log(`  ✓ 3. Estado de check-in do paciente limpo`);

    // 4. Disparar bulk schedule
    console.log(`\n📦 Disparando scheduleProtocolMessages() para agendar 90 dias...\n`);
    const result = await scheduleProtocolMessages(false);
    console.log(`\n📊 Resultado:`, JSON.stringify(result, null, 2));

    // 5. Verificar agendamento
    const { count: pending } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', DIETER_ID)
        .eq('status', 'pending');
    console.log(`\n✅ Mensagens agendadas agora: ${pending}`);

    // Primeira e última para conferência
    const { data: first } = await supabase
        .from('scheduled_messages')
        .select('send_at, message_content, metadata')
        .eq('patient_id', DIETER_ID)
        .eq('status', 'pending')
        .order('send_at', { ascending: true })
        .limit(1);
    const { data: last } = await supabase
        .from('scheduled_messages')
        .select('send_at, metadata')
        .eq('patient_id', DIETER_ID)
        .eq('status', 'pending')
        .order('send_at', { ascending: false })
        .limit(1);
    if (first?.[0]) {
        console.log(`\n  📅 Primeira: ${first[0].send_at} (dia ${(first[0].metadata as any)?.protocolDay})`);
        console.log(`     Preview: ${first[0].message_content?.substring(0, 100)}...`);
    }
    if (last?.[0]) {
        console.log(`  📅 Última:   ${last[0].send_at} (dia ${(last[0].metadata as any)?.protocolDay})`);
    }

    console.log(`\n🎉 Reset completo!`);
}

main().catch(e => {
    console.error('\n❌ ERRO:', e);
    process.exit(1);
});
