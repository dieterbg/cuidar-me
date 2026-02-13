import type { Protocol } from '../types';

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
            { day: 32, title: 'Variando a Atividade Física', message: 'Que tal variar a caminhada de hoje? Tente um caminho novo ou ouça um podcast. Manter a mente engajada ajuda a criar o hábito.' },
            { day: 34, title: 'O Poder das Fibras', message: 'Alimentos ricos em fibras (aveia, feijão, maçã) ajudam na saciedade. Sua meta hoje é incluir uma fonte de fibra em seu café da manhã.' },
            { day: 37, title: 'Escala da Fome', message: 'Antes de comer, se pergunte de 0 a 10, qual o seu nível de fome? Isso te ajuda a diferenciar fome física de vontade de comer.' },
            { day: 39, title: 'Planejando as Refeições', message: 'Planejar as refeições da semana no domingo pode economizar tempo e evitar decisões ruins de última hora. Que tal tentar planejar 3 dias?' },
            { day: 42, title: 'Bebidas Calóricas', message: 'Fique de olho nas calorias líquidas! Refrigerantes, sucos industrializados e cafés adoçados podem sabotar seu progresso. Prefira água, chás e café sem açúcar.' },
            { day: 44, title: 'Lidando com o Estresse', message: 'O estresse pode aumentar o cortisol e a vontade de comer. Encontre uma válvula de escape saudável: meditação, um hobby, ou uma conversa com um amigo.' },
            { day: 46, title: 'Revisão de Meio de Percurso', message: 'Metade do caminho! Como você se sente em relação ao início? O que está mais fácil agora?' },
            { day: 49, title: 'O Mito do "Pode Tudo"', message: 'Cuidado com o pensamento "já que saí da dieta, vou chutar o balde". Uma refeição fora do plano não anula seu progresso. Apenas retome na próxima.' },
            { day: 51, title: 'Proteína no Café da Manhã', message: 'Incluir uma fonte de proteína como ovos ou iogurte no café da manhã ajuda a manter a saciedade por mais tempo. Experimente amanhã!' },
            { day: 53, title: 'A Importância do Descanso', message: 'O descanso é tão importante quanto o treino. É durante o sono que seu corpo se recupera e constrói músculos. Priorize seu sono!' },
            { day: 56, title: 'Coma Devagar', message: 'Seu cérebro leva cerca de 20 minutos para registrar que você está satisfeito. Comer devagar é uma ferramenta poderosa para controlar as porções.' },
            { day: 58, title: 'Organizando a Geladeira', message: 'Deixe frutas e vegetais lavados e picados em potes transparentes na altura dos olhos. Deixe os alimentos menos saudáveis menos visíveis.' },
            { day: 60, title: 'Fim do Mês 2', message: 'Dois meses de dedicação! Você está cada vez mais perto de consolidar esses hábitos para a vida toda. Sinta orgulho da sua jornada!' },

            // Month 3: Lifestyle
            { day: 62, title: 'Cozinhando em Casa', message: 'Cozinhar em casa te dá total controle sobre os ingredientes. Desafio: prepare uma refeição hoje que você normalmente pediria por delivery.' },
            { day: 64, title: 'Comunidade de Apoio', message: 'Lembre-se da nossa comunidade no portal. Compartilhar uma dificuldade ou uma vitória pode te dar um novo ânimo!' },
            { day: 67, title: 'Visualizando o Futuro', message: 'Feche os olhos e se imagine daqui a 1 ano com seus novos hábitos. Como você se sente? Use essa visão como combustível.' },
            { day: 70, title: 'Reconhecendo Gatilhos', message: 'Qual situação te faz sair do plano? Tédio? Cansaço? Identificar os gatilhos é o primeiro passo para criar um plano de ação.' },
            { day: 72, title: 'Coma até 80% Satisfeito', message: 'Experimente parar de comer quando se sentir 80% satisfeito, em vez de completamente cheio. É uma prática oriental que ajuda muito no controle de peso.' },
            { day: 74, title: 'Planejamento para Viagens', message: 'Vai viajar? Leve lanches saudáveis (castanhas, frutas secas), pesquise restaurantes com opções leves no seu destino e mantenha-se hidratado.' },
            { day: 77, title: 'Amigo do Movimento', message: 'Convide um amigo ou familiar para uma caminhada. Ter companhia torna o exercício mais prazeroso e aumenta o compromisso.' },
            { day: 80, title: 'Recompensas não alimentares', message: 'Cumpriu suas metas da semana? Se recompense com algo que não seja comida: um banho relaxante, um episódio da sua série favorita, um novo livro.' },
            { day: 83, title: 'Mantendo a Motivação', message: 'Releia o motivo pelo qual você começou esta jornada. Conectar-se com seu "porquê" é uma fonte poderosa de motivação.' },
            { day: 85, title: 'O Hábito Angular', message: 'Muitas vezes, um único hábito (como se exercitar de manhã) desencadeia uma série de outras boas decisões ao longo do dia. Qual é o seu?' },
            { day: 88, title: 'Véspera da Conclusão', message: 'Amanhã completamos 90 dias. Reflita sobre o hábito mais importante que você construiu e que irá levar para o resto da sua vida.' },
            { day: 90, title: 'Conclusão do Protocolo!', message: 'PARABÉNS! Você completou os 90 dias do Protocolo Fundamentos. Você provou para si mesmo que é capaz de construir hábitos saudáveis e duradouros. A jornada continua e estamos aqui para te apoiar!' },
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
