
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const protocoloTeste = {
    id: '2412145d-c346-4012-9040-65e9d43073a3',
    name: 'Protocolo Teste (Intensivo)',
    description: 'Protocolo para verificação técnica com intervalos de 5 minutos.',
    duration_days: 20,
    eligible_plans: ['premium', 'vip'],
    is_active: true,
    created_by: null
};

const internalSteps = [
    { day: 1, title: 'Bem-vindo ao Teste!', message: 'Olá! Este é o primeiro passo do seu protocolo de teste de 5 minutos. Prepare-se!' },
    { day: 2, title: '[GAMIFICAÇÃO] Check-in de Energia', message: 'Como você se sente? Responda de 1 a 10 seu nível de energia.', is_gamification: true, perspective: 'disciplina' },
    { day: 3, title: 'Dica de Energia', message: 'Sabia que caminhar 5 minutos já ativa sua circulação? Tente agora!' },
    { day: 4, title: '[GAMIFICAÇÃO] Hidratação 📊', message: 'Hora de beber o primeiro copo d\'água! Já bebeu? Responda SIM ou NÃO.', is_gamification: true, perspective: 'bemEstar' },
    { day: 5, title: 'Lembrete de Movimento', message: 'Aproveite para dar uma esticadinha nos braços e pernas.' },
    { day: 6, title: '[GAMIFICAÇÃO] Almoço Consciente', message: 'O que tem no seu prato hoje? Tente descrever brevemente.', is_gamification: true, perspective: 'alimentacao' },
    { day: 7, title: 'Curiosidade sobre Saúde', message: 'Frutas vermelhas são ótimas para o cérebro. Considere incluí-las na dieta!' },
    { day: 8, title: '[GAMIFICAÇÃO] Hidratação 2/3', message: 'Segunda meta de hidratação: 1L batido? Responda com a quantidade em ml.', is_gamification: true, perspective: 'bemEstar' },
    { day: 9, title: 'Incentivo da Tarde', message: 'Você está indo muito bem! Mantenha o foco.' },
    { day: 10, title: '[GAMIFICAÇÃO] Registro de Peso', message: 'Qual seu peso agora? (Apenas para teste, pode inventar um número!)', is_gamification: true, perspective: 'disciplina' },
    { day: 11, title: 'Dica de Lanche', message: 'Uma maçã é o lanche perfeito para esta hora.' },
    { day: 12, title: '[GAMIFICAÇÃO] Hidratação 3/3', message: 'Última meta de água do teste! Conseguiu os 2L totais? ✅', is_gamification: true, perspective: 'bemEstar' },
    { day: 13, title: 'Respiração Guiada', message: 'Feche os olhos por 1 minuto e respire fundo...' },
    { day: 14, title: '[GAMIFICAÇÃO] Atividade Física', message: 'Fez alguma atividade hoje? Se sim, qual e por quanto tempo?', is_gamification: true, perspective: 'movimento' },
    { day: 15, title: 'Reflexão do Dia', message: 'O que você aprendeu sobre si mesmo(a) nestes últimos minutos?' },
    { day: 16, title: '[GAMIFICAÇÃO] Jantar Leve', message: 'Para o jantar, considere algo leve como uma sopa ou salada. Já jantou?', is_gamification: true, perspective: 'alimentacao' },
    { day: 17, title: 'Preparação para o Sono', message: 'Desligue as telas em breve. Seu corpo agradece o descanso.' },
    { day: 18, title: 'Review da Jornada', message: 'Você completou 18 etapas! Como está a experiência?' },
    { day: 19, title: 'Quase lá!', message: 'A penúltima mensagem! Estamos verificando a estabilidade do fluxo.' },
    { day: 20, title: 'Conclusão do Teste 🎉', message: 'CONCLUÍDO! Você finalizou a bateria de 20 mensagens em tempo recorde.' }
];

async function seed() {
    console.log('🌱 Semeando Protocolo Teste (Intensivo)...');

    // Upsert protocol
    const { error: pError } = await supabase.from('protocols').upsert(protocoloTeste);
    if (pError) {
        console.error('❌ Erro ao inserir protocolo:', pError.message);
        return;
    }

    console.log('✅ Protocolo inserido. Semeando passos...');

    // Delete old steps
    await supabase.from('protocol_steps').delete().eq('protocol_id', protocoloTeste.id);

    // Insert steps
    const steps = internalSteps.map(s => ({
        protocol_id: protocoloTeste.id,
        day: s.day,
        title: s.title,
        message: s.message,
        is_gamification: s.is_gamification || false,
        perspective: s.perspective || null
    }));
    const { error: sError } = await supabase.from('protocol_steps').insert(steps);

    if (sError) {
        console.error('❌ Erro ao inserir passos:', sError.message);
        return;
    }

    console.log('🚀 Semeadura concluída com sucesso!');
}

seed();
