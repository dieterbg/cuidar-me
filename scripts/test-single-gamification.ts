import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { handlePatientReply } from '../src/ai/handle-patient-reply';
import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';

const PHONE = 'whatsapp:+5551998770099';
const PATIENT_ID = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8';

async function testarPorMim() {
    console.log("=== INICIANDO TESTE DO ALUNO ===");
    const supabase = createServiceRoleClient();
    
    // Pegar estado antes
    const { data: patientBefore } = await supabase.from('patients').select('total_points').eq('id', PATIENT_ID).single();
    console.log(`Pontos antes da Gamificação: ${patientBefore?.total_points}`);

    // Injetar uma resposta do usuário na API pra testar gamificação
    console.log(`Simulando Resposta de Gamificação (Planejamento Semanal): "Sim (A)"...`);
    const replyResult = await handlePatientReply(PHONE, "A", "Dieter BG");
    
    // Esperar um pouco pra persistência
    await new Promise(r => setTimeout(r, 2000));
    
    // Pegar estado depois
    const { data: patientAfter } = await supabase.from('patients').select('total_points').eq('id', PATIENT_ID).single();
    console.log(`Pontos depois da Gamificação: ${patientAfter?.total_points}`);
    
    
    console.log("\n=== TESTANDO FILA NATIVA DE AGENDAMENTO ===");
    // Limpar velhos
    await supabase.from('scheduled_messages').delete().eq('patient_id', PATIENT_ID).eq('status', 'pending');
    await supabase.from('patient_protocols').update({ current_day: 2, updated_at: null }).eq('patient_id', PATIENT_ID);
    
    // Agendar!
    await scheduleProtocolMessages(false);
    
    // Mostrar a fila
    const { data: q } = await supabase.from('scheduled_messages').select('send_at, message_content').eq('status', 'pending').order('send_at', { ascending: true });
    
    console.log("\nFila Preenchida Corretamente para o Futuro:");
    q?.forEach(m => console.log(`[${new Date(m.send_at).toLocaleString('pt-BR')}] ${m.message_content.substring(0, 30)}...`));
}

testarPorMim().catch(console.error);
