
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function manualTrigger() {
    const patientId = '936eafb5-64d8-4cec-beefb0f8e3c8'; // Dieter Teste 10min
    const protocolId = '2412145d-c346-4012-9040-65e9d43073a3'; // Protocolo Teste (Intensivo)

    console.log('🔄 Marcando protocolo como ativo no banco...');

    // Desativar protocolos antigos (apenas atualizar is_active, não deletar para preservar histórico)
    const { error: deactivateError } = await supabase
        .from('patient_protocols')
        .update({ is_active: false })
        .eq('patient_id', patientId);

    if (deactivateError) {
        console.error('❌ Erro ao desativar protocolos antigos:', deactivateError.message);
        // Não retornamos aqui para permitir inserção mesmo se o update falhar
    }

    // Inserir/Ativar o Protocolo Teste (mantendo o delete apenas para garantir compatibilidade se necessário)
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
