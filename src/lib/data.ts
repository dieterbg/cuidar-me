
import type { Patient, PatientConversation, Video, HealthMetric, Protocol, GamificationConfig, CommunityTopic, CommunityComment, ProtocolStep, Perspective } from './types';
import { sub, add, startOfWeek } from 'date-fns';

const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

// --- GAMIFICATION CONFIG ---
// This single configuration object replaces the linear missions.
export const gamificationConfig: GamificationConfig = {
    perspectiveGoals: {
        alimentacao: 5,
        movimento: 5,
        hidratacao: 5,
        disciplina: 5,
        bemEstar: 5,
    },
    actions: [
        // Alimentação
        { actionId: 'check_in_refeicao', perspective: 'alimentacao', points: { 'A': 20, 'B': 15, 'C': 10 }, checkinTriggerText: 'Check-in de Refeição' },
        // Movimento
        { actionId: 'registrar_atividade_fisica', perspective: 'movimento', points: 40, checkinTriggerText: 'Check-in de Atividade Física' },
        // Disciplina
        { actionId: 'medicao_semanal', perspective: 'disciplina', points: 50, checkinTriggerText: 'Check-in Semanal de Peso' },
        { actionId: 'planejamento_semanal', perspective: 'disciplina', points: 30, checkinTriggerText: 'Planejamento Semanal' },
        // Bem-Estar
        { actionId: 'assistir_video_educativo', perspective: 'bemEstar', points: 20 },
        { actionId: 'participar_comunidade', perspective: 'bemEstar', points: 25 },
        { actionId: 'checkin_bem_estar', perspective: 'bemEstar', points: 15, checkinTriggerText: 'Check-in de Bem-Estar' },
        // Hidratação
        { actionId: 'checkin_hidratacao', perspective: 'hidratacao', points: 15, checkinTriggerText: 'Check-in de Hidratação' },
         // Onboarding Actions (don't directly contribute to weekly perspectives but give points)
        { actionId: 'completar_perfil', perspective: 'disciplina', points: 150 },
        { actionId: 'assistir_video_boas_vindas', perspective: 'bemEstar', points: 30 },
        { actionId: 'assistir_video_nutricao', perspective: 'alimentacao', points: 20 },
    ]
};


// --- MANDATORY GAMIFICATION MESSAGES ---
// These steps are programmatically injected into every active protocol. 
// They follow a weekly cadence for the first 13 weeks (approx. 90 days).
export const mandatoryGamificationSteps: (ProtocolStep & { perspective: Perspective })[] = [
    // Weekly weigh-ins (every Monday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({ 
        day: (i * 7) + 1, // Days 1, 8, 15, 22...
        title: `[GAMIFICAÇÃO] Check-in Semanal de Peso (Semana ${i + 1})`, 
        message: i === 0 
            ? "Bem-vindo(a) ao seu novo protocolo! Para nosso ponto de partida, por favor, me informe seu peso de hoje."
            : `Olá! Chegou o dia do nosso check-in semanal. Por favor, me informe seu peso de hoje em jejum.`,
        perspective: 'disciplina' as Perspective
    })),
     // Weekly planning (every Monday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 1, // Days 1, 8, 15...
        title: `[GAMIFICAÇÃO] Planejamento Semanal (Semana ${i + 1})`,
        message: 'Vamos começar a semana com o pé direito! Você já planejou suas atividades físicas e refeições principais para os próximos dias? Responda com SIM ou NÃO.',
        perspective: 'disciplina' as Perspective
    })),
    // Hydration check-ins (every day for 13 weeks)
    ...Array.from({ length: 13 * 7 }, (_, i) => ({
        day: i + 1,
        title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
        message: 'Lembrete de hidratação! 💧 Sobre sua meta de água hoje, como você se saiu? Responda apenas com a letra:\n\nA) Bati a meta.\nB) Cheguei perto.\nC) Esqueci completamente.',
        perspective: 'hidratacao' as Perspective
    })),
    // Well-being check-ins (every Thursday and Sunday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 4, // Days 4, 11, 18...
        title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
        message: 'Como você avalia a sua noite de sono de ontem? Responda apenas com a letra:\n\nA) Boa, me sinto descansado(a).\nB) Razoável, acordei algumas vezes.\nC) Ruim, não consegui descansar.',
        perspective: 'bemEstar' as Perspective
    })),
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 7, // Days 7, 14, 21...
        title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
        message: 'Fim de semana é para relaxar! Como você está se sentindo hoje, mental e fisicamente? Me conte em uma ou duas palavras.',
        perspective: 'bemEstar' as Perspective
    })),
     // Meal check-ins (every Tuesday and Friday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 2, // Days 2, 9, 16...
        title: `[GAMIFICAÇÃO] Check-in de Almoço (Semana ${i + 1})`,
        message: "Olá! Como foi seu almoço hoje em relação ao plano? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.",
        perspective: 'alimentacao' as Perspective
    })),
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 5, // Days 5, 12, 19...
        title: `[GAMIFICAÇÃO] Check-in de Jantar (Semana ${i + 1})`,
        message: "Chegando ao fim do dia! Como foi seu jantar? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.",
        perspective: 'alimentacao' as Perspective
    })),
    // Physical activity check-ins (every Wednesday and Saturday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 3, // Days 3, 10, 17...
        title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
        message: 'É dia de movimento! Você praticou alguma atividade física hoje? Se sim, me conte o que você fez e por quanto tempo!',
        perspective: 'movimento' as Perspective
    })),
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 6, // Days 6, 13, 20...
        title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
        message: 'Sabadou com movimento? Conte pra gente se você fez algum exercício hoje!',
        perspective: 'movimento' as Perspective
    })),
];


// --- PROTOCOLS: 90-DAY WEIGHT LOSS PROGRAMS ---
// These protocols now ONLY contain content/engagement messages. 
// Gamification messages (weigh-ins, etc.) are injected automatically.
export const protocols: Protocol[] = [
    {
        id: 'fundamentos_90_dias',
        name: 'Protocolo Fundamentos (90 Dias)',
        description: 'Focado em criar hábitos básicos como hidratação, caminhadas leves e um dia de pesagem na semana. Ideal para quem precisa de estrutura para começar e manter a consistência.',
        durationDays: 90,
        eligiblePlans: ['premium', 'vip'],
        messages: [
            // Month 1: Foundation
            { day: 2, title: 'Meta de Hidratação', message: "Olá! Vamos começar com o básico: hidratação. Sua primeira meta é beber 2 litros de água hoje. Um copo a cada 2 horas é um ótimo começo! 💧" },
            { day: 4, title: 'Dica do Prato Colorido', message: "Dica de hoje: Seu prato está colorido? Tente incluir pelo menos 3 cores de vegetais no seu almoço para garantir mais nutrientes! 🥗" },
            { day: 6, title: 'Importância do Sono', message: "Você sabia que uma boa noite de sono regula os hormônios da fome? Tente dormir de 7 a 8 horas esta noite e veja como se sente amanhã." },
            { day: 9, title: 'Fim de Semana com Equilíbrio', message: "Fim de semana chegando! Lembre-se que o equilíbrio é seu melhor amigo. Aproveite com consciência e sem culpa!" },
            { day: 11, title: 'Lendo Rótulos', message: "Desafio do dia: ao ir ao mercado, leia o rótulo de 3 produtos que você costuma comprar. Compare a quantidade de açúcar e sódio. A conscientização é o primeiro passo!" },
            { day: 13, title: 'Mindful Eating', message: "Na sua próxima refeição, tente comer sem distrações (TV, celular). Preste atenção nos sabores e texturas. Isso ajuda a reconhecer os sinais de saciedade do seu corpo." },
            { day: 16, title: 'Planejando o Desconhecido', message: "Você tem algum evento social ou viagem chegando? Planejar como lidar com essas situações com antecedência é uma estratégia poderosa para não sair dos trilhos." },
            { day: 18, title: 'Consistência > Perfeição', message: "Lembre-se sempre: consistência é mais importante que perfeição. Se um dia não for como o planejado, apenas retome no dia seguinte. O que importa é a direção!" },
            { day: 20, title: 'Dica de Atividade Física', message: "Que tal usar as escadas em vez do elevador hoje? Pequenas trocas no dia a dia fazem uma grande diferença no final do mês." },
            { day: 23, title: 'Reconhecendo a Fome', message: "Antes de beliscar, beba um copo d'água. Muitas vezes, nosso cérebro confunde sede com fome." },
            { day: 25, title: 'Benefícios da Caminhada', message: "Uma caminhada de 30 minutos pode melhorar seu humor, sua circulação e ajudar no controle do peso. Que tal encaixar uma no seu dia hoje?" },
            { day: 28, title: 'Pequenas Vitórias', message: "Conseguiu beber mais água? Comeu mais salada? Comemore as pequenas vitórias! Elas são o combustível para as grandes conquistas." },
            { day: 30, title: 'Revisão do Mês 1', message: "Parabéns, você completou o primeiro mês! 🎉 Você construiu uma base sólida. Vamos continuar firmes para o próximo nível." },
            
            // Month 2: Consistency
            { day: 32, title: 'Variando a Atividade Física', message: 'Que tal variar a caminhada de hoje? Tente um caminho novo ou ouça um podcast. Manter a mente engajada ajuda a criar o hábito.'},
            { day: 34, title: 'O Poder das Fibras', message: 'Alimentos ricos em fibras (aveia, feijão, maçã) ajudam na saciedade. Sua meta hoje é incluir uma fonte de fibra em seu café da manhã.'},
            { day: 37, title: 'Escala da Fome', message: 'Antes de comer, se pergunte de 0 a 10, qual o seu nível de fome? Isso te ajuda a diferenciar fome física de vontade de comer.'},
            { day: 39, title: 'Planejando as Refeições', message: 'Planejar as refeições da semana no domingo pode economizar tempo e evitar decisões ruins de última hora. Que tal tentar planejar 3 dias?'},
            { day: 42, title: 'Bebidas Calóricas', message: 'Fique de olho nas calorias líquidas! Refrigerantes, sucos industrializados e cafés adoçados podem sabotar seu progresso. Prefira água, chás e café sem açúcar.'},
            { day: 44, title: 'Lidando com o Estresse', message: 'O estresse pode aumentar o cortisol e a vontade de comer. Encontre uma válvula de escape saudável: meditação, um hobby, ou uma conversa com um amigo.'},
            { day: 46, title: 'Revisão de Meio de Percurso', message: 'Metade do caminho! Como você se sente em relação ao início? O que está mais fácil agora?'},
            { day: 49, title: 'O Mito do "Pode Tudo"', message: 'Cuidado com o pensamento "já que saí da dieta, vou chutar o balde". Uma refeição fora do plano não anula seu progresso. Apenas retome na próxima.'},
            { day: 51, title: 'Proteína no Café da Manhã', message: 'Incluir uma fonte de proteína como ovos ou iogurte no café da manhã ajuda a manter a saciedade por mais tempo. Experimente amanhã!' },
            { day: 53, title: 'A Importância do Descanso', message: 'O descanso é tão importante quanto o treino. É durante o sono que seu corpo se recupera e constrói músculos. Priorize seu sono!' },
            { day: 56, title: 'Coma Devagar', message: 'Seu cérebro leva cerca de 20 minutos para registrar que você está satisfeito. Comer devagar é uma ferramenta poderosa para controlar as porções.' },
            { day: 58, title: 'Organizando a Geladeira', message: 'Deixe frutas e vegetais lavados e picados em potes transparentes na altura dos olhos. Deixe os alimentos menos saudáveis menos visíveis.' },
            { day: 60, title: 'Fim do Mês 2', message: 'Dois meses de dedicação! Você está cada vez mais perto de consolidar esses hábitos para a vida toda. Sinta orgulho da sua jornada!'},

            // Month 3: Lifestyle
            { day: 62, title: 'Cozinhando em Casa', message: 'Cozinhar em casa te dá total controle sobre os ingredientes. Desafio: prepare uma refeição hoje que você normalmente pediria por delivery.'},
            { day: 64, title: 'Comunidade de Apoio', message: 'Lembre-se da nossa comunidade no portal. Compartilhar uma dificuldade ou uma vitória pode te dar um novo ânimo!'},
            { day: 67, title: 'Visualizando o Futuro', message: 'Feche os olhos e se imagine daqui a 1 ano com seus novos hábitos. Como você se sente? Use essa visão como combustível.'},
            { day: 70, title: 'Reconhecendo Gatilhos', message: 'Qual situação te faz sair do plano? Tédio? Cansaço? Identificar os gatilhos é o primeiro passo para criar um plano de ação.'},
            { day: 72, title: 'Coma até 80% Satisfeito', message: 'Experimente parar de comer quando se sentir 80% satisfeito, em vez de completamente cheio. É uma prática oriental que ajuda muito no controle de peso.'},
            { day: 74, title: 'Planejamento para Viagens', message: 'Vai viajar? Leve lanches saudáveis (castanhas, frutas secas), pesquise restaurantes com opções leves no seu destino e mantenha-se hidratado.'},
            { day: 77, title: 'Amigo do Movimento', message: 'Convide um amigo ou familiar para uma caminhada. Ter companhia torna o exercício mais prazeroso e aumenta o compromisso.'},
            { day: 80, title: 'Recompensas não alimentares', message: 'Cumpriu suas metas da semana? Se recompense com algo que não seja comida: um banho relaxante, um episódio da sua série favorita, um novo livro.'},
            { day: 83, title: 'Mantendo a Motivação', message: 'Releia o motivo pelo qual você começou esta jornada. Conectar-se com seu "porquê" é uma fonte poderosa de motivação.'},
            { day: 85, title: 'O Hábito Angular', message: 'Muitas vezes, um único hábito (como se exercitar de manhã) desencadeia uma série de outras boas decisões ao longo do dia. Qual é o seu?'},
            { day: 88, title: 'Véspera da Conclusão', message: 'Amanhã completamos 90 dias. Reflita sobre o hábito mais importante que você construiu e que irá levar para o resto da sua vida.'},
            { day: 90, title: 'Conclusão do Protocolo!', message: 'PARABÉNS! Você completou os 90 dias do Protocolo Fundamentos. Você provou para si mesmo que é capaz de construir hábitos saudáveis e duradouros. A jornada continua e estamos aqui para te apoiar!'},
        ]
    },
    {
        id: 'evolucao_90_dias',
        name: 'Protocolo Evolução (90 Dias)',
        description: 'Adiciona uma camada de interação e educação, com envio de fotos de pratos e sugestão de vídeos educativos para aprofundar o conhecimento ao longo de 90 dias.',
        durationDays: 90,
        eligiblePlans: ['premium', 'vip'],
        messages: [
             // Month 1
            { day: 3, title: 'A Importância das Proteínas', message: "Você sabia que as proteínas são essenciais para a saciedade? Sugiro que assista a este vídeo no seu portal: 'A Importância das Proteínas para Saciedade'. Ele tem dicas ótimas!" },
            { day: 6, title: 'Entendendo os Carboidratos', message: "Carboidratos não são vilões! A chave está na qualidade. Assista ao vídeo 'Carboidratos do bem' no portal para aprender a fazer as melhores escolhas." },
            { day: 9, title: 'Check-in de Hidratação', message: "Como está sua hidratação hoje? Conseguiu bater a meta? Lembre-se que a água é fundamental no processo de emagrecimento." },
            { day: 11, title: 'Gorduras Boas', message: "Nem toda gordura é ruim! Abacate, castanhas e azeite são seus aliados. Assista ao vídeo sobre gorduras no portal e adicione uma fonte de gordura boa no seu jantar de hoje." },
            { day: 14, title: '5 Hábitos para o Sucesso', message: "Já pensou em como pequenas mudanças criam grandes resultados? Assista ao vídeo '5 Hábitos para um Emagrecimento Duradouro' no seu portal e me diga qual hábito você tentará aplicar amanhã." },
            { day: 17, title: 'Receita Saudável da Semana', message: 'No portal, na seção de educação, adicionamos uma nova receita de salmão com crosta de gergelim. Que tal experimentar essa semana?' },
            { day: 20, title: 'Sono e Metabolismo', message: 'Você sabia que dormir mal afeta diretamente seu metabolismo? Assista ao vídeo "Sono e Perda de Peso" em nosso portal para entender essa conexão.' },
            { day: 23, title: 'Superando o Efeito Platô', message: 'É normal o peso estagnar. Assista ao nosso vídeo "Superando o Platô" para conhecer estratégias como o "zig-zag" calórico.' },
            { day: 26, title: 'Mindful Eating na Prática', message: 'Desafio da semana: faça uma refeição em silêncio, prestando atenção em cada garfada. Anote como se sentiu depois.' },
            { day: 29, title: 'Socializando com Saúde', message: 'Vai a uma festa? Dica: coma uma fruta ou um iogurte antes de sair. Isso ajuda a não chegar com muita fome e fazer escolhas melhores.' },
            
            // Month 2
            { day: 32, title: 'Reflexão sobre o Mês 1', message: "Primeiro mês do Protocolo Evolução completo! Você já aprendeu muito. Qual foi o maior 'click' ou aprendizado que você teve até agora?" },
            { day: 35, title: 'Jejum Intermitente: Mitos e Verdades', message: 'Curioso sobre jejum intermitente? Assista ao vídeo em nosso portal que explica os prós e contras. Lembre-se: sempre fale com a equipe antes de começar.' },
            { day: 38, title: 'A Importância da Força', message: 'Músculos queimam mais calorias em repouso. Não negligencie o treino de força! Relembre os benefícios no vídeo "Treino de Força para Emagrecer".' },
            { day: 41, title: 'Fibras: Suas Melhores Amigas', message: 'As fibras te mantém saciado por mais tempo e ajudam seu intestino. Já viu nosso vídeo sobre os melhores alimentos ricos em fibras? Está no portal!' },
            { day: 44, title: 'Revisando Metas', message: 'Estamos na metade do caminho. Suas metas iniciais ainda fazem sentido? Precisam de algum ajuste? Me diga como posso te ajudar.' },
            { day: 48, title: 'O Perigo do Açúcar Oculto', message: 'Molhos, pães, iogurtes... o açúcar está em muitos lugares. Assista nosso vídeo sobre como identificar o açúcar oculto nos rótulos.' },
            { day: 52, title: 'Planejando a Manutenção', message: 'Estamos nos aproximando do nosso objetivo. A fase de manutenção é tão importante quanto a de perda. Comece a pensar em como será sua rotina ideal.' },
            { day: 56, title: 'Receita: Mousse de Abacate', message: 'Procurando uma sobremesa saudável? Confira a receita de mousse de abacate com cacau no portal. É deliciosa e nutritiva!' },
            { day: 59, title: 'Seu Novo Eu', message: 'Pense na pessoa que começou este protocolo há quase 60 dias. O que você diria para ela hoje? Compartilhe essa reflexão na comunidade se se sentir à vontade.' },

            // Month 3
            { day: 62, title: 'Ajuste Fino de Suplementos', message: 'É hora de reavaliar a suplementação. Você está sentindo os efeitos? Talvez seja hora de ajustar doses ou tipos com a equipe.' },
            { day: 66, title: 'A Mentalidade do Atleta', message: 'Pense como um atleta: cada refeição, cada treino, cada noite de sono é um passo em direção ao seu objetivo. Você está no controle.' },
            { day: 70, title: 'Estratégia de Longo Prazo', message: 'Como você vai incorporar esse estilo de vida permanentemente? Vamos pensar juntos em uma estratégia de manutenção que seja prazerosa e sustentável.' },
            { day: 74, title: 'Legado de Performance', message: 'Pense em alguém que você pode inspirar com sua jornada. Compartilhar seu sucesso na comunidade pode motivar dezenas de outros pacientes.' },
            { day: 78, title: 'Desafio: Dia sem Industrializados', message: 'Tente passar um dia inteiro comendo apenas "comida de verdade", sem nenhum produto industrializado. Observe como seu corpo se sente.' },
            { day: 82, title: 'Como o Corpo Queima Gordura', message: 'Já viu nosso vídeo que explica cientificamente como o corpo queima gordura? Entender o processo pode ser muito motivador. Confira no portal!' },
            { day: 86, title: 'Celebrando o Progresso Não-Linear', message: 'Lembre-se que o progresso não é uma linha reta. Haverá altos e baixos. O importante é a tendência geral. Orgulhe-se de cada passo.' },
            { day: 90, title: 'Conclusão e Próximos Passos', message: 'Você CONCLUIU o Protocolo Evolução! Parabéns pela dedicação e pelo aprendizado. Agora começa a fase de manutenção, e estamos aqui para te apoiar. Vamos agendar uma conversa para definir os próximos passos?' },
        ]
    },
    {
        id: 'performance_90_dias',
        name: 'Protocolo Performance (90 Dias)',
        description: 'Acompanhamento intensivo com check-ins mais frequentes e metas de macronutrientes, para quem busca otimizar os resultados em um programa de 90 dias.',
        durationDays: 90,
        eligiblePlans: ['vip'],
        messages: [
            // Month 1
            { day: 2, title: 'Foco em Macronutrientes', message: "Vamos falar de macros. Para hoje, sua meta é ter uma fonte de proteína em TODAS as refeições. Me envie fotos do seu almoço e jantar hoje. Quero te ajudar a fazer os ajustes finos." },
            { day: 4, title: 'Otimização do Treino', message: "Para otimizar a queima de gordura, considere fazer seu aeróbico após o treino de força, não antes. Isso usa suas reservas de glicogênio primeiro." },
            { day: 6, title: 'Suplementação Inteligente', message: "Já conversou com a equipe sobre suplementos como Creatina ou Whey Protein? Podem ser aliados importantes nesta fase." },
            { day: 9, title: 'Sono e Performance', message: "Nesta fase, o sono é ainda mais crucial para a recuperação muscular e regulação hormonal. Sua meta hoje é ter 30 minutos de relaxamento antes de deitar, sem telas." },
            { day: 11, title: 'Visualização de Metas', message: "Feche os olhos por um minuto e se visualize atingindo sua meta de peso. Sentir a emoção da conquista fortalece sua determinação." },
            { day: 13, title: 'Escutando seu Corpo', message: "Performance também é saber descansar. Se sentir que precisa de um dia mais leve, ouça seu corpo. O descanso constrói músculos e previne lesões." },
            { day: 16, title: 'Ciclo de Carboidratos (Introdução)', message: 'Vamos experimentar um ciclo de carboidratos. Hoje, reduza pela metade a porção de carbos no jantar. Observe como seu corpo responde amanhã.' },
            { day: 18, title: 'Jejum Intermitente: Está funcionando?', message: "Se você optou por tentar o jejum intermitente, como está se sentindo? Com mais energia ou mais fraco? O ajuste fino é fundamental." },
            { day: 20, title: 'Treino HIIT', message: 'Para quebrar um platô, o treino intervalado de alta intensidade (HIIT) é excelente. Tente trocar 20 minutos de cardio contínuo por 10 minutos de HIIT, 2x na semana.' },
            { day: 23, title: 'Análise de Composição Corporal', message: 'Neste ponto, a balança pode não ser a melhor métrica. Se possível, agende uma bioimpedância para ver a evolução da massa magra vs. gordura.' },
            { day: 25, title: 'Receita Rica em Proteína', message: 'Experimente nossa receita de panqueca de whey com aveia no café da manhã. É uma forma deliciosa de começar o dia com a proteína em alta. Está no portal!' },
            { day: 28, title: 'Ajuste Fino de Suplementos', message: 'É hora de reavaliar a suplementação. Você está sentindo os efeitos? Talvez seja hora de ajustar doses ou tipos com a equipe.' },
            { day: 30, title: 'Reflexão do Mês 1 - Performance', message: 'Primeiro mês focado em performance concluído. Qual foi o maior desafio e a maior vitória até agora?' },

            // Month 2
            { day: 32, title: 'A Mentalidade do Atleta', message: 'Pense como um atleta: cada refeição, cada treino, cada noite de sono é um passo em direção ao seu objetivo. Você está no controle.' },
            { day: 35, title: 'Estratégia de Longo Prazo', message: 'Como você vai incorporar esse estilo de vida permanentemente? Vamos pensar juntos em uma estratégia de manutenção que seja prazerosa e sustentável.' },
            { day: 38, title: 'Desafio: Dia sem Industrializados', message: 'Tente passar um dia inteiro comendo apenas "comida de verdade", sem nenhum produto industrializado. Observe como seu corpo se sente.' },
            { day: 41, title: 'Técnicas de Recuperação', message: 'Além do sono, explore outras técnicas de recuperação como alongamento, banhos de contraste ou até mesmo uma massagem esportiva. A recuperação é parte do treino.' },
            { day: 44, title: 'Nutrição Pré-Treino', message: 'O que você come antes do treino pode impactar sua performance. Uma pequena porção de carboidratos complexos (como batata doce) 1-2h antes pode fazer maravilhas.' },
            { day: 47, title: 'Nutrição Pós-Treino', message: 'A janela pós-treino é ideal para a absorção de nutrientes. Uma combinação de proteína e carboidrato rápido (como whey + banana) acelera a recuperação.' },
            { day: 50, title: 'Revisão de Fotos de Progresso', message: 'Tire fotos de progresso hoje e compare com as do início. Muitas vezes as mudanças no espelho são mais motivadoras que na balança.' },
            { day: 53, title: 'Legado de Performance', message: 'Pense em alguém que você pode inspirar com sua jornada. Compartilhar seu sucesso na comunidade pode motivar dezenas de outros pacientes.' },
            { day: 56, title: 'O Poder da Mente', message: 'Acreditar que você pode atingir seu objetivo é metade da batalha. Afirmações positivas ou meditação podem fortalecer sua mentalidade.' },
            { day: 59, title: 'Reavaliando o "Porquê"', message: 'Seu motivo inicial para começar ainda é o mesmo? Ele evoluiu? Reconectar-se com seu propósito mais profundo pode renovar suas energias.' },
            
            // Month 3
            { day: 62, title: 'Periodização do Treino', message: 'Considere conversar com um profissional para periodizar seu treino, alternando semanas de alta intensidade com semanas de recuperação ativa.' },
            { day: 65, title: 'Ajustando as Calorias', message: 'Com a perda de peso, sua necessidade calórica basal diminui. Pode ser hora de um pequeno ajuste no plano alimentar com a equipe para continuar progredindo.' },
            { day: 69, title: 'Saúde das Articulações', message: 'Com o aumento da performance, a saúde das articulações é vital. Suplementos como colágeno tipo II ou condroitina podem ser discutidos com a equipe.' },
            { day: 73, title: 'A Importância dos Micronutrientes', message: 'Não se esqueça dos micronutrientes! Vegetais de folhas escuras, frutas vermelhas e sementes garantem as vitaminas e minerais que seu corpo precisa.' },
            { day: 77, title: 'Lidando com a Pressão Social', message: 'Como você lida quando amigos ou família não entendem seu novo estilo de vida? Ter respostas prontas e ser firme em suas convicções é uma habilidade a ser treinada.' },
            { day: 81, title: 'O Jejum como Ferramenta', message: 'Se você se adaptou bem, o jejum pode ser uma ferramenta poderosa. Mas lembre-se: não é uma solução mágica, e sim uma estratégia dentro de um plano maior.' },
            { day: 85, title: 'Planejando o Pós-Protocolo', message: 'O protocolo está quase no fim, mas o estilo de vida não. Qual será sua rotina de treinos e alimentação na próxima fase? Vamos planejar juntos.' },
            { day: 89, title: 'Reflexão Final de Performance', message: 'Você chegou ao fim do protocolo mais intenso. Olhe para trás e veja o quão longe você chegou. Qual foi a mudança mais significativa, além do peso?' },
            { day: 90, title: 'PARABÉNS, ATLETA!', message: 'Você não apenas atingiu seus objetivos, mas transformou seu corpo e mente. Você é a prova de que disciplina, ciência e apoio levam a resultados extraordinários. Celebre sua conquista!' },
        ]
    }
];


// --- PATIENT DATA ---
export const patients: Patient[] = [
  // 1. Paciente VIP, engajado e em progresso.
  {
    id: 'p001',
    fullName: 'Roberto Andrade',
    whatsappNumber: 'whatsapp:+5511999990001',
    needsAttention: false,
    subscription: { plan: 'vip', priority: 3 },
    protocol: {
        protocolId: 'performance_90_dias',
        startDate: sub(now, { days: 15 }).toISOString(),
        currentDay: 16,
        isActive: true,
        weightGoal: 95,
    },
    gamification: {
        totalPoints: 720,
        level: 'Praticante',
        badges: ["pe_direito_badge", "bom_de_garfo_badge"],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 1, goal: 5, isComplete: false },
                movimento: { current: 2, goal: 5, isComplete: false },
                hidratacao: { current: 3, goal: 5, isComplete: false },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Roberto Andrade',
    avatar: 'https://placehold.co/100x100/A0D2E8/333?text=RA',
    email: 'roberto.andrade.example@gmail.com',
    lastMessage: 'Atingi minha meta de proteína nos últimos 3 dias!',
    lastMessageTimestamp: sub(now, { hours: 18 }).toISOString(),
    riskLevel: 'low',
    status: 'active',
    activeCheckin: null,
  },
  // 2. Paciente Premium que requer atenção por relatar sintoma.
  {
    id: 'p002',
    fullName: 'Carla Dias',
    whatsappNumber: 'whatsapp:+5511999990002',
    needsAttention: true,
    attentionRequest: {
        reason: "Relato de sintoma",
        triggerMessage: "Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?",
        aiSummary: "A paciente Carla Dias relata uma dor de cabeça atípica e pergunta se deve se preocupar, o que pode indicar um efeito adverso ou uma nova condição que requer avaliação médica.",
        aiSuggestedReply: "Olá Carla, obrigado por me avisar sobre a dor de cabeça. Para investigar melhor, você poderia me dizer: a dor é em algum lugar específico? É pulsante ou uma pressão constante? E em uma escala de 0 a 10, qual a intensidade? Isso me ajudará a entender se pode ser algo relacionado ao tratamento ou se precisamos explorar outras causas.",
        priority: 2,
        createdAt: sub(now, { hours: 1 }).toISOString(),
    },
    subscription: { plan: 'premium', priority: 2 },
    protocol: {
        protocolId: 'evolucao_90_dias',
        startDate: sub(now, { days: 20 }).toISOString(),
        currentDay: 21,
        isActive: true,
        weightGoal: 80,
    },
    gamification: {
        totalPoints: 550, level: 'Praticante',
        badges: ["pe_direito_badge", "bom_de_garfo_badge"],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 3, goal: 5, isComplete: false },
                movimento: { current: 1, goal: 5, isComplete: false },
                hidratacao: { current: 5, goal: 5, isComplete: true },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 2, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Carla Dias',
    avatar: 'https://placehold.co/100x100/f9a8d4/333?text=CD',
    email: 'carla.dias.example@gmail.com',
    lastMessage: 'Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?',
    lastMessageTimestamp: sub(now, { hours: 1 }).toISOString(),
    riskLevel: 'high',
    status: 'active',
    activeCheckin: null,
  },
  // 3. Paciente Freemium, novo cadastro pendente.
  {
    id: 'p003',
    fullName: 'Fernando Lima',
    whatsappNumber: 'whatsapp:+5511999990003',
    needsAttention: true,
    subscription: { plan: 'freemium', priority: 1 },
    protocol: null,
    gamification: {
        totalPoints: 0, level: 'Iniciante', badges: [],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 0, goal: 5, isComplete: false },
                movimento: { current: 0, goal: 5, isComplete: false },
                hidratacao: { current: 0, goal: 5, isComplete: false },
                disciplina: { current: 0, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Fernando Lima',
    avatar: 'https://placehold.co/100x100/a5f3fc/333?text=FL',
    email: 'fernando.lima.example@gmail.com',
    lastMessage: 'Oi, me cadastrei pelo site. Como funciona?',
    lastMessageTimestamp: sub(now, { days: 1, hours: 2 }).toISOString(),
    status: 'pending',
    activeCheckin: null,
  },
  // 4. Paciente Premium recém-ativado.
  {
    id: 'p004',
    fullName: 'Juliana Moreira',
    whatsappNumber: 'whatsapp:+5511999990004',
    needsAttention: false,
    subscription: { plan: 'premium', priority: 2 },
    protocol: {
        protocolId: 'fundamentos_90_dias',
        startDate: sub(now, { days: 4 }).toISOString(),
        currentDay: 5,
        isActive: true,
        weightGoal: 68,
    },
    gamification: {
        totalPoints: 280, level: 'Iniciante', badges: ["pe_direito_badge"],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 1, goal: 5, isComplete: false },
                movimento: { current: 0, goal: 5, isComplete: false },
                hidratacao: { current: 2, goal: 5, isComplete: false },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 1, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Juliana Moreira',
    avatar: 'https://placehold.co/100x100/c4b5fd/333?text=JM',
    email: 'juliana.moreira.example@gmail.com',
    lastMessage: 'Aqui está a foto do meu almoço de hoje!',
    lastMessageTimestamp: sub(now, { hours: 4 }).toISOString(),
    riskLevel: 'low',
    status: 'active',
    activeCheckin: null,
  },
  // 5. Paciente VIP em estágio avançado, mas com risco médio.
  {
    id: 'p005',
    fullName: 'Marcos Rocha',
    whatsappNumber: 'whatsapp:+5511999990005',
    needsAttention: true,
    attentionRequest: {
        reason: "Relato de Dificuldade",
        triggerMessage: "Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.",
        aiSummary: "O paciente Marcos, apesar de estar em um protocolo avançado, relatou dificuldades em seguir o plano no fim de semana. Isso pode indicar uma necessidade de ajuste de estratégia ou uma conversa motivacional.",
        aiSuggestedReply: "Oi, Marcos. Acontece! O importante é não deixar um deslize virar uma desistência. Vamos entender o que aconteceu: foi um evento social, falta de planejamento, ou outra coisa? Saber o gatilho nos ajuda a criar uma estratégia para que o próximo fim de semana seja diferente. Estou aqui para te ajudar a ajustar a rota, sem julgamentos.",
        priority: 3,
        createdAt: sub(now, { hours: 3 }).toISOString(),
    },
    subscription: { plan: 'vip', priority: 3 },
    protocol: {
        protocolId: 'performance_90_dias',
        startDate: sub(now, { days: 25 }).toISOString(),
        currentDay: 26,
        isActive: true,
        weightGoal: 85,
    },
    gamification: {
        totalPoints: 1200, level: 'Veterano',
        badges: ["pe_direito_badge", "bom_de_garfo_badge", "pernas_pra_que_te_quero_badge"],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 0, goal: 5, isComplete: false },
                movimento: { current: 1, goal: 5, isComplete: false },
                hidratacao: { current: 4, goal: 5, isComplete: false },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 3, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Marcos Rocha',
    avatar: 'https://placehold.co/100x100/fecaca/333?text=MR',
    email: 'marcos.rocha.example@gmail.com',
    lastMessage: 'Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.',
    lastMessageTimestamp: sub(now, { hours: 3 }).toISOString(),
    riskLevel: 'medium',
    status: 'active',
    activeCheckin: null,
  },
  // 6. Paciente Freemium, ativo, mas sem protocolo.
  {
    id: 'p006',
    fullName: 'Beatriz Costa',
    whatsappNumber: 'whatsapp:+5511999990006',
    needsAttention: false,
    subscription: { plan: 'freemium', priority: 1 },
    protocol: null,
    gamification: {
        totalPoints: 20, level: 'Iniciante', badges: [],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 0, goal: 5, isComplete: false },
                movimento: { current: 0, goal: 5, isComplete: false },
                hidratacao: { current: 0, goal: 5, isComplete: false },
                disciplina: { current: 0, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Beatriz Costa',
    avatar: 'https://placehold.co/100x100/d9f99d/333?text=BC',
    email: 'beatriz.costa.example@gmail.com',
    lastMessage: 'Obrigada pela dica do vídeo!',
    lastMessageTimestamp: sub(now, { days: 3 }).toISOString(),
    status: 'active',
    activeCheckin: null,
  },
  // 7. Paciente Premium estagnado.
  {
    id: 'p007',
    fullName: 'Tiago Nogueira',
    whatsappNumber: 'whatsapp:+5511999990007',
    needsAttention: false,
    subscription: { plan: 'premium', priority: 2 },
    protocol: {
        protocolId: 'fundamentos_90_dias',
        startDate: sub(now, { days: 18 }).toISOString(),
        currentDay: 19,
        isActive: true,
        weightGoal: 100,
    },
    gamification: {
        totalPoints: 150, level: 'Iniciante',
        badges: ["pe_direito_badge"],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 0, goal: 5, isComplete: false },
                movimento: { current: 0, goal: 5, isComplete: false },
                hidratacao: { current: 1, goal: 5, isComplete: false },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Tiago Nogueira',
    avatar: 'https://placehold.co/100x100/e9d5ff/333?text=TN',
    email: 'tiago.nogueira.example@gmail.com',
    lastMessage: 'Ok',
    lastMessageTimestamp: sub(now, { days: 6 }).toISOString(),
    riskLevel: 'medium',
    status: 'active',
    activeCheckin: null,
  },
  // 8. Novo paciente pendente, sem interação.
  {
    id: 'p008',
    fullName: 'Sofia Almeida',
    whatsappNumber: 'whatsapp:+5511999990008',
    needsAttention: true,
    subscription: { plan: 'freemium', priority: 1 },
    protocol: null,
    gamification: {
        totalPoints: 0, level: 'Iniciante', badges: [],
        weeklyProgress: {
            weekStartDate: weekStart.toISOString(),
            perspectives: {
                alimentacao: { current: 0, goal: 5, isComplete: false },
                movimento: { current: 0, goal: 5, isComplete: false },
                hidratacao: { current: 0, goal: 5, isComplete: false },
                disciplina: { current: 0, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            }
        }
    },
    name: 'Sofia Almeida',
    avatar: 'https://placehold.co/100x100/fde68a/333?text=SA',
    email: 'sofia.almeida.example@gmail.com',
    lastMessage: 'Novo contato via WhatsApp.',
    lastMessageTimestamp: sub(now, { days: 4 }).toISOString(),
    status: 'pending',
    activeCheckin: null,
  },
];


export const conversations: PatientConversation[] = [
    {
        patientId: 'p001',
        messages: [
            { id: '1', sender: 'me', text: 'Semana de pico! O foco é consistência. Me envie fotos do seu almoço e jantar hoje. Quero te ajudar a fazer os ajustes finos.', timestamp: sub(now, { days: 1 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Atingi minha meta de proteína nos últimos 3 dias!', timestamp: sub(now, { hours: 18 }).toISOString() },
        ],
    },
    {
        patientId: 'p002',
        messages: [
            { id: '1', sender: 'me', text: "Olá! Como está se sentindo hoje?", timestamp: sub(now, { days: 1 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?', timestamp: sub(now, { hours: 1 }).toISOString() },
        ]
    },
    {
        patientId: 'p003',
        messages: [
            { id: '1', sender: 'patient', text: 'Oi, me cadastrei pelo site. Como funciona?', timestamp: sub(now, { days: 1, hours: 2 }).toISOString() },
        ]
    },
    {
        patientId: 'p004',
        messages: [
            { id: '1', sender: 'me', text: "Bem-vinda ao Protocolo Fundamentos! Como se sente?", timestamp: sub(now, { days: 4 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Animada! Meu peso hoje é 75kg.', timestamp: sub(now, { days: 4, hours: -1 }).toISOString() },
            { id: '3', sender: 'me', text: 'Olá! Como foi seu almoço hoje em relação ao plano? A) Segui 100%. B) Fiz algumas adaptações. C) Fugi um pouco do plano.', timestamp: sub(now, { hours: 5 }).toISOString() },
            { id: '4', sender: 'patient', text: 'A', timestamp: sub(now, { hours: 4 }).toISOString() },
        ]
    },
    {
        patientId: 'p005',
        messages: [
            { id: '1', sender: 'me', text: 'Olá Marcos, como foi seu fim de semana?', timestamp: sub(now, { hours: 5 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.', timestamp: sub(now, { hours: 3 }).toISOString() },
        ]
    },
    {
        patientId: 'p006',
        messages: [
            { id: '1', sender: 'me', text: 'Oi Beatriz, passando para lembrar do vídeo novo que liberamos no portal!', timestamp: sub(now, { days: 3, hours: -2 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Obrigada pela dica do vídeo!', timestamp: sub(now, { days: 3 }).toISOString() },
        ]
    },
    {
        patientId: 'p007',
        messages: [
            { id: '1', sender: 'me', text: 'Olá Tiago, tudo bem? Como foi a pesagem da semana?', timestamp: sub(now, { days: 6, hours: -2 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Ok', timestamp: sub(now, { days: 6 }).toISOString() },
        ]
    },
    {
        patientId: 'p008',
        messages: [] // No messages yet
    },
];

export const healthMetrics: { patientId: string, metrics: HealthMetric[] }[] = [
    {
        patientId: 'p001',
        metrics: [
            { id: 'm001', date: sub(now, { days: 15 }).toISOString(), weight: 102 },
            { id: 'm002', date: sub(now, { days: 8 }).toISOString(), weight: 100.5 },
            { id: 'm003', date: sub(now, { days: 1 }).toISOString(), weight: 99.8 },
        ]
    },
    {
        patientId: 'p002',
        metrics: [
            { id: 'm004', date: sub(now, { days: 20 }).toISOString(), weight: 89 },
            { id: 'm005', date: sub(now, { days: 13 }).toISOString(), weight: 87.2 },
            { id: 'm006', date: sub(now, { days: 6 }).toISOString(), weight: 85.5 },
        ]
    },
    {
        patientId: 'p004',
        metrics: [
            { id: 'm007', date: sub(now, { days: 4 }).toISOString(), weight: 75 },
        ]
    },
    {
        patientId: 'p005',
        metrics: [
            { id: 'm008', date: sub(now, { days: 25 }).toISOString(), weight: 92 },
            { id: 'm009', date: sub(now, { days: 18 }).toISOString(), weight: 90.1 },
            { id: 'm010', date: sub(now, { days: 11 }).toISOString(), weight: 89 },
            { id: 'm011', date: sub(now, { days: 4 }).toISOString(), weight: 89.5 },
        ]
    },
    {
        patientId: 'p007',
        metrics: [
            { id: 'm012', date: sub(now, { days: 18 }).toISOString(), weight: 110 },
            { id: 'm013', date: sub(now, { days: 11 }).toISOString(), weight: 109.8 },
            { id: 'm014', date: sub(now, { days: 4 }).toISOString(), weight: 109.5 },
        ]
    }
];

export const videos: Video[] = [
  {
    id: 'vid01',
    category: 'Nutrição Inteligente',
    title: '10 DICAS PARA EMAGRECER DA FORMA CORRETA',
    description: 'O vídeo apresenta 10 dicas práticas para emagrecer de forma saudável e sustentável, com foco em mudanças de hábitos, como alimentação equilibrada e prática regular de exercícios, evitando dietas extremas.',
    thumbnailUrl: 'https://img.youtube.com/vi/OiqS2ohM5Jc/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=OiqS2ohM5Jc',
    plans: ['freemium', 'premium', 'vip'],
  },
  {
    id: 'vid02',
    category: 'Mentalidade e Comportamento',
    title: 'Se você NÃO CONSEGUE EMAGRECER, assista isso…',
    description: 'Um guia detalhado baseado em estudos científicos, explicando por que muitas dietas falham e oferecendo estratégias para perder peso de forma definitiva, com dicas para evitar o efeito sanfona.',
    thumbnailUrl: 'https://img.youtube.com/vi/Q_2TGWW8XpM/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Q_2TGWW8XpM',
    plans: ['premium', 'vip'],
  },
  {
    id: 'vid03',
    category: 'Mentalidade e Comportamento',
    title: '4 HÁBITOS PARA EMAGRECER E NÃO ENGORDAR DE NOVO',
    description: 'O vídeo destaca quatro hábitos simples e eficazes para emagrecer e manter o peso, incluindo ajustes na alimentação, sono de qualidade e rotina de atividades físicas.',
    thumbnailUrl: 'https://img.youtube.com/vi/ecUQERiCcJ0/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ecUQERiCcJ0',
    plans: ['premium', 'vip'],
  },
  {
    id: 'vid04',
    category: 'Movimento é Vida',
    title: 'Dicas para EMAGRECIMENTO RÁPIDO!',
    description: 'Oferece dicas práticas e acessíveis para acelerar a perda de peso, com ênfase em treinos rápidos e escolhas alimentares inteligentes, ideal para quem busca resultados imediatos.',
    thumbnailUrl: 'https://img.youtube.com/vi/fO3VRnsNcB0/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=fO3VRnsNcB0',
    plans: ['freemium', 'premium', 'vip'],
  },
  {
    id: 'vid05',
    category: 'Nutrição Inteligente',
    title: 'Como emagrecer rápido? 7 técnicas saudáveis!',
    description: 'Apresenta sete técnicas saudáveis para emagrecer rapidamente, com foco em estratégias práticas como controle de porções, hidratação e exercícios de alta intensidade.',
    thumbnailUrl: 'https://img.youtube.com/vi/9pXv7YX_AyQ/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=9pXv7YX_AyQ',
    plans: ['premium', 'vip'],
  },
  {
    id: 'vid06',
    category: 'Nutrição Inteligente',
    title: '10 DICAS PARA EMAGRECER RÁPIDO E COM SAÚDE',
    description: 'Lista 10 passos para emagrecer com saúde, com ênfase na redução de gordura abdominal, incluindo dicas de alimentação, exercícios específicos e hábitos diários.',
    thumbnailUrl: 'https://img.youtube.com/vi/SXMSSscBklk/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=SXMSSscBklk',
    plans: ['premium', 'vip'],
  },
  {
    id: 'vid07',
    category: 'Mentalidade e Comportamento',
    title: 'Quer emagrecer? Veja essas 5 dicas fáceis! | MARCIO ATALLA',
    description: 'Márcio Atalla compartilha cinco dicas simples para iniciantes no processo de emagrecimento, com foco em mudanças graduais na alimentação e aumento da atividade física.',
    thumbnailUrl: 'https://img.youtube.com/vi/NtVrQKurPkw/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=NtVrQKurPkw',
    plans: ['freemium', 'premium', 'vip'],
  },
  {
    id: 'vid08',
    category: 'Nutrição Inteligente',
    title: '10 DICAS para EMAGRECER SEM GASTAR NADA!',
    description: 'Traz 10 estratégias gratuitas para perder peso, incluindo ajustes na alimentação, treinos caseiros e dicas de motivação para um "glow up" sem custos.',
    thumbnailUrl: 'https://img.youtube.com/vi/zez6XujoXL8/hqdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=zez6XujoXL8',
    plans: ['premium', 'vip'],
  }
];

export const communityPosts: CommunityTopic[] = [
    {
        id: 't001',
        topicId: 't001',
        authorId: 'p002', // Carla Dias
        authorUsername: 'Navegante_Corajoso_1234',
        title: 'Mural de Vitórias: Qual foi sua maior conquista essa semana?',
        text: 'Queria criar um espaço pra gente comemorar junto! Pra mim, foi ter conseguido caminhar 30 minutos 4 dias seguidos. E pra vocês?',
        isPinned: true,
        timestamp: sub(now, { days: 1, hours: 2 }).toISOString(),
        lastActivityTimestamp: sub(now, { hours: 5 }).toISOString(),
        commentCount: 1,
        reactions: [],
        comments: [
            {
                id: 'c001',
                commentId: 'c001',
                topicId: 't001',
                authorId: 'p001',
                authorUsername: 'Membro_Otimista_5678',
                text: 'Que demais! Parabéns! A minha foi ter resistido à sobremesa no escritório hoje.',
                timestamp: sub(now, { hours: 5 }).toISOString(),
                reactions: [],
            }
        ]
    },
    {
        id: 't002',
        topicId: 't002',
        authorId: 'p001', // Roberto Andrade
        authorUsername: 'Explorador_Determinado_9012',
        title: 'Dica pra quem tem dificuldade com água',
        text: 'Gente, eu tinha muita dificuldade em beber água. O que me ajudou foi comprar uma garrafa de 1L bonita e deixar sempre na minha mesa. Deixo a meta de beber duas daquelas por dia. Fica a dica!',
        isPinned: false,
        timestamp: sub(now, { days: 2, hours: 8 }).toISOString(),
        lastActivityTimestamp: sub(now, { days: 2, hours: 8 }).toISOString(),
        commentCount: 0,
        reactions: [],
        comments: []
    }
];
