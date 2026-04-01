import type { ProtocolStep, Perspective } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL IDs
// ─────────────────────────────────────────────────────────────────────────────
const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';
const PERFORMANCE_ID = '63e69258-ca73-4a6f-bd64-13031fa140f2';
// Evolução ('b9a33669-...') e Teste ('2412145d-...') usam mensagens padrão

// ─────────────────────────────────────────────────────────────────────────────
// PONTUAÇÃO (referência — valores reais estão em checkin-response-handler.ts)
// Peso: 60 | Planejamento: A=40 | Hidratação: A=20/B=15/C=5
// Almoço/Jantar: A=25/B=20/C=10 | Atividade: A=50 | Bem-Estar: A=20/B=15/C=5
// Meta: paciente consistente (70%) → Bronze V em 13 semanas
//       paciente dedicado (100%) → Prata I em 13 semanas
// ─────────────────────────────────────────────────────────────────────────────

// =============================================================================
// MENSAGENS PADRÃO — EVOLUÇÃO (tom educativo, crescimento, progresso mensurável)
// =============================================================================

const WEIGHIN_MESSAGES = [
    'Bom dia! É dia de check-in semanal. Responda apenas com o número do seu peso em jejum (ex: 85). 📊',
    'Segunda-feira é dia de acompanhamento! Responda apenas com o número do seu peso em jejum (ex: 85).',
    'Vamos acompanhar seu progresso! Responda com o número do seu peso em jejum (ex: 85). A tendência ao longo das semanas é o que importa.',
    'Check-in semanal! Responda apenas com o número do peso em jejum (ex: 85) para registrarmos sua evolução.',
    'Hora do registro semanal. Responda com o número do peso em jejum (ex: 85) — cada medição conta! 💪',
];

const PLANNING_MESSAGES = [
    'Vamos começar a semana com o pé direito! Você já planejou suas atividades físicas e refeições principais para os próximos dias? Responda apenas com a letra:\n\nA) Sim, tudo planejado!\nB) Não, ainda não parei para isso.',
    'Semana nova, nova oportunidade! Quem planeja chega mais longe. Você organizou suas refeições e treinos para esta semana? Responda apenas com a letra:\n\nA) Sim, já está organizado!\nB) Ainda não, mas vou fazer isso hoje.',
    'O segredo dos resultados está no planejamento. Você reservou um momento para planejar refeições e exercícios desta semana? Responda apenas com a letra:\n\nA) Sim, já planejei!\nB) Não ainda, mas quero começar.',
    'Segunda-feira é o melhor dia para planejar a semana inteira. Suas refeições e atividades já estão no radar? Responda apenas com a letra:\n\nA) Sim, semana organizada!\nB) Não, preciso fazer isso.',
    'Planejar evita decisões impulsivas. Você dedicou alguns minutos para organizar suas refeições e movimentos desta semana? Responda apenas com a letra:\n\nA) Sim, está planejado!\nB) Ainda não, mas vou agora.',
];

const HYDRATION_MESSAGES = [
    'Hora de revisar a hidratação do dia! 💧 Como você se saiu com a meta de água hoje? Responda apenas com a letra:\n\nA) Bati a meta!\nB) Cheguei perto.\nC) Esqueci bastante.',
    'Água é vida! 💧 Como foi sua hidratação hoje? Responda apenas com a letra:\n\nA) Meta batida, bebi tudo!\nB) Bebi um pouco menos do que o ideal.\nC) Pouco líquido hoje, preciso melhorar.',
    'Checando a hidratação do dia! Cada copo conta para seu metabolismo e disposição. 💧 Responda apenas com a letra:\n\nA) Hidratado(a) de verdade hoje!\nB) Razoável, quase atingi a meta.\nC) Esqueci bastante hoje.',
    'Seu corpo é composto por 60% de água — hidratar é prioridade! Como foi hoje? Responda apenas com a letra:\n\nA) Bati a meta de água!\nB) Fiquei abaixo, mas me esforcei.\nC) Não me lembrei de beber o suficiente.',
    'Encerrando o dia com o check-in de hidratação! 💧 Responda apenas com a letra:\n\nA) Meta de água atingida!\nB) Quase, faltou pouco.\nC) Fiquei muito aquém da meta.',
];

const WELLBEING_SLEEP_MESSAGES = [
    'Como você avalia a sua noite de sono de ontem? Responda apenas com a letra:\n\nA) Boa, me sinto descansado(a).\nB) Razoável, acordei algumas vezes.\nC) Ruim, não consegui descansar.',
    'O sono regula hormônios essenciais — incluindo os do apetite. Como dormiu ontem? Responda apenas com a letra:\n\nA) Muito bem, acordei disposto(a).\nB) Mais ou menos, sono fragmentado.\nC) Mal, acordei cansado(a).',
    'Recuperação começa com o sono. Como foi a sua noite? Responda apenas com a letra:\n\nA) Ótima, dormi profundamente.\nB) Razoável, mas não foi o suficiente.\nC) Ruim, tive dificuldade para dormir.',
    'Dormir bem é tão importante quanto se alimentar bem. Como foi seu sono ontem? Responda apenas com a letra:\n\nA) Dormi bem e estou renovado(a).\nB) Sono regular, não foi o melhor.\nC) Noite difícil, me sinto cansado(a).',
    'O descanso é parte do protocolo! Como avalia sua noite de sono? Responda apenas com a letra:\n\nA) Excelente, sono reparador.\nB) Mediano, poderia ter sido melhor.\nC) Ruim, não descansei bem.',
];

const WELLBEING_SUNDAY_MESSAGES = [
    'Fim de semana é para recarregar! Como você está se sentindo hoje? Responda apenas com a letra:\n\nA) Ótimo(a), energias recarregadas!\nB) Bem, mas poderia ser melhor.\nC) Cansado(a) ou estressado(a).',
    'Domingo de check-in! O equilíbrio emocional impacta diretamente seus resultados. Como está seu bem-estar hoje? Responda apenas com a letra:\n\nA) Muito bem, renovado(a) para a semana!\nB) Razoável, ainda preciso de descanso.\nC) Estressado(a) ou desanimado(a).',
    'Como seu corpo e mente chegaram a este domingo? Responda apenas com a letra:\n\nA) Ótimo(a), me sinto equilibrado(a).\nB) Bem, com pequenas tensões.\nC) Esgotado(a) ou ansioso(a).',
    'O stress elevado aumenta o cortisol, que impacta o peso e o metabolismo. Como você está hoje? Responda apenas com a letra:\n\nA) Tranquilo(a) e bem disposto(a).\nB) Um pouco cansado(a), mas ok.\nC) Estressado(a) ou com o humor baixo.',
    'Cuidar da mente é cuidar do corpo. Como você avalia seu bem-estar neste domingo? Responda apenas com a letra:\n\nA) Recarregado(a) e motivado(a)!\nB) Regular, preciso de mais descanso.\nC) Baixo astral ou muito cansado(a).',
];

const LUNCH_MESSAGES = [
    'Como foi seu almoço hoje em relação ao plano? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.',
    'Hora do check-in de almoço! A refeição do meio-dia é fundamental para manter energia e evitar beliscar à tarde. Como foi? Responda apenas com a letra:\n\nA) Refeição dentro do plano!\nB) Adaptei alguns itens, mas equilibrado.\nC) Saí do plano hoje.',
    'Um bom almoço define a segunda metade do seu dia. Como você se saiu hoje? Responda apenas com a letra:\n\nA) Ótimo, prato colorido e equilibrado!\nB) Razoável, poderia ter sido melhor.\nC) Hoje não consegui seguir o plano.',
    'Check-in de almoço! Lembre-se: metade do prato deve ser de vegetais. Como foi a refeição de hoje? Responda apenas com a letra:\n\nA) Segui o plano com capricho!\nB) Segui parcialmente.\nC) Não consegui seguir hoje.',
    'Como foi seu almoço? Uma refeição equilibrada ao meio-dia ajuda a controlar a fome no restante do dia. Responda apenas com a letra:\n\nA) Almoço excelente, no plano!\nB) Fiz adaptações, mas foi equilibrado.\nC) Fugi do plano hoje.',
];

const DINNER_MESSAGES = [
    'Chegando ao fim do dia! Como foi seu jantar? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.',
    'Check-in do jantar! À noite, o ideal é uma refeição mais leve para facilitar o sono e a recuperação. Como foi hoje? Responda apenas com a letra:\n\nA) Jantar leve e dentro do plano!\nB) Comi um pouco mais do que o ideal.\nC) Saí bastante do plano hoje.',
    'Como foi o jantar de hoje? Refeições noturnas mais leves favorecem o metabolismo. Responda apenas com a letra:\n\nA) Jantar no plano, sem excessos!\nB) Me permiti um pouco mais, mas ok.\nC) Saí totalmente do plano.',
    'Encerrando a semana com o check-in de jantar. Refeições noturnas mais leves favorecem o metabolismo. Como foi? Responda apenas com a letra:\n\nA) Refeição leve e equilibrada!\nB) Um pouco mais pesado que o ideal.\nC) Não consegui seguir o plano esta noite.',
    'Fim de dia, hora do balanço! Como foi seu jantar? Responda apenas com a letra:\n\nA) Jantar certinho, dentro do plano.\nB) Fiz algumas adaptações aceitáveis.\nC) Fugi do plano esta noite.',
];

const ACTIVITY_WEDNESDAY_MESSAGES = [
    'É dia de movimento! Você praticou alguma atividade física hoje? Responda apenas com a letra:\n\nA) Sim, treino feito! 💪\nB) Não consegui hoje.',
    'Quarta é dia de manter o ritmo! Seu corpo agradece o movimento regular. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, me movi hoje!\nB) Hoje não foi possível.',
    'O movimento regular melhora o metabolismo, o humor e o sono. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Não consegui encaixar hoje.',
    'Check-in de quarta! Qualquer movimento conta — caminhada, escadas, treino. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, fiz minha atividade do dia!\nB) Hoje não, mas amanhã retomo.',
    'Meados da semana e o movimento segue em dia? Responda apenas com a letra:\n\nA) Sim, treino realizado com sucesso!\nB) Não hoje, foi um dia agitado.',
];

const ACTIVITY_SATURDAY_MESSAGES = [
    'Sábado ativo! Você se movimentou hoje? Responda apenas com a letra:\n\nA) Sim, me movimentei!\nB) Hoje foi dia de descanso.',
    'Final de semana ativo é ouro para o seu protocolo! Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Optei por descansar hoje.',
    'Sábado é uma ótima oportunidade para um treino diferente ou uma caminhada ao ar livre. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, me exercitei!\nB) Descansei hoje, retomarei amanhã.',
    'O descanso também é parte do plano — desde que estratégico. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, atividade física feita!\nB) Hoje foi dia de recuperação.',
    'Check-in de sábado! Movimento no fim de semana mantém o metabolismo ativo. Como foi? Responda apenas com a letra:\n\nA) Sim, me exercitei hoje!\nB) Descansei, estava precisando.',
];

// =============================================================================
// MENSAGENS FUNDAMENTOS — tom gentil, acolhedor, celebra pequenas vitórias
// =============================================================================

const FUNDAMENTOS_WEIGHIN = [
    'Chegou o check-in de peso desta semana! 🌅 Não importa o número — o que importa é você estar aqui, cuidando de si. Responda com o número do seu peso em jejum (ex: 85).',
    'Segunda-feira, dia de se pesar! O peso flutua naturalmente — o que conta é a tendência ao longo das semanas. Responda com o número em jejum (ex: 85).',
    'Hora do registro semanal. Pese-se antes do café e responda com o número (ex: 85). Cada semana registrada é uma semana de cuidado com você. 💪',
    'Mais uma semana, mais um dado para a sua jornada! Responda com o número do peso em jejum (ex: 85). Sem julgamento — só registro e progresso.',
    'Check-in de peso! A consistência de acompanhar é mais valiosa que qualquer número isolado. Responda com o peso em jejum (ex: 85). 📊',
];

const FUNDAMENTOS_PLANNING = [
    'Planejar é se dar uma chance! 📋 Não precisa ser perfeito — só precisa ser intencional. Você organizou sua alimentação e movimento para a semana? Responda apenas com a letra:\n\nA) Sim, tenho um plano!\nB) Ainda não, mas vou fazer isso agora.',
    'Um minutinho de planejamento pode mudar sua semana inteira. 😊 Você já pensou no que vai comer e como vai se mover nos próximos dias? Responda apenas com a letra:\n\nA) Sim, já pensei!\nB) Ainda não, mas vou agora.',
    'Quem planeja chega mais perto. Você reservou um tempinho para se organizar esta semana — refeições e atividade física? Responda apenas com a letra:\n\nA) Sim, estou preparado(a)!\nB) Ainda não, mas vou fazer.',
    'Planejar é um ato de cuidado com você mesmo(a). Você já deu uma olhada nos próximos dias — alimentação e movimento? Responda apenas com a letra:\n\nA) Sim, semana planejada!\nB) Não ainda, mas vou fazer agora.',
    'Cada semana planejada é uma vitória antes de começar! Como está sua organização para os próximos dias? Responda apenas com a letra:\n\nA) Pronto(a), tudo planejado!\nB) Ainda não — esse é o melhor momento.',
];

const FUNDAMENTOS_HYDRATION = [
    'Hora de checar a hidratação do dia! 💧 Beber água é o hábito mais simples e mais poderoso. Como foi hoje? Responda apenas com a letra:\n\nA) Bati a meta de água!\nB) Tomei bastante, mas faltou um pouco.\nC) Esqueci de me hidratar hoje.',
    'Água é o combustível do seu corpo! 💧 Pequenos goles ao longo do dia fazem toda a diferença. Como foi sua hidratação hoje? Responda apenas com a letra:\n\nA) Meta de água atingida!\nB) Quase lá, mas não o suficiente.\nC) Pouca água hoje, preciso melhorar.',
    'Check-in de hidratação! 💧 Às vezes a sede chega tarde — por isso a meta diária ajuda. Como foi hoje? Responda apenas com a letra:\n\nA) Hidratado(a) de verdade!\nB) Razoável, faltou um pouco.\nC) Não bebi o suficiente hoje.',
    'Seu corpo agradece cada copo de água! 💧 Como foi a hidratação hoje? Responda apenas com a letra:\n\nA) Meta batida, ótima hidratação!\nB) Fiquei abaixo, mas me esforcei.\nC) Hoje não foi o meu melhor dia.',
    'Encerrando o dia com o check-in de água. 💧 Como foi? Responda apenas com a letra:\n\nA) Meta de hidratação atingida!\nB) Quase, faltou pouco.\nC) Preciso melhorar amanhã.',
];

const FUNDAMENTOS_WELLBEING_SLEEP = [
    'Bom dia! Como você dormiu ontem à noite? 🌙 O sono é um dos pilares da saúde que mais afeta o peso e a disposição. Responda apenas com a letra:\n\nA) Dormi bem e estou disposto(a)!\nB) Sono razoável, mas acordei um pouco cansado(a).\nC) Noite difícil, me sinto esgotado(a).',
    'O sono é quando seu corpo se recupera de tudo que fez no dia. 🌙 Como foi ontem à noite? Responda apenas com a letra:\n\nA) Boa noite de sono, acordei bem!\nB) Sono regular, não foi o ideal.\nC) Dormi mal, estou cansado(a).',
    'Uma boa noite de sono é um presente para si mesmo(a). 🌙 Como você avalia seu sono de ontem? Responda apenas com a letra:\n\nA) Dormi profundamente, ótimo!\nB) Razoável, alguns despertares.\nC) Noite ruim, pouco descanso.',
    'Quando dormimos bem, tudo fica mais fácil — inclusive as escolhas alimentares. 🌙 Como foi seu sono? Responda apenas com a letra:\n\nA) Excelente, me sinto renovado(a)!\nB) Regular, mas ok.\nC) Ruim, preciso melhorar o sono.',
    'Sono de qualidade é o alicerce de todo o resto. 🌙 Como você dormiu ontem? Responda apenas com a letra:\n\nA) Muito bem, sono reparador!\nB) Razoável, poderia ter sido melhor.\nC) Não descansou bem esta noite.',
];

const FUNDAMENTOS_WELLBEING_SUNDAY = [
    'Domingo de check-in! ☀️ Como seu corpo e sua mente chegaram a este dia? Responda apenas com a letra:\n\nA) Ótimo(a), energizado(a) para a semana!\nB) Bem, mas poderia me sentir melhor.\nC) Cansado(a) ou um pouco sobrecarregado(a).',
    'Fim de semana de cuidado com você! 😊 Como está seu bem-estar hoje? Responda apenas com a letra:\n\nA) Ótimo(a), recarregado(a)!\nB) Razoável, ainda preciso de descanso.\nC) Me sinto cansado(a) ou estressado(a).',
    'Domingo é um bom dia para fazer um balanço da semana. Como você está? Responda apenas com a letra:\n\nA) Muito bem, equilíbrio em dia!\nB) Bem, com alguns altos e baixos.\nC) Esgotado(a) ou ansioso(a).',
    'Como você chegou a este domingo? 🌿 Cuidar da mente é tão importante quanto cuidar do corpo. Responda apenas com a letra:\n\nA) Bem e motivado(a) para a próxima semana!\nB) Regular, mas seguindo em frente.\nC) Precisando de mais descanso e cuidado.',
    'Domingo, dia de renovação! 🌅 Como está seu bem-estar hoje? Responda apenas com a letra:\n\nA) Me sinto bem e pronto(a) para mais!\nB) Bem, mas um pouco cansado(a) ainda.\nC) Baixo astral ou exausto(a).',
];

const FUNDAMENTOS_LUNCH = [
    'Check-in de almoço! 🥗 O almoço é a refeição que define a segunda metade do seu dia. Como foi? Responda apenas com a letra:\n\nA) Segui o plano com satisfação!\nB) Fiz algumas trocas, mas fiquei equilibrado(a).\nC) Hoje não consegui seguir o plano.',
    'Hora de registrar o almoço! 😊 Cada refeição bem feita é uma pequena vitória. Como foi? Responda apenas com a letra:\n\nA) Almoço dentro do plano, ótimo!\nB) Adaptei alguns itens, mas ok.\nC) Saí do plano hoje.',
    'Check-in de almoço! 🥗 Lembre: não existe refeição perfeita, existe equilíbrio. Como foi? Responda apenas com a letra:\n\nA) Refeição de acordo com o plano!\nB) Fiz adaptações razoáveis.\nC) Não foi o melhor almoço.',
    'Como foi o almoço de hoje? 🍽️ Uma refeição colorida faz toda a diferença no dia. Responda apenas com a letra:\n\nA) Prato caprichado e no plano!\nB) Razoável, poderia ter sido melhor.\nC) Fugi do plano hoje.',
    'Registrando o almoço! 🥗 Como você se saiu hoje? Responda apenas com a letra:\n\nA) Segui o plano, me orgulho!\nB) Fiz algumas adaptações aceitas.\nC) Hoje não foi dentro do plano.',
];

const FUNDAMENTOS_DINNER = [
    'Check-in de jantar! 🌙 Uma refeição mais leve à noite ajuda o sono e a recuperação. Como foi? Responda apenas com a letra:\n\nA) Jantar equilibrado, dentro do plano!\nB) Comi um pouco mais que o ideal, mas ok.\nC) Saí bastante do plano esta noite.',
    'Chegamos ao fim do dia! 🌙 Como foi seu jantar? Responda apenas com a letra:\n\nA) Jantar leve e no plano, ótimo!\nB) Fiz algumas adaptações aceitas.\nC) Fugi do plano esta noite.',
    'Registrando o jantar. 🌙 Noites mais leves facilitam o sono e a recuperação. Como foi? Responda apenas com a letra:\n\nA) Jantar certinho, me sinto bem!\nB) Um pouco mais pesado que o ideal.\nC) Não consegui seguir o plano.',
    'Check-in do jantar! 🌙 Como você encerrou suas refeições hoje? Responda apenas com a letra:\n\nA) Jantar no plano, dia completo!\nB) Fiz algumas trocas razoáveis.\nC) Saí do plano esta noite.',
    'Finalizando o dia! 🌙 Jantar foi como planejado? Responda apenas com a letra:\n\nA) Encerrei bem — jantar equilibrado!\nB) Adaptei um pouco, mas razoável.\nC) Precisei improvisar demais esta noite.',
];

const FUNDAMENTOS_ACTIVITY_WED = [
    'Meio de semana, hora de se mover! 🚶 Qualquer movimento conta — caminhada, escadas, alongamento. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, me movi hoje!\nB) Hoje não consegui, mas amanhã retomo.',
    'O corpo foi feito para se mover! 😊 Mesmo 10 minutinhos de caminhada fazem diferença. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Hoje não foi possível.',
    'Quarta de movimento! 🌟 Não precisa ser intenso — qualquer atividade conta. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, me exercitei hoje!\nB) Hoje não consegui encaixar.',
    'A gente nunca se arrepende de ter se exercitado! 💪 Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, atividade concluída!\nB) Não hoje, mas retomo amanhã.',
    'Meados de semana e seu corpo está pedindo movimento! 🏃 Você atendeu o chamado hoje? Responda apenas com a letra:\n\nA) Sim, treino realizado!\nB) Hoje não foi possível.',
];

const FUNDAMENTOS_ACTIVITY_SAT = [
    'Sábado ativo! ☀️ O fim de semana é uma ótima oportunidade para se mover com prazer. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, me movimentei hoje!\nB) Hoje foi dia de descanso.',
    'Final de semana e movimento combinam muito! 🌿 Uma caminhada ao ar livre já é ótimo. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Optei por descansar hoje.',
    'Sábado é para aproveitar e se cuidar! 😊 Você incluiu algum movimento hoje? Responda apenas com a letra:\n\nA) Sim, me exercitei hoje!\nB) Hoje foi meu dia de recuperação.',
    'Movimento no fim de semana mantém o ritmo! 💪 Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, atividade física feita!\nB) Descansei hoje — faz parte.',
    'Check-in de sábado! 🌟 Como foi seu dia em termos de movimento? Responda apenas com a letra:\n\nA) Sim, me exercitei com prazer!\nB) Descansei hoje, sem problema.',
];

// =============================================================================
// MENSAGENS PERFORMANCE — tom técnico, dados, mentalidade de atleta (VIP)
// =============================================================================

const PERFORMANCE_WEIGHIN = [
    'Check-in semanal de peso. Pesagem em jejum, após higiene pessoal. Responda com o número exato (ex: 85.5). Dados consistentes = ajustes precisos. 📊',
    'Segunda-feira: atualização de composição corporal. Peso em jejum (ex: 85). Mantenha o protocolo — mesma hora, mesmas condições, toda semana.',
    'Monitoramento semanal: peso em jejum, após higiene (ex: 85). A consistência na mensuração é parte do seu protocolo de alta performance.',
    'Dados de performance: peso desta semana em jejum (ex: 85). A tendência é o indicador real — não o número isolado. Registre com precisão.',
    'Atualização dos indicadores. Peso em jejum — mesma rotina de toda segunda-feira (ex: 85). Disciplina na mensuração = precisão nos ajustes.',
];

const PERFORMANCE_PLANNING = [
    'Planejamento semanal de alta performance. Refeições, treinos, recuperação e sono — tudo mapeado? Responda apenas com a letra:\n\nA) Sim, semana estruturada para resultados!\nB) Ainda não — vou estruturar agora.',
    'Performance começa no planejamento. Seus treinos, macros e horários estão definidos para esta semana? Responda apenas com a letra:\n\nA) Sim, plano de alta performance pronto!\nB) Ainda não — esse é o momento de planejar.',
    'A semana do atleta é planejada antes de começar. Você mapeou treinos, refeições estratégicas e recuperação? Responda apenas com a letra:\n\nA) Sim, semana otimizada!\nB) Ainda não — vou fazer agora.',
    'Campeões planejam com precisão. Seus treinos, janelas de refeição e metas semanais estão definidos? Responda apenas com a letra:\n\nA) Sim, 100% planejado!\nB) Ainda não — vou estruturar agora.',
    'Controle total começa com planejamento total. Refeições, treinos, recuperação — tudo na agenda desta semana? Responda apenas com a letra:\n\nA) Sim, semana de performance estruturada!\nB) Ainda não — esse é o momento certo.',
];

const PERFORMANCE_HYDRATION = [
    'Check-in de hidratação. 💧 2,5L/dia é o mínimo para performance otimizada. Como foi? Responda apenas com a letra:\n\nA) Meta de 2,5L atingida!\nB) Fiquei um pouco abaixo.\nC) Hidratação precisa melhorar.',
    'Hidratação é performance. 💧 Cada 1% de desidratação reduz capacidade física e cognitiva. Hoje? Responda apenas com a letra:\n\nA) Hidratação em dia — meta batida!\nB) Abaixo da meta, mas monitorando.\nC) Preciso focar mais na hidratação.',
    'Dados de hidratação: como foi o consumo de líquidos hoje? 💧 Responda apenas com a letra:\n\nA) Meta de hidratação atingida!\nB) Abaixo do ideal, mas no radar.\nC) Hidratação foi um ponto fraco hoje.',
    'Monitoramento de hidratação. 💧 Ideal: ~35ml/kg de peso corporal/dia. Como você se saiu? Responda apenas com a letra:\n\nA) Meta de hidratação cumprida!\nB) Faltou um pouco, vou ajustar.\nC) Preciso criar uma estratégia melhor.',
    'Encerramento do dia: hidratação. 💧 Água impacta metabolismo, recuperação muscular e cognição. Como foi? Responda apenas com a letra:\n\nA) Excelente hidratação hoje!\nB) Razoável, abaixo da meta ideal.\nC) Fraco hoje — corrigir amanhã.',
];

const PERFORMANCE_WELLBEING_SLEEP = [
    'Check-in de recuperação. 🌙 O sono é onde ocorre a síntese proteica e a consolidação metabólica. Como foi ontem? Responda apenas com a letra:\n\nA) Sono de alta qualidade — 7h+ reparador!\nB) Sono fragmentado ou abaixo de 7h.\nC) Noite ruim — recuperação comprometida.',
    'Sono = recuperação = performance. 🌙 Dormir mal aumenta cortisol e sabota resultados. Como foi ontem à noite? Responda apenas com a letra:\n\nA) Sono reparador, recuperação completa!\nB) Sono razoável, poderia ser melhor.\nC) Noite ruim, impacto no dia.',
    'Monitoramento de recuperação noturna. 🌙 Qualidade do sono impacta composição corporal. Ontem? Responda apenas com a letra:\n\nA) Excelente — sono profundo e reparador!\nB) Regular — 6-7h com alguns despertares.\nC) Comprometido — menos de 6h ou fragmentado.',
    'Recovery check: como foi seu sono? 🌙 GH e testosterona são secretados durante o sono profundo. Responda apenas com a letra:\n\nA) Sono de alta qualidade — 7h+!\nB) Razoável — precisou melhorar.\nC) Ruim — recuperação prejudicada.',
    'Performance do sono. 🌙 Atletas de elite priorizam 7-9h. Como foi ontem? Responda apenas com a letra:\n\nA) Sono excelente e reparador!\nB) Razoável, dentro do aceitável.\nC) Abaixo do ideal — ajuste necessário.',
];

const PERFORMANCE_WELLBEING_SUNDAY = [
    'Avaliação de bem-estar semanal. 🧠 Estado mental e recuperação impactam diretamente a performance. Como você está hoje? Responda apenas com a letra:\n\nA) Ótimo(a) — recuperado(a) e motivado(a)!\nB) Regular — alguma fadiga residual.\nC) Elevado estresse ou baixa energia.',
    'Check-in de estado geral. 🧠 Estresse crônico eleva cortisol e prejudica composição corporal. Como está o bem-estar? Responda apenas com a letra:\n\nA) Excelente — equilibrado(a) e renovado(a)!\nB) Razoável — alguns pontos a melhorar.\nC) Estressado(a) ou esgotado(a).',
    'Recovery de fim de semana: como está seu estado geral? 🧠 Recuperação psicológica é parte do protocolo de performance. Responda apenas com a letra:\n\nA) Totalmente recuperado(a) — pronto(a) para alta performance!\nB) Parcialmente recuperado(a).\nC) Ainda com fadiga ou estresse.',
    'Avaliação de bem-estar: domingo. 🧠 Prontidão mental = prontidão física. Como você está? Responda apenas com a letra:\n\nA) Renovado(a) e pronto(a) para alta performance!\nB) Razoável — algum desgaste ainda.\nC) Abaixo do ideal — precisa de mais recuperação.',
    'Estado de prontidão para a semana. 🧠 Como chegou a este domingo? Responda apenas com a letra:\n\nA) 100% — energia e motivação em alta!\nB) Em recuperação — precisando de ajuste.\nC) Baixo — fadiga ou estresse elevado.',
];

const PERFORMANCE_LUNCH = [
    'Check-in de almoço — protocolo de macros. 🥗 Proteína de qualidade e carga glicêmica adequada? Responda apenas com a letra:\n\nA) Almoço otimizado — macros no ponto!\nB) Adaptações pontuais — dentro do aceitável.\nC) Fora do protocolo hoje.',
    'Almoço: resultado? 🥗 Uma refeição do meio-dia estratégica potencializa treinos e controla a fome. Responda apenas com a letra:\n\nA) Refeição de alta performance — dentro do plano!\nB) Adaptações menores, mas equilibrado.\nC) Saí do protocolo nesta refeição.',
    'Check-in de almoço. 🥗 Proteína presente, vegetais no prato, controle de porção? Responda apenas com a letra:\n\nA) Refeição executada com precisão!\nB) Ajustes menores, mas aceitável.\nC) Desvio relevante do plano.',
    'Almoço: como foi a execução do protocolo? 🥗 Responda apenas com a letra:\n\nA) Almoço dentro dos parâmetros nutricionais!\nB) Pequenos desvios, dentro do tolerável.\nC) Fora do plano nesta refeição.',
    'Monitoramento de almoço. 🥗 Refeição equilibrada é a base da performance sustentada. Responda apenas com a letra:\n\nA) Almoço dentro do protocolo!\nB) Adaptações menores — ok.\nC) Saí do planejado hoje.',
];

const PERFORMANCE_DINNER = [
    'Check-in de jantar — protocolo noturno. 🌙 Refeição mais leve para otimizar GH e recuperação muscular. Como foi? Responda apenas com a letra:\n\nA) Jantar leve e dentro do protocolo!\nB) Um pouco acima do ideal, mas controlado.\nC) Saí do protocolo nesta refeição.',
    'Monitoramento de jantar. 🌙 Ingestão proteica presente, carboidratos controlados? Responda apenas com a letra:\n\nA) Jantar dentro dos parâmetros do protocolo!\nB) Pequenos ajustes, aceitável.\nC) Desvio relevante esta noite.',
    'Jantar: execução do protocolo noturno. 🌙 Proteína de absorção lenta + vegetais = recuperação otimizada. Como foi? Responda apenas com a letra:\n\nA) Executei o protocolo noturno com precisão!\nB) Adaptações menores — dentro do tolerável.\nC) Fora do protocolo esta noite.',
    'Check-in de jantar. 🌙 Refeição noturna é parte da estratégia de composição corporal. Como foi? Responda apenas com a letra:\n\nA) Jantar dentro do protocolo!\nB) Pequenos desvios — ajuste amanhã.\nC) Fora do planejado esta noite.',
    'Encerramento nutricional do dia. 🌙 Jantar de qualidade favorece recuperação e controle hormonal. Responda apenas com a letra:\n\nA) Jantar de alta performance — plano cumprido!\nB) Ajustes menores — aceitável.\nC) Saí do protocolo nesta refeição.',
];

const PERFORMANCE_ACTIVITY_WED = [
    'Check-in de treino — quarta-feira. 💪 Consistência no meio de semana sustenta a progressão. Treinou hoje? Responda apenas com a letra:\n\nA) Sim, treino executado com intensidade!\nB) Hoje não foi possível treinar.',
    'Mid-week training check. 💪 O treino de hoje constrói os resultados de amanhã. Como foi? Responda apenas com a letra:\n\nA) Sim, sessão de treino concluída!\nB) Não treinei hoje.',
    'Quarta: check-in de performance física. 💪 Manteve a frequência de treino? Responda apenas com a letra:\n\nA) Sim, treino de alta performance realizado!\nB) Treino não realizado hoje.',
    'Consistência é o diferencial dos resultados. 💪 Você treinou hoje como planejado? Responda apenas com a letra:\n\nA) Sim, executei o treino do dia!\nB) Não treinei — retomo na próxima sessão.',
    'Check-in de treino. 💪 Alta performance exige frequência. Você se moveu hoje com intenção? Responda apenas com a letra:\n\nA) Sim, treino concluído!\nB) Não treinei hoje.',
];

const PERFORMANCE_ACTIVITY_SAT = [
    'Treino de fim de semana. 💪 Sábado pode ser sua sessão mais livre — intensidade ou recuperação ativa. Você treinou? Responda apenas com a letra:\n\nA) Sim, treino realizado!\nB) Hoje optei por descanso ativo ou recuperação.',
    'Sábado de performance. 💪 Consistência nos fins de semana diferencia atletas de alto rendimento. Você se exercitou? Responda apenas com a letra:\n\nA) Sim, sessão concluída!\nB) Recuperação ativa ou descanso estratégico.',
    'Check-in de sábado. 💪 Como foi sua sessão de treino hoje? Responda apenas com a letra:\n\nA) Sim, treino de performance realizado!\nB) Dia de recuperação — sem treino intenso.',
    'Performance no fim de semana. 💪 Você manteve a consistência? Responda apenas com a letra:\n\nA) Sim, treino do fim de semana concluído!\nB) Optei por recuperação hoje.',
    'Final de semana de alta performance. 💪 Treino realizado ou recuperação estratégica? Responda apenas com a letra:\n\nA) Sim, treinei hoje!\nB) Recuperação — necessária para performance.',
];

// =============================================================================
// FACTORY — monta os steps com as mensagens do protocolo escolhido
// =============================================================================

function buildSteps(
    weighin: string[],
    planning: string[],
    hydration: string[],
    sleepWellbeing: string[],
    sundayWellbeing: string[],
    lunch: string[],
    dinner: string[],
    activityWed: string[],
    activitySat: string[],
): (ProtocolStep & { perspective: Perspective })[] {
    return [
        // Pesagem semanal (toda segunda — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 1,
            title: `[GAMIFICAÇÃO] Check-in Semanal de Peso (Semana ${i + 1})`,
            message: i === 0
                ? 'Bem-vindo(a) ao seu protocolo! Para registrarmos nosso ponto de partida, responda apenas com o número do seu peso em jejum (ex: 85). 📊'
                : weighin[i % weighin.length],
            perspective: 'disciplina' as Perspective,
        })),

        // Planejamento semanal (toda segunda — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 1,
            title: `[GAMIFICAÇÃO] Planejamento Semanal (Semana ${i + 1})`,
            message: planning[i % planning.length],
            perspective: 'disciplina' as Perspective,
        })),

        // Hidratação terça (dia 2, 9, 16...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 2,
            title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
            message: hydration[i % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Hidratação quinta (dia 4, 11, 18...) — offset de 2
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 4,
            title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
            message: hydration[(i + 2) % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Hidratação sábado (dia 6, 13, 20...) — offset de 4
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 6,
            title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
            message: hydration[(i + 4) % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Bem-estar sono (toda quinta — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 4,
            title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
            message: sleepWellbeing[i % sleepWellbeing.length],
            perspective: 'bemEstar' as Perspective,
        })),

        // Bem-estar domingo (todo domingo — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 7,
            title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
            message: sundayWellbeing[i % sundayWellbeing.length],
            perspective: 'bemEstar' as Perspective,
        })),

        // Almoço (toda terça — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 2,
            title: `[GAMIFICAÇÃO] Check-in de Almoço (Semana ${i + 1})`,
            message: lunch[i % lunch.length],
            perspective: 'alimentacao' as Perspective,
        })),

        // Jantar (toda sexta — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 5,
            title: `[GAMIFICAÇÃO] Check-in de Jantar (Semana ${i + 1})`,
            message: dinner[i % dinner.length],
            perspective: 'alimentacao' as Perspective,
        })),

        // Atividade quarta (dia 3, 10, 17...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 3,
            title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
            message: activityWed[i % activityWed.length],
            perspective: 'movimento' as Perspective,
        })),

        // Atividade sábado (dia 6, 13, 20...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 6,
            title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
            message: activitySat[i % activitySat.length],
            perspective: 'movimento' as Perspective,
        })),
    ];
}

// =============================================================================
// EXPORTS
// =============================================================================

/** Steps padrão: Evolução + Teste (tom educativo, crescimento) */
export const mandatoryGamificationSteps = buildSteps(
    WEIGHIN_MESSAGES, PLANNING_MESSAGES, HYDRATION_MESSAGES,
    WELLBEING_SLEEP_MESSAGES, WELLBEING_SUNDAY_MESSAGES,
    LUNCH_MESSAGES, DINNER_MESSAGES,
    ACTIVITY_WEDNESDAY_MESSAGES, ACTIVITY_SATURDAY_MESSAGES,
);

/** Steps Fundamentos (tom gentil, acolhedor, beginner-friendly) */
export const fundamentosGamificationSteps = buildSteps(
    FUNDAMENTOS_WEIGHIN, FUNDAMENTOS_PLANNING, FUNDAMENTOS_HYDRATION,
    FUNDAMENTOS_WELLBEING_SLEEP, FUNDAMENTOS_WELLBEING_SUNDAY,
    FUNDAMENTOS_LUNCH, FUNDAMENTOS_DINNER,
    FUNDAMENTOS_ACTIVITY_WED, FUNDAMENTOS_ACTIVITY_SAT,
);

/** Steps Performance (tom técnico, dados, mentalidade de atleta — VIP) */
export const performanceGamificationSteps = buildSteps(
    PERFORMANCE_WEIGHIN, PERFORMANCE_PLANNING, PERFORMANCE_HYDRATION,
    PERFORMANCE_WELLBEING_SLEEP, PERFORMANCE_WELLBEING_SUNDAY,
    PERFORMANCE_LUNCH, PERFORMANCE_DINNER,
    PERFORMANCE_ACTIVITY_WED, PERFORMANCE_ACTIVITY_SAT,
);

/**
 * Retorna os steps de gamificação corretos para cada protocolo.
 * Fundamentos → tom acolhedor
 * Performance → tom técnico/VIP
 * Evolução / Teste / outros → tom padrão educativo
 */
export function getGamificationSteps(protocolId: string): (ProtocolStep & { perspective: Perspective })[] {
    if (protocolId === FUNDAMENTOS_ID) return fundamentosGamificationSteps;
    if (protocolId === PERFORMANCE_ID) return performanceGamificationSteps;
    return mandatoryGamificationSteps;
}
