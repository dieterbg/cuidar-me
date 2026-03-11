
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnose() {
    const phone = 'whatsapp:+5551998770099'; // Note o 9 extra
    console.log(`\n🔍 Iniciando diagnóstico para: ${phone}`);

    // 1. Verificar Paciente
    const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('*')
        .eq('whatsapp_number', phone);

    if (pError) {
        console.error('❌ Erro ao buscar paciente:', pError.message);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('❌ Paciente não encontrado com este número.');
        return;
    }

    const patient = patients[0];
    console.log('\n✅ Dados do Paciente:');
    console.log(`- Nome: ${patient.full_name}`);
    console.log(`- Plano: ${patient.plan}`);
    console.log(`- Status: ${patient.status}`);
    console.log(`- Preferência de Horário: ${patient.reminder_timing || 'Não definido'}`);

    // 2. Verificar Protocolo Ativo
    const { data: protocols, error: prError } = await supabase
        .from('patient_protocols')
        .select('*, protocols(*)')
        .eq('patient_id', patient.id)
        .eq('status', 'active');

    if (prError) {
        console.error('❌ Erro ao buscar protocolos:', prError.message);
    } else {
        console.log('\n✅ Protocolos Ativos:');
        if (protocols && protocols.length > 0) {
            protocols.forEach(p => {
                console.log(`- Protocolo: ${p.protocols?.name}`);
                console.log(`- Data Início: ${p.start_date}`);
                console.log(`- Status: ${p.status}`);
            });
        } else {
            console.log('- Nenhum protocolo ativo encontrado.');
        }
    }

    // 3. Verificar Mensagens Agendadas
    const { data: messages, error: mError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

    if (mError) {
        console.error('❌ Erro ao buscar mensagens agendadas:', mError.message);
    } else {
        console.log(`\n✅ Mensagens Agendadas (${messages?.length || 0}):`);
        if (messages && messages.length > 0) {
            messages.forEach(m => {
                console.log(`- [${m.send_at}] ${m.message_content.substring(0, 50)}...`);
            });
        } else {
            console.log('- Nenhuma mensagem pendente agendada.');
        }
    }
}

diagnose();
