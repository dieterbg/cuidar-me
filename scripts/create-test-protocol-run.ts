
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const protocolId = '65e9d430-4012-9040-65e9d43073a3';
    const phone = 'whatsapp:+5551998770099'; // Usando o número do Dieter para o teste ou um novo se preferir
    const patientName = 'Dieter Teste 10min';

    console.log(`\n🚀 Iniciando Protocolo Teste para ${patientName}`);

    // 1. Garantir que o paciente existe
    let { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('whatsapp_number', phone)
        .single();

    if (!patient) {
        const { data: newPatient, error: pError } = await supabase
            .from('patients')
            .insert({
                full_name: patientName,
                whatsapp_number: phone,
                status: 'active',
                plan: 'premium'
            })
            .select()
            .single();

        if (pError) throw pError;
        patient = newPatient;
        console.log('✅ Novo paciente de teste criado.');
    } else {
        console.log('✅ Paciente de teste encontrado.');
    }

    const patientId = patient!.id;

    // 2. Atribuir o protocolo
    console.log('📋 Atribuindo protocolo...');
    await supabase.from('patient_protocols').delete().eq('patient_id', patientId);
    const { error: ppError } = await supabase
        .from('patient_protocols')
        .insert({
            patient_id: patientId,
            protocol_id: protocolId,
            is_active: true, // Corrigido de status: 'active'
            start_date: new Date().toISOString().split('T')[0],
            current_day: 1
        });

    if (ppError) throw ppError;

    // 3. Gerar 20 mensagens (10 min de intervalo)
    console.log('💬 Gerando 20 mensagens...');
    const titles = [
        'Bem-vindo ao Teste!',
        '[GAMIFICAÇÃO] Check-in Matinal',
        'Dica de Energia',
        '[GAMIFICAÇÃO] Hidratação 1/3',
        'Lembrete de Movimento',
        '[GAMIFICAÇÃO] Almoço Consciente',
        'Curiosidade sobre Saúde',
        '[GAMIFICAÇÃO] Hidratação 2/3',
        'Incentivo da Tarde',
        '[GAMIFICAÇÃO] Registro de Peso',
        'Dica de Lanche',
        '[GAMIFICAÇÃO] Hidratação 3/3',
        'Respiração Guiada',
        '[GAMIFICAÇÃO] Atividade Física',
        'Reflexão do Dia',
        '[GAMIFICAÇÃO] Jantar Leve',
        'Preparação para o Sono',
        'Review da Jornada',
        'Quase lá!',
        'Fim do Teste Intensivo'
    ];

    const contents = [
        'Olá! Este é o primeiro passo do seu protocolo de teste de 10 minutos. Prepare-se!',
        'Como você se sente hoje? Responda de 1 a 10 seu nível de energia.',
        'Sabia que caminhar 5 minutos já ativa sua circulação? Tente agora!',
        'Hora de beber o primeiro copo d\'água! Já bebeu? Responda SIM ou NÃO.',
        'Aproveite para dar uma esticadinha nos braços e pernas.',
        'O que tem no seu prato hoje? Tente descrever brevemente.',
        'Frutas vermelhas são ótimas para o cérebro. Considere incluí-las na dieta!',
        'Segunda meta de hidratação: 1L batido? Responda com a quantidade em ml.',
        'Você está indo muito bem! Mantenha o foco.',
        'Qual seu peso agora? (Apenas para teste, pode inventar um número!)',
        'Uma maçã é o lanche perfeito para esta hora.',
        'Última meta de água do teste! Conseguiu os 2L totais? ✅',
        'Feche os olhos por 1 minuto e respire fundo...',
        'Fez alguma atividade hoje? Se sim, qual e por quanto tempo?',
        'O que você aprendeu sobre si mesmo(a) nestes últimos minutos?',
        'Para o jantar, considere algo leve como uma sopa ou salada. Já jantou?',
        'Desligue as telas em breve. Seu corpo agradece o descanso.',
        'Você completou 18 etapas! Como está a experiência?',
        'A penúltima mensagem! Estamos verificando a estabilidade do fluxo.',
        'CONCLUÍDO! Você finalizou a bateria de 20 mensagens em tempo recorde. 🎉'
    ];

    const now = new Date();
    const messagesToInsert = [];

    for (let i = 0; i < 20; i++) {
        const sendAt = new Date(now.getTime() + (i + 1) * 10 * 60 * 1000);
        const isGamification = titles[i].includes('[GAMIFICAÇÃO]');

        messagesToInsert.push({
            patient_id: patientId,
            patient_whatsapp_number: phone,
            message_content: `${titles[i]}\n\n${contents[i]}`,
            send_at: sendAt.toISOString(),
            source: 'protocol',
            status: 'pending',
            metadata: {
                isGamification,
                protocolDay: 1,
                checkinTitle: isGamification ? titles[i] : null,
                perspective: isGamification ? 'disciplina' : null
            }
        });
    }

    const { error: mError } = await supabase
        .from('scheduled_messages')
        .insert(messagesToInsert);

    if (mError) throw mError;

    console.log(`✅ ${messagesToInsert.length} mensagens agendadas com sucesso!`);
    console.log(`Primeira mensagem em: ${new Date(now.getTime() + 10 * 60 * 1000).toLocaleString()}`);
    console.log(`Última mensagem em: ${new Date(now.getTime() + 200 * 60 * 1000).toLocaleString()}`);
}

run().catch(console.error);
