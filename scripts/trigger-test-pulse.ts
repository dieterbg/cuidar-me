
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function manualTrigger() {
    const patientId = '936eafb5-64d8-4f81-8cec-beefb0f8e3c8'; // Dieter BG (ID correto pós-limpeza)
    const protocolId = '2412145d-c346-4012-9040-65e9d43073a3'; // Protocolo Teste

    console.log('🔄 Marcando protocolo como ativo no banco...');

    // Desativar protocolos antigos
    await supabase
        .from('patient_protocols')
        .update({ is_active: false })
        .eq('patient_id', patientId);

    // Inserir/Ativar o Protocolo Teste
    await supabase.from('patient_protocols').delete().eq('patient_id', patientId);
    const { error: ppError } = await supabase
        .from('patient_protocols')
        .insert({
            patient_id: patientId,
            protocol_id: protocolId,
            is_active: true,
            start_date: new Date().toISOString().split('T')[0],
            current_day: 1
        });

    if (ppError) {
        console.error('❌ Erro ao ativar protocolo:', ppError.message);
        return;
    }

    console.log('✅ Protocolo Ativado. Disparando PULSE de agendamento...');

    const result = await scheduleProtocolMessages(true);
    console.log('📊 Resultado do Pulse:', result);

    if (result.messagesScheduled > 0) {
        console.log('🚀 Mensagens agendadas com sucesso!');
    } else {
        console.log('⚠️ Nenhuma mensagem agendada. Verifique se o ID do protocolo no código bate com o do bando.');
    }
}

manualTrigger();
