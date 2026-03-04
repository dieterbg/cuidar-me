import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const protocolName = 'Fundamentos (Iniciante)';
const protocolDescription = 'Protocolo de 90 Dias focado em construir a base: hidratação, sono e introdução ao movimento. Sem radicalismos.';

const generate90Days = () => {
    const days: any[] = [];

    const addDay = (day: number, title: string, message: string, isGamification = false, perspective: string | null = null) => {
        days.push({ day, title, message, is_gamification: isGamification, perspective });
    };

    // WEEKS 1 to 3 (Handcrafted for maximum engagement)
    addDay(1, "O Quebrar do Gelo", "Bom dia! 🌟 Hoje é o seu primeiro passo oficial no protocolo Fundamentos. Meu único pedido hoje: tente beber pelo menos 3 garrafinhas de água. Topa esse desafio comigo?");
    addDay(2, "A Primeira Semente", "Oi! Passando só para saber como você está hoje. 🌻 Muitas vezes, adicionar uma coisa boa é mais fácil do que cortar uma ruim. Que tal tentar comer uma frutazinha hoje à tarde?");
    addDay(3, "Acolhendo as Dificuldades", "O cansaço do dia bate na porta, não é? Respire fundo. Tudo bem se ontem não foi perfeito. O que acha de escolhermos o jantar hoje para ser a sua 'refeição de ouro'? Só o jantar.");
    addDay(4, "Check-in de Hidratação", "[GAMIFICAÇÃO] 💧 Check-in de Hidratação!\nComo está a sua garrafinha hoje?\nA) Já sequei e enchi de novo!\nB) Bebi um pouco, mas esqueci na correria.\nC) Hoje eu confesso que não bebi quase nada.", true, "hidratacao");
    addDay(5, "Sextou com Sabedoria", "Sextou! 🎉 A regra do Fundamentos para o fim de semana é: Não existe perfeição. Escolha uma refeição livre para você curtir sem culpa. Só prometa que amanhã você acorda e toma um belo copo de água.");
    addDay(6, "O Movimento Leve", "Bom sábado! ☀️ Hoje não quero falar de academia. Que tal 'caminhar 15 minutos ouvindo uma música' ou 'passear com o cachorro'? Não precisa de roupa de treino. Vai como estiver!");
    addDay(7, "Pesagem Inicial", "[GAMIFICAÇÃO] ⚖️ Chegou o momento da pesagem! \nPor favor, digite aqui o seu peso atual (em kg, como 85.5). O peso de hoje é só o nosso ponto de partida no mapa! 🗺️", true, null);

    addDay(8, "Botão de Reiniciar", "Boa segunda! 🌅 Independente do que aconteceu no final de semana, a segunda-feira é o nosso 'Botão de Reiniciar'. Qual é a sua meta principal hoje: Água ou Dormir Melhor?");
    addDay(9, "Check-in do Almoço", "[GAMIFICAÇÃO] 🍽️ Check-in do Almoço!\nComo foi seu prato hoje?\nA) Parecia de restaurante saudável!\nB) Tentei fazer o melhor que dava.\nC) Foquei no prazer, hoje não deu pra ser perfeito.", true, "alimentacao");
    addDay(10, "Atenção ao Sono", "Sabe o que boicota seu esforço? O sono. 😴 Quando a gente dorme mal, o corpo acorda gritando por açúcar. O quão cansada você acordou hoje?");
    addDay(11, "A Regra do Mais Um", "Hoje o desafio é o 'Só Mais Uma Vez'. Se bebe um copo d'água, beba dois. Se dá 10 passos, dê 11. O que é o seu 'Mais Um' gigante de hoje?");
    addDay(12, "Ansiedade de Sexta", "Sexta chegou... 🍕 Em qual refeição do fds você acha que tem mais dificuldade e sente que 'joga tudo pro alto'? Saber de onde vem a tempestade ajuda a abrir o guarda-chuva.");
    addDay(13, "Foco Positivo", "Você está quase completando 14 dias! 🥇 Já parou para olhar a quantidade de vitórias invisíveis que você teve? Bebeu água num dia que não beberia... o que você fez de melhor essa semana?");
    addDay(14, "Pesagem da Quinzena", "[GAMIFICAÇÃO] ⚖️ Dia do nosso acompanhamento! Por favor, digite seu peso de jejum hoje (em kg). Vamos registrar como o seu corpo se comportou nessa quinzena! 💪", true, null);

    addDay(15, "A Nova Semana", "Bom dia! Terceira semana! Você já passou da fase de abandono onde a maioria desiste. Parabéns por continuar aqui comigo. 🌻");
    addDay(16, "A Regra das Telas", "Tente um teste hoje: desligue as telas do celular e TV uns 30 minutos antes de fechar os olhos. A luz azul engana o cérebro achando que é dia. Topa testar hoje?");
    addDay(17, "Check-in de Bem-Estar", "[GAMIFICAÇÃO] 🧠 Check-in da Mente!\nComo você está se sentindo hoje?\nA) Calma e no controle.\nB) Um pouco cansada e ansiosa, mas lidando.\nC) Pilote automático total, muito estresse.", true, "bemEstar");
    addDay(18, "O Poder do Chá", "Dica de ouro de hoje: Que tal trocar o café do final da tarde por um chá calmante? Camomila, Mulungu... Vai ajudar demais a preparar o corpo para a noite.");
    addDay(19, "O Guia da Sexta", "Voltamos à sexta! Lembre-se, 1 refeição livre não estraga a semana se a sua base estiver forte. Beba água antes de comer o que você mais tem vontade.");
    addDay(20, "Alonga e Solta", "Sábado! Se espreguice bem forte hoje. O alongamento solta a tensão acumulada nos músculos. Como está se sentindo hoje?");
    addDay(21, "Pesagem Semanal 3", "[GAMIFICAÇÃO] ⚖️ Domingo de pesagem! Como foi a descida da balança essa semana?", true, null);

    // AUTO-GENERATE REST (Day 22 to 90)
    let currentWeek = 4;
    for (let day = 22; day <= 90; day++) {
        const dayOfWeek = day % 7;
        currentWeek = Math.ceil(day / 7);

        if (dayOfWeek === 1) { // Monday
            addDay(day, `Segunda do Reset (Semana ${currentWeek})`, `Boa segunda! Nova semana, novas chances. Como foi o final de semana? Lembre-se: não há espaço para culpa aqui, apenas para recomeços.`);
        } else if (dayOfWeek === 2) { // Tuesday (Gamification)
            if (currentWeek % 2 === 0) {
                addDay(day, "Check-in de Hidratação", `[GAMIFICAÇÃO] 💧 Check-in de Terça!\nAs garrafinhas estão cheias?\nA) Totalmente na meta!\nB) Mais ou menos, tentando.\nC) Preciso focar agora.`, true, "hidratacao");
            } else {
                addDay(day, "Check-in da Mente", `[GAMIFICAÇÃO] 🧠 Check-in de Terça!\nComo anda o estresse hoje?\nA) Super leve.\nB) Correria média.\nC) Exaustão batendo.`, true, "bemEstar");
            }
        } else if (dayOfWeek === 3) { // Wednesday
            addDay(day, "Metade da Semana", `Metade da semana ${currentWeek}! Faça algumas pausas de 5 minutos hoje só para respirar fundo. A constância é mais importante que a velocidade.`);
        } else if (dayOfWeek === 4) { // Thursday (Gamification)
            addDay(day, "Check-in do Progresso", `[GAMIFICAÇÃO] 🍽️ Quinta do foco!\nComo está sendo a sua melhor refeição de hoje?\nA) Bem colorida e nutritiva!\nB) Segurando as pontas como dá.\nC) Dia muito difícil hoje.`, true, "alimentacao");
        } else if (dayOfWeek === 5) { // Friday
            addDay(day, "Blindagem de Sexta", `Sextou! Qual será a sua recompensa agradável desse final de semana? Aproveite com intenção, saboreando cada pedacinho!`);
        } else if (dayOfWeek === 6) { // Saturday
            addDay(day, "Sábado Vivo", `Sábado de descanso! Seu corpo adora movimento. Um passeio leve, alongar o corpo... O que você escolhe fazer por você hoje?`);
        } else if (dayOfWeek === 0) { // Sunday
            addDay(day, `Pesagem Semana ${currentWeek}`, `[GAMIFICAÇÃO] ⚖️ Domingo de check-in! Digite o seu peso hoje para registrarmos a sua evolução da semana ${currentWeek}!`, true, null);
        }
    }

    // OVERRIDE LAST DAYS (87-90)
    days[86].title = "Reta Final";
    days[86].message = "Estamos chegando na reta final dos 90 dias do Fundamentos. Já parou para olhar no espelho não só o corpo, mas a sua disposição?";

    days[87].title = "O Próximo Passo";
    days[87].message = "O seu próximo protocolo 'Evolução' está quase liberado para você. Lá as coisas ficam um pouquinho mais técnicas, mas você já criou o alicerce perfeito para aguentar.";

    days[88].title = "A Grande Conquista";
    days[88].message = "Amanhã é nosso último dia no Fundamentos. Prepare o coração! Você é muito mais forte do que quando começou há 3 meses atrás.";

    days[89].title = "A Formatura Final";
    days[89].is_gamification = true;
    days[89].perspective = null;
    days[89].message = "[GAMIFICAÇÃO] ⚖️ DIA FINAL! Digite seu peso para bater o martelo nos seus incríveis 90 dias de Fundamentos. O prêmio Diamante está batendo à porta!";

    return days;
};

async function seed() {
    console.log('Iniciando inserção do Protocolo Fundamentos de 90 Dias...');

    const { data: protocol, error: pError } = await supabase
        .from('protocols')
        .insert({
            name: protocolName,
            description: protocolDescription,
            duration_days: 90,
            eligible_plans: ['premium', 'vip'],
            is_active: true
        })
        .select()
        .single();

    if (pError || !protocol) {
        console.error('Erro ao criar protocolo:', pError);
        return;
    }

    console.log(`Protocolo criado com ID: ${protocol.id}`);

    const steps = generate90Days().map(step => ({
        ...step,
        protocol_id: protocol.id
    }));

    const { error: sError } = await supabase
        .from('protocol_steps')
        .insert(steps);

    if (sError) {
        console.error('Erro ao inserir os passos:', sError);
    } else {
        console.log(`✅ Sucesso! Inseridos 90 dias completos de mensagens para o protocolo "${protocolName}".`);
    }
}

seed();
