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

const protocolName = 'Performance (Avançado)';
const protocolDescription = 'Protocolo técnico e exigente para quebrar platôs. Foco em contagem de macros, treino intenso, falha muscular e alta restrição de exceções. Tom de voz de treinador esportivo.';

const generate90Days = () => {
    const days: any[] = [];

    const addDay = (day: number, title: string, message: string, isGamification = false, perspective: string | null = null) => {
        days.push({ day, title, message, is_gamification: isGamification, perspective });
    };

    // WEEKS 1 to 3 (Handcrafted for maximum engagement - Performance Level)
    addDay(1, "O Fim das Desculpas", "Bem-vindo ao topo. No protocolo Performance, nós não aplaudimos o óbvio. Beber água e dormir bem é a sua obrigação aqui. Nosso foco agora é quebrar a estagnação. Você está disposto a pesar sua comida e bater macronutrientes?");
    addDay(2, "A Matemática do Corpo", "A partir de hoje, 'comer pouco' não existe. Existe déficit calórico calculado. Você já sabe qual a sua meta de proteínas diária? Se não sabe, me mande uma mensagem pedindo ajuda. A precisão molda resultados.");
    addDay(3, "Treino Até a Falha", "Passear na academia acabou. Treino de Performance exige progressão de carga ou falha técnica. Se você sai do treino sem suar e sem o músculo queimar, você só passeou. Aumente o peso hoje.");
    addDay(4, "Check-in de Precisão", "[GAMIFICAÇÃO] 🍽️ Check-in de Macros!\nComo está o rastreamento da sua comida?\nA) Macros perfeitamente calculados, tudo pesado.\nB) Focando apenas no volume de proteína, no olho.\nC) Comendo de forma intuitiva e torcendo.", true, "alimentacao");
    addDay(5, "Tolerância Zero", "Sextou. A regra da Performance é clara: não merecemos lixo só porque é final de semana. Se você está em platô e comer uma pizza inteira hoje, você joga a semana fora. Uma refeição livre sob medida. Escolha com sabedoria.");
    addDay(6, "O Peso Psicológico do Final de Semana", "Sábado. O seu adversário está na cama ou no bar. Onde você está? Atletas descansam, mas atletas treinam quando ninguém tá olhando. Faça o seu cárdio.");
    addDay(7, "Pesagem de Ajuste de Rota", "[GAMIFICAÇÃO] ⚖️ Domingo. O dia da verdade.\nInsira seu peso de jejum (em kg). Em Performance, uma variação mínima exige reavaliação de estratégia calórica. Qual o número de hoje?", true, null);

    addDay(8, "Análise Fria e Calculista", "Segunda-feira. Se o peso não caiu e você diz que fez tudo certo, você errou nos cálculos ou na intensidade. A biologia não mente. Vamos apertar ainda mais a dieta e forçar a progressão de carga no treino essa semana.");
    addDay(9, "Check-in: Volume Real", "[GAMIFICAÇÃO] 🏃‍♀️ Check-in de Intensidade!\nComo foi o treino ontem?\nA) Falha mecânica na última série. Destruído e orgulhoso.\nB) Treino bom, mas dava pra pegar mais peso.\nC) Fui tirar foto no espelho e enrolei.", true, "movimento");
    addDay(10, "A Importância da Recuperação (Ganhando Músculo)", "Treinar rasga a fibra, dormir constrói fibra. Sem sono de qualidade de no mínimo 7 horas, seus hormônios anabólicos não agem. Sua janela anabólica é sagrada. Como foi a noite?");
    addDay(11, "A Água é Seu Lubrificante", "Em Performance, 40ml a 50ml de água por kg não é para matar a sede, é para bater a meta de excreção de líquidos retidos e transporte intracelular. Garrafa na mão o dia inteiro. Bateu a meta?");
    addDay(12, "Prevenção da Queda de Imunidade", "Quando tiramos calorias e subimos intensidade, a imunidade cai. Não se sabote com álcool neste final de semana se você for treinar pesado no domingo. Você sabe as consequências no seu anabolismo.");
    addDay(13, "Sábado Cardiovascular", "Cárdio HIIT de 20 minutos hoje no pós treino? Se a balança estancou, a frequência cardíaca precisa subir da zona de conforto. Vamos queimar essa gordura residual.");
    addDay(14, "Fechamento Tático Escrito", "[GAMIFICAÇÃO] ⚖️ Dia do check-in Tático.\nSeu peso não mente.\nInsira seu peso e avalie seus números. O seu platô foi rompido?", true, null);

    addDay(15, "Semana 3: Analisando as Fibras", "Você sobreviveu a duas semanas no modo Hardcore. Chegou a hora de olharmos não apenas o peso, mas a definição e textura da pele. A gordura está cedendo.");
    addDay(16, "Refeeds (Recarga Racional)", "Sentindo o músculo murcho e o peso estagnado? Talvez seja a hora de um 'Refeed' (Recarga de Carboidratos Limpos), não de uma refeição do lixo (Cheat Meal). Coma arroz, batata e aveia limpos. Foco na saciedade real.");
    addDay(17, "Check-in de Foco Tático", "[GAMIFICAÇÃO] 🧠 Check-in da Mente!\nQual o seu nível de Foco agora?\nA) Vontade de Titânio. Nada me tira do prumo.\nB) O cansaço físico tá testando minha mente, vontade de comer.\nC) Preciso muito de um cheat emocional urgente, tá pesado.", true, "bemEstar");
    addDay(18, "O Segredo da Densidade Nutricional", "Quando a caloria aperta, o volume no prato tem que ser esperto. Coma 500g de espinafre em vez de 50g de arroz misturado. Volume salva a vontade de mastigar de quem está em Performance.");
    addDay(19, "A Diferença na Roupa Cortando", "Sextou! No Performance, esquecemos a fita métrica e confiamos nas fotos sob a mesma iluminação e no caimento nas juntas da roupa. Essa é a verdadeira redução de gordura (Fat Loss).");
    addDay(20, "Atleta não Para", "Não pule o seu preparo de marmitas de amanhã. O sucesso na segunda começa no planejamento do seu tupperware no sábado. Deixe as saladas montadas e proteínas prontas.");
    addDay(21, "O Corte Semanal", "[GAMIFICAÇÃO] ⚖️ Check-in de balança domingueiro.\nInsira seu peso exato de jejum após ir ao banheiro. Estamos contando décimos de gramas agora. Vamos lá.", true, null);

    // AUTO-GENERATE REST (Day 22 to 90) - PERFORMANCE PATTERN
    let currentWeek = 4;
    for (let day = 22; day <= 90; day++) {
        const dayOfWeek = day % 7;
        currentWeek = Math.ceil(day / 7);

        if (dayOfWeek === 1) { // Monday
            addDay(day, `Semana ${currentWeek}: Intensidade Acordada`, `Segunda com sangue nos olhos. Chegamos na Semana ${currentWeek}. O seu metabolismo já é rápido e responsivo. É hora de forçar a barra do limite técnico nos treinos grandes (Pernas, Costas). Cumpra a meta!`);
        } else if (dayOfWeek === 2) { // Tuesday (Gamification: Food or Movement)
            if (currentWeek % 2 === 0) {
                addDay(day, "Check-in Frio e Racional", `[GAMIFICAÇÃO] 🍽️ Check-in Matemático.\nVocê pesou tudo hoje?\nA) Macros batidos no grama.\nB) Fiz boas estimativas por porção.\nC) Fui na intuição, e não deveria.`, true, "alimentacao");
            } else {
                addDay(day, "Check-in Destruidor", `[GAMIFICAÇÃO] 🏃‍♀️ Check-in Muscular.\nCarga, Esforço e Resiliência.\nA) Bati meus recordes, suei, doeu. Ótimo treino.\nB) Mudei treino para algo regenerativo e funcional.\nC) Fugi e dei desculpa de falta de tempo.`, true, "movimento");
            }
        } else if (dayOfWeek === 3) { // Wednesday
            addDay(day, "Gestão da Fadiga Central", `Metade da Semana ${currentWeek}. A dor muscular tardia já está te cobrando? Ótimo. Sinal que estressou o sistema. Beba a água total ou beba os macros para acelerar e durma bem essa noite.`);
        } else if (dayOfWeek === 4) { // Thursday (Gamification: Sleep/Stress)
            addDay(day, "Check-in Tático Menal", `[GAMIFICAÇÃO] 🧠 Restitution Check.\nEsgotamento Neurológico x Recuperação.\nA) Meu humor está forte, estou inabalável.\nB) Sistema testado, mas com energia de sobra para o resto da semana.\nC) Esgotado fisicamente, preciso de off urgente.`, true, "bemEstar");
        } else if (dayOfWeek === 5) { // Friday
            addDay(day, "Faca nos Dentes", `Sexta. As desculpas aumentam no ar para a maioria da sociedade. Nós, no nível Performance da semana ${currentWeek}, sabemos que a sexta vale tanto caloriais úteis e anabólicas quanto a segunda. Não vacile.`);
        } else if (dayOfWeek === 6) { // Saturday
            addDay(day, "O Cardio de Reposição", `O seu final de semana exige gasto basal. Vá fazer aquele cardio de 45 min aeróbico de zona 2 no final de tarde ou amanhã cedo. Suor e sol.`);
        } else if (dayOfWeek === 0) { // Sunday
            addDay(day, `Balança Sniper (${currentWeek})`, `[GAMIFICAÇÃO] ⚖️ Fim da semana de alta performance ${currentWeek}.\nAdicione seu peso oficial (kg de jejum). O gráfico de dispersão nos diz se temos de descer calorias nas quartas. Informe seu número preciso.`, true, null);
        }
    }

    // OVERRIDE LAST DAYS (87-90)
    days[86].title = "A Transformação Total";
    days[86].message = "🚨 Semana final do Performance. Chegamos na Semana 13. O que vejo em você é algo além do físico. Você se transformou em alguém disciplinado que ninguém ousa duvidar.";

    days[87].title = "O Seu Melhor Shape Física e Mental";
    days[87].message = "O reflexo que você vê no espelho hoje custou 9 meses completos da sua vida desde que chegou ao app como um 'Fundamentos'. O prêmio não é só visual, é vida contínua com saúde extrema.";

    days[88].title = "Manutenção e Legado";
    days[88].message = "Você descobriu que o peso da disciplina pesa onças, e as dores e a doença pesam toneladas. Que orgulho da sua dedicação constante.";

    days[89].title = "A Majestade: Diamante";
    days[89].is_gamification = true;
    days[89].perspective = null;
    days[89].message = "[GAMIFICAÇÃO] ⚖️ É isso. A jornada de Diamante dos 9 meses perfeitos (270 DIAS DE APP). Você acaba de finalizar com nota A+ todo o ciclo Cuidar.me. Digite o SEU PESO PERFEITO DE HOJE PARA O MURAL OFICIAL! 🏆💎";

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

    const { error: sError } = await supabase
        .from('protocol_steps')
        .insert(steps);

    if (sError) {
        console.error('Erro ao inserir os passos:', sError);
    } else {
        console.log(`✅ Sucesso! Inseridos 90 dias completos de mensagens altamente exclusivas e exigentes para o protocolo "${protocolName}".`);
    }
}

seed();
