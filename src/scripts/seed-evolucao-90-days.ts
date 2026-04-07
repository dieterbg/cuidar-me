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

const protocolName = 'Evolução (Intermediário)';
const protocolDescription = 'Protocolo focado em consistência de longo prazo para quem já domina o básico. Trabalha qualidade alimentar, constância de exercícios e higiene do sono. Tom educativo e de parceria.';

const generate90Days = () => {
    const days: any[] = [];

    const addDay = (day: number, title: string, message: string, isGamification = false, perspective: string | null = null) => {
        days.push({ day, title, message, is_gamification: isGamification, perspective });
    };

    // WEEKS 1 to 3 (Handcrafted for maximum engagement - Evolução Level)
    addDay(1, "A Nova Fase", "Olá! Parabéns por chegar ao protocolo Evolução. 🚀 Aqui o jogo muda: nós não vamos apenas beber água, vamos olhar para a qualidade do que você come. Nossa meta nessa primeira semana é a consistência. Pronto para elevar a barra?");
    addDay(2, "Além do Óbvio (Comida)", "Você já sabe que comer bem faz diferença, mas e o volume? Hoje o desafio é analisar o tamanho do seu prato de almoço. Sirva-se uma única vez e mastigue devagar. Topa?");
    addDay(3, "Constância no Movimento", "A motivação é como banho, precisamos dela todos os dias. Você já treinou hoje? Não precisa ser o treino mais intenso da vida, mas precisa acontecer. O corpo pede!");
    addDay(4, "Check-in de Frequência", " Check-in de Movimento!\nComo está a rotina de exercícios essa semana?\nA) Fiz tudo que planejei!\nB) Falhei algum dia, mas mantenho o ritmo.\nC) Consegui fazer quase nada ainda.", true, "movimento");
    addDay(5, "O Desafio da Sexta", "Sextou! No nível Evolução, a sexta não é desculpa para chutar o balde inteiro. Se for ter uma refeição livre hoje ou amanhã, programe-a. Qual será a sua refeição de prazer neste final de semana?");
    addDay(6, "O Peso Psicológico do Final de Semana", "Fim de semana chegou. Lembre-se que o corpo não sabe que dia é hoje. Evite o jejum prolongado sem controle e mantenha as refeições baseadas em proteína. Força!");
    addDay(7, "Pesagem de Ajuste Clínico", " Domingo de check-in oficial.\nQual o seu peso de jejum hoje (em kg)? Nós não queremos perda brusca, queremos constância. Registre aqui! 👇", true, null);

    addDay(8, "Avaliando a Engrenagem", "Segundou na Evolução! ☀ Diferente do começo, agora a gente analisa os erros do final de semana em vez de apenas ignorá-los. O que você exagerou ontem que podemos fazer diferente no próximo domingo?");
    addDay(9, "Check-in: O Prato Perfeito", " Check-in Nutricional!\nComo estava o volume de salada e proteína no almoço?\nA) Metade do prato de salada, porção excelente de proteína!\nB) Tinha mais carboidrato que o ideal, mas segurei.\nC) Almocei muito mal hoje, comi rápido e sem pensar.", true, "alimentacao");
    addDay(10, "A Higiene do Sono", "Você apagou o celular cedo ontem? A qualidade da sua evolução está proporcionalmente ligada ao seu sono profundo. Hoje, seu dever de casa é evitar café depois das 15h. Topa?");
    addDay(11, "A Força do Meio", "A vontade costuma cair no meio da semana. A força do hábito mora aqui. Você só precisa manter o foco hoje. Dê 100% no seu treino e beba a água estipulada. Vamos!");
    addDay(12, "Prevenção da Queda", "Sexta se aproxima. Já vimos como o final de semana pode nos trair. Prepare hoje o lanche de amanhã à tarde, assim você evita assaltar a geladeira no sábado.");
    addDay(13, "Sábado Ativo", "Se hoje você não trabalha, use esse tempo a favor do seu corpo. Um treino de 40 minutos hoje paga enormes juros na sua saúde semana que vem. Você já treinou hoje?");
    addDay(14, "Fechamento da Quinzena", " Dia do check-in de balança da quinzena.\nInsira seu peso (kg). Constância é quando os altos e baixos da linha do peso começam a se tornar uma leve descida contínua. 📉", true, null);

    addDay(15, "Semana 3: Analisando as Emoções", "Bom dia! Iniciando a Semana 3. Você já reparou como o estresse faz você buscar comida à noite? Essa semana focamos na mente.");
    addDay(16, "A Fome Real vs Fome Emocional", "A fome bateu? Dica prática: Beba um copo grande de água e espere 15 minutos. Se a vontade de mastigar continuar, era fome. Senão, era só tédio ou sede. Faça o teste!");
    addDay(17, "Check-in de Estresse", " Check-in da Mente!\nQual seu nível de estresse impactando a dieta hoje?\nA) Zero! Controle total da mente.\nB) Tô beliscando umas coisas por causa da tensão.\nC) Perdi o controle, descontei as emoções na comida.", true, "bemEstar");
    addDay(18, "O Segredo da Proteína", "Você sabia que a proteína é a chave da saciedade? Em todas as refeições hoje, garanta que haja uma boa fonte de proteína (ovo, frango, iogurte forte). Observe como sua fome reduz.");
    addDay(19, "A Diferença na Roupa", "Sextou! Mais importante que a balança é como sua roupa está vestindo. Sente algo mais largo? O protocolo Evolução foca na perda de gordura. Observe as medidas e sinta orgulho!");
    addDay(20, "Preparando o Domingo", "Sábado. Descanse, coma algo que goste (em quantidade civilizada) e já deixe a salada do domingo lavada. Facilite o seu próprio sucesso de amanhã.");
    addDay(21, "Pesagem e Medidas", " Domingo de pesagem!\nQual seu peso hoje? Lembre-se, além do peso, a qualidade do seu corpo está mudando.", true, null);

    // AUTO-GENERATE REST (Day 22 to 90) - EVOLUÇÃO PATTERN
    let currentWeek = 4;
    for (let day = 22; day <= 90; day++) {
        const dayOfWeek = day % 7;
        currentWeek = Math.ceil(day / 7);

        if (dayOfWeek === 1) { // Monday
            addDay(day, `Alinhamento da Semana ${currentWeek}`, `Boa segunda! Semana ${currentWeek}. A vida adulta exige constância mesmo quando não queremos. Analise friamente onde você escorregou e corrija hoje. A disciplina começa na segunda.`);
        } else if (dayOfWeek === 2) { // Tuesday (Gamification: Food or Movement)
            if (currentWeek % 2 === 0) {
                addDay(day, "Check-in do Prato", ` Check-in Nutricional!\nA qualidade alimentar hoje foi:\nA) Impecável. Pura proteína e fibras!\nB) Mediana. Poderia ter menos farinha.\nC) Perigosa. Volumosa e fora do planejado.`, true, "alimentacao");
            } else {
                addDay(day, "Check-in de Frequência", ` Check-in de Movimento!\nO corpo gastou calorias essa semana?\nA) Sim, treino forte!\nB) Fiz algo leve, mas fiz.\nC) Totalmente sedentário esses dias.`, true, "movimento");
            }
        } else if (dayOfWeek === 3) { // Wednesday
            addDay(day, "Gestão do Cansaço", `Metade da Semana ${currentWeek}. Essa fase do protocolo Evolução exige controle e maturidade. Não troque a sua saúde a longo prazo por 5 minutos de prazer de um doce na quarta-feira. Resista.`);
        } else if (dayOfWeek === 4) { // Thursday (Gamification: Sleep/Stress)
            addDay(day, "Check-in de Sono e Mente", ` Check-in da Mente e Sono!\nComo seu corpo se recuperou hoje?\nA) Dormi bem, acordei disposto e focado.\nB) Sono cortado, corpo meio letárgico.\nC) Insônia, estresse e fadiga totais.`, true, "bemEstar");
        } else if (dayOfWeek === 5) { // Friday
            addDay(day, "Estratégia de Fim de Semana", `Sexta da Semana ${currentWeek}. A meta da Evolução é não precisar reiniciar a dieta toda segunda. Evite pular o café da manhã amanhã e foque na moderação no jantar livre.`);
        } else if (dayOfWeek === 6) { // Saturday
            addDay(day, "Sábado Ativo", `Como alunos experientes (Evolução), sabemos que o sábado não é dia livre das obrigações vitais. Ao menos beba sua meta de água e caminhe. Vamos cuidar de nós mesmos.`);
        } else if (dayOfWeek === 0) { // Sunday
            addDay(day, `Check-in Visual e de Peso (Semana ${currentWeek})`, ` Chegando ao fim da semana ${currentWeek}. Insira o seu peso de jejum hoje para o nosso sistema mapear seu platô ou descida!`, true, null);
        }
    }

    // OVERRIDE LAST DAYS (87-90)
    days[86].title = "Reta Final (Evolução)";
    days[86].message = "🚨 Apenas 4 dias para finalizarmos os 90 dias do protocolo Evolução. Você não é mais a pessoa que começou. Sua rotina alimentar e sua constância agora são automáticas.";

    days[87].title = "O Platô é Natural";
    days[87].message = "Se a balança parou de descer muito nos últimos meses, entenda: seu corpo é inteligente e agora preserva energia. Você construiu músculo e a balança fica teimosa. É ciência.";

    days[88].title = "Nível Performance";
    days[88].message = "O protocolo 'Performance' será o seu próximo e último desafio. Lá, nós vamos quebrar todo e qualquer platô de peso que tenha sobrado focando em macros, calorias e intensidade máxima. Preparado?";

    days[89].title = "Mural da Fama";
    days[89].is_gamification = true;
    days[89].perspective = null;
    days[89].message = " Dia Histórico! O nível Diamante e a consagração dos seus 180 dias totais no aplicativo estão acontecendo. Digite seu peso final oficial para documentarmos 🏆!";

    return days;
};

async function seed() {
    console.log(`Iniciando inserção do Protocolo ${protocolName} de 90 Dias...`);

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

    // Chunk size just in case, though 90 is small enough for Supabase, 
    // it's good practice.
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
