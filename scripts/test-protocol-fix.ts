import { config } from 'dotenv';
config({ path: '.env.local' });

import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';
import { processMessageQueue } from '../src/ai/handle-patient-reply';
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    console.log("=== INICIANDO AGENDAMENTO DO DIA 1 ===");
    // true = isPulse (agenda as mensagens fast-track ou força agendamento imediato dependendo do script)
    // Wait, scheduleProtocolMessages depends on time > now.
    // If it's fast track, it will schedule them immediately. Is Dieter BG on fast-track protocol?
    const supabase = createServiceRoleClient();
    
    // Set protocol to fast-track if needed, or just update the send_at of the messages.
    // First, let's just create the messages.
    const res = await scheduleProtocolMessages(true);
    console.log("Resultado do agendamento:", res);
    
    console.log("\nAjustando horários das mensagens agendadas para 'agora' (para passarem no queue)...");
    const { error } = await supabase
        .from('scheduled_messages')
        .update({ send_at: new Date().toISOString() })
        .eq('status', 'pending');
        
    if (error) console.error("Erro ao ajustar horários:", error);

    console.log("\n=== PROCESSANDO FILA E DISPAROS ===");
    const queueRes = await processMessageQueue();
    console.log("Resultado do processamento da fila:", queueRes);
    
    console.log("=== FINALIZADO ===");
}

run().catch(console.error);
