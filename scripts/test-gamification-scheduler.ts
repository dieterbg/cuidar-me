import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { handlePatientReply, processMessageQueue } from '../src/ai/handle-patient-reply';
import { scheduleProtocolMessages } from '../src/cron/send-protocol-messages';

const PHONE = 'whatsapp:+5551998770099';
const PATIENT_ID = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; 

async function run() {
    const supabase = createServiceRoleClient();
    const { data: patient } = await supabase.from('patients').select('whatsapp_number, full_name, level, total_points').eq('id', PATIENT_ID).single();
    
    if (!patient) return console.log("Paciente não encontrado");

    console.log(`\n=== 🎮 TESTE 1: INTERPRETAÇÃO DE GAMIFICAÇÃO ===`);
    console.log(`Status de Gamificação PRÉ: Level ${patient.level} | Pontos: ${patient.total_points}`);
    
    // Injetamos a mensagem "Planejamento Semanal (Semana 1)" como último contato do sistema para a IA achar o contexto
    await supabase.from('messages').insert({
        patient_id: PATIENT_ID,
        sender: 'system',
        text: "[GAMIFICAÇÃO] Planejamento Semanal (Semana 1)\n\nVamos começar a semana! Responda A) Sim ou B) Não",
        metadata: { isGamification: true, checkinTitle: "Planejamento Semanal (Semana 1)" }
    });

    // Simulando o webhook do usuário respondendo "A"
    console.log(`\n--- Usuário ${patient.full_name} envia: "A" ---`);
    const replyResult = await handlePatientReply(PHONE, "A", patient.full_name);
    console.log(`Resultado do AI Engine:`, replyResult.success ? 'PROCESSADO COM SUCESSO' : 'ERRO');

    const { data: updatedPatient } = await supabase.from('patients').select('level, total_points').eq('id', PATIENT_ID).single();
    console.log(`\nStatus de Gamificação PÓS: Level ${updatedPatient?.level} | Pontos: ${updatedPatient?.total_points}`);
    console.log(`Diferença da recompensa por Checkin: +${(updatedPatient?.total_points || 0) - (patient.total_points || 0)} Pontos Confirmados!`);


    console.log(`\n=== 🕒 TESTE 2: DISPARO AGENDADO (NATURAL) ===`);
    // Rodamos o script de Agendamento oficial
    console.log("\nRodando rotina do Cron de Agendamento (como acontece diariamente as 06:00)...");
    
    // Deleta agendamentos mortos e zera updated_at para ele forçar leitura do dia 2
    await supabase.from('scheduled_messages').delete().eq('patient_id', PATIENT_ID).eq('status', 'pending');
    await supabase.from('patient_protocols').update({ current_day: 2, updated_at: null }).eq('patient_id', PATIENT_ID);
    
    await scheduleProtocolMessages(false);

    // Mostramos como ficaram as mensagens na fila
    const { data: scheduledMsgs } = await supabase.from('scheduled_messages')
        .select('send_at, message_content')
        .eq('patient_id', PATIENT_ID)
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    console.log(`\n📋 FILA DE AGENDAMENTOS (Cron Scheduler funcionou e não enviou na hora. Estão 'Pending' aguardando seu horário!):`);
    scheduledMsgs?.forEach(m => {
        const timeObj = new Date(m.send_at);
        console.log(`- ⏰ Agendada para: ${timeObj.toLocaleDateString('pt-BR')} ${timeObj.getHours()}:${String(timeObj.getMinutes()).padStart(2, '0')} | ${m.message_content.slice(0, 45).replace('\n', ' ')}...`);
    });
}

run().catch(console.error);
