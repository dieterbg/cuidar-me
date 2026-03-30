import type { ProtocolStep, Perspective } from '../types';

// --- MANDATORY GAMIFICATION MESSAGES ---
// These steps are programmatically injected into every active protocol.
// They follow a weekly cadence for the first 13 weeks (approx. 90 days).
// Each check-in type rotates through multiple message variations to prevent fatigue.

// ── PESAGEM SEMANAL ────────────────────────────────────────────────────────────
const WEIGHIN_MESSAGES = [
    'Bom dia! É dia de check-in semanal. Informe seu peso em jejum para registrarmos sua evolução. 📊',
    'Segunda-feira é dia de acompanhamento! Como está a balança esta semana? Me informe seu peso em jejum.',
    'Vamos acompanhar seu progresso! Informe seu peso de hoje em jejum. Lembre-se: a tendência ao longo das semanas é o que importa, não o número isolado.',
    'Check-in semanal! O peso em jejum de hoje me ajuda a acompanhar sua evolução com precisão. Pode me informar?',
    'Hora do nosso registro semanal. Informe seu peso em jejum — cada medição é um dado valioso da sua jornada. 💪',
];

// ── PLANEJAMENTO SEMANAL ───────────────────────────────────────────────────────
const PLANNING_MESSAGES = [
    'Vamos começar a semana com o pé direito! Você já planejou suas atividades físicas e refeições principais para os próximos dias? Responda apenas com a letra:\n\nA) Sim, tudo planejado!\nB) Não, ainda não parei para isso.',
    'Semana nova, nova oportunidade! Quem planeia chega mais longe. Você organizou suas refeições e treinos para esta semana? Responda apenas com a letra:\n\nA) Sim, já está organizado!\nB) Ainda não, mas vou fazer isso hoje.',
    'O segredo dos que têm resultados está no planejamento. Você reservou um momento para planejar refeições e exercícios desta semana? Responda apenas com a letra:\n\nA) Sim, já planejei!\nB) Não ainda, mas quero começar.',
    'Segunda-feira é o melhor dia para planejar a semana inteira. Suas refeições e atividades já estão no radar? Responda apenas com a letra:\n\nA) Sim, semana organizada!\nB) Não, preciso fazer isso.',
    'Planejar evita decisões impulsivas. Você dedicou alguns minutos para organizar suas refeições e movimentos desta semana? Responda apenas com a letra:\n\nA) Sim, está planejado!\nB) Ainda não, mas vou agora.',
];

// ── HIDRATAÇÃO ─────────────────────────────────────────────────────────────────
const HYDRATION_MESSAGES = [
    'Hora de revisar a hidratação do dia! 💧 Como você se saiu com a meta de água hoje? Responda apenas com a letra:\n\nA) Bati a meta!\nB) Cheguei perto.\nC) Esqueci bastante.',
    'Água é vida! 💧 Como foi sua hidratação hoje? Responda apenas com a letra:\n\nA) Meta batida, bebi tudo!\nB) Bebi um pouco menos do que o ideal.\nC) Pouco líquido hoje, preciso melhorar.',
    'Checando a hidratação do dia! Cada copo conta para o seu metabolismo e disposição. 💧 Responda apenas com a letra:\n\nA) Hidratada(o) de verdade hoje!\nB) Razoável, quase atingi a meta.\nC) Esqueci bastante hoje.',
    'Seu corpo é composto por 60% de água — hidratar é prioridade! Como foi hoje? Responda apenas com a letra:\n\nA) Bati a meta de água!\nB) Fiquei abaixo, mas me esforcei.\nC) Não me lembrei de beber o suficiente.',
    'Encerrando o dia com o check-in de hidratação! 💧 Responda apenas com a letra:\n\nA) Meta de água atingida!\nB) Quase, faltou pouco.\nC) Fiquei muito aquém da meta.',
];

// ── BEM-ESTAR — SONO (QUINTA) ──────────────────────────────────────────────────
const WELLBEING_SLEEP_MESSAGES = [
    'Como você avalia a sua noite de sono de ontem? Responda apenas com a letra:\n\nA) Boa, me sinto descansado(a).\nB) Razoável, acordei algumas vezes.\nC) Ruim, não consegui descansar.',
    'O sono regula hormônios essenciais — incluindo os do apetite. Como dormiu ontem? Responda apenas com a letra:\n\nA) Muito bem, acordei disposto(a).\nB) Mais ou menos, sono fragmentado.\nC) Mal, acordei cansado(a).',
    'Recuperação começa com o sono. Como foi a sua noite? Responda apenas com a letra:\n\nA) Ótima, dormi profundamente.\nB) Razoável, mas não foi o suficiente.\nC) Ruim, tive dificuldade para dormir.',
    'Dormir bem é tão importante quanto se alimentar bem. Como foi seu sono ontem à noite? Responda apenas com a letra:\n\nA) Dormi bem e estou renovado(a).\nB) Sono regular, não foi o melhor.\nC) Noite difícil, me sinto cansado(a).',
    'O descanso é parte do protocolo! Como avalia sua noite de sono? Responda apenas com a letra:\n\nA) Excelente, sono reparador.\nB) Mediano, poderia ter sido melhor.\nC) Ruim, não descansei bem.',
];

// ── BEM-ESTAR — FIM DE SEMANA (DOMINGO) ───────────────────────────────────────
const WELLBEING_SUNDAY_MESSAGES = [
    'Fim de semana é para relaxar! Como você está se sentindo hoje? Responda apenas com a letra:\n\nA) Ótimo(a), energias recarregadas!\nB) Bem, mas poderia ser melhor.\nC) Cansado(a) ou estressado(a).',
    'Domingo de check-in! O equilíbrio emocional impacta diretamente seus resultados. Como está seu bem-estar hoje? Responda apenas com a letra:\n\nA) Muito bem, renovado(a) para a semana!\nB) Razoável, ainda preciso de descanso.\nC) Estressado(a) ou desanimado(a).',
    'Como seu corpo e mente chegaram a este domingo? Responda apenas com a letra:\n\nA) Ótimo(a), me sinto equilibrado(a).\nB) Bem, com pequenas tensões.\nC) Esgotado(a) ou ansioso(a).',
    'O stress elevado aumenta o cortisol, que impacta o peso e o metabolismo. Como você está hoje? Responda apenas com a letra:\n\nA) Tranquilo(a) e bem disposto(a).\nB) Um pouco cansado(a), mas ok.\nC) Estressado(a) ou com o humor baixo.',
    'Cuidar da mente é cuidar do corpo. Como você avalia seu bem-estar neste domingo? Responda apenas com a letra:\n\nA) Recarregado(a) e motivado(a)!\nB) Regular, preciso de mais descanso.\nC) Baixo astral ou muito cansado(a).',
];

// ── ALMOÇO ─────────────────────────────────────────────────────────────────────
const LUNCH_MESSAGES = [
    'Como foi seu almoço hoje em relação ao plano? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.',
    'Hora do check-in de almoço! A refeição do meio-dia é fundamental para manter energia e evitar beliscar à tarde. Como foi? Responda apenas com a letra:\n\nA) Refeição dentro do plano!\nB) Adaptei alguns itens, mas equilibrado.\nC) Saí do plano hoje.',
    'Um bom almoço define a segunda metade do seu dia. Como você se saiu hoje? Responda apenas com a letra:\n\nA) Ótimo, prato colorido e equilibrado!\nB) Razoável, poderia ter sido melhor.\nC) Hoje não consegui seguir o plano.',
    'Check-in de almoço! Lembre-se: metade do prato deve ser de vegetais. Como foi a refeição de hoje? Responda apenas com a letra:\n\nA) Segui o plano com capricho!\nB) Seguei parcialmente.\nC) Não consegui seguir hoje.',
    'Como foi seu almoço? Uma refeição equilibrada ao meio-dia ajuda a controlar a fome no restante do dia. Responda apenas com a letra:\n\nA) Almoço excelente, no plano!\nB) Fiz adaptações, mas foi equilibrado.\nC) Fugi do plano hoje.',
];

// ── JANTAR ─────────────────────────────────────────────────────────────────────
const DINNER_MESSAGES = [
    'Chegando ao fim do dia! Como foi seu jantar? Responda apenas com a letra:\n\nA) Segui 100%.\nB) Fiz algumas adaptações.\nC) Fugi um pouco do plano.',
    'Check-in do jantar! À noite, o ideal é uma refeição mais leve para facilitar o sono e a recuperação. Como foi hoje? Responda apenas com a letra:\n\nA) Jantar leve e dentro do plano!\nB) Comi um pouco mais do que o ideal.\nC) Saí bastante do plano hoje.',
    'Como foi o jantar desta sexta? O fim de semana começa aí — como você está equilibrando prazer e saúde? Responda apenas com a letra:\n\nA) Jantar no plano, sem excessos!\nB) Me permiti um pouco mais, mas ok.\nC) Saí totalmente do plano.',
    'Encerrando a semana com o check-in de jantar. Refeições noturnas mais leves favorecem o metabolismo. Como foi? Responda apenas com a letra:\n\nA) Refeição leve e equilibrada!\nB) Um pouco mais pesado que o ideal.\nC) Não consegui seguir o plano esta noite.',
    'Fim de dia, hora do balanço! Como foi seu jantar? Responda apenas com a letra:\n\nA) Jantar certinho, dentro do plano.\nB) Fiz algumas adaptações aceitáveis.\nC) Fugi do plano esta noite.',
];

// ── ATIVIDADE FÍSICA — QUARTA ──────────────────────────────────────────────────
const ACTIVITY_WEDNESDAY_MESSAGES = [
    'É dia de movimento! Você praticou alguma atividade física hoje? Responda apenas com a letra:\n\nA) Sim, treino feito! 💪\nB) Não consegui hoje.',
    'Quarta é dia de manter o ritmo! Seu corpo agradece o movimento regular. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, me movi hoje!\nB) Hoje não foi possível.',
    'O movimento regular melhora o metabolismo, o humor e o sono. Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Não consegui encaixar hoje.',
    'Check-in de quarta! Qualquer movimento conta — caminhada, escadas, treino. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, fiz minha atividade do dia!\nB) Hoje não, mas amanhã retomo.',
    'Meados da semana e o movimento segue em dia? Responda apenas com a letra:\n\nA) Sim, treino realizado com sucesso!\nB) Não hoje, foi um dia agitado.',
];

// ── ATIVIDADE FÍSICA — SÁBADO ──────────────────────────────────────────────────
const ACTIVITY_SATURDAY_MESSAGES = [
    'Sabadou com movimento? Responda apenas com a letra:\n\nA) Sim, me movimentei!\nB) Hoje foi dia de descanso.',
    'Final de semana ativo é ouro para o seu protocolo! Você se exercitou hoje? Responda apenas com a letra:\n\nA) Sim, atividade feita!\nB) Optei por descansar hoje.',
    'Sábado é uma ótima oportunidade para um treino diferente ou uma caminhada ao ar livre. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, me exercitei!\nB) Descansei hoje, retomarei amanhã.',
    'O descanso também é parte do plano — desde que estratégico. Você se moveu hoje? Responda apenas com a letra:\n\nA) Sim, atividade física feita!\nB) Hoje foi dia de recuperação.',
    'Check-in de sábado! Movimento no fim de semana mantém o metabolismo ativo. Como foi? Responda apenas com a letra:\n\nA) Sim, me exercitei hoje!\nB) Descansei, estava precisando.',
];

export const mandatoryGamificationSteps: (ProtocolStep & { perspective: Perspective })[] = [
    // Weekly weigh-ins (every Monday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 1, // Days 1, 8, 15, 22...
        title: `[GAMIFICAÇÃO] Check-in Semanal de Peso (Semana ${i + 1})`,
        message: i === 0
            ? 'Bem-vindo(a) ao seu protocolo! Para registrarmos nosso ponto de partida, por favor me informe seu peso de hoje em jejum. 📊'
            : WEIGHIN_MESSAGES[i % WEIGHIN_MESSAGES.length],
        perspective: 'disciplina' as Perspective,
    })),

    // Weekly planning (every Monday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 1, // Days 1, 8, 15...
        title: `[GAMIFICAÇÃO] Planejamento Semanal (Semana ${i + 1})`,
        message: PLANNING_MESSAGES[i % PLANNING_MESSAGES.length],
        perspective: 'disciplina' as Perspective,
    })),

    // Hydration check-ins (every day for 13 weeks — rotating messages)
    ...Array.from({ length: 13 * 7 }, (_, i) => ({
        day: i + 1,
        title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
        message: HYDRATION_MESSAGES[i % HYDRATION_MESSAGES.length],
        perspective: 'hidratacao' as Perspective,
    })),

    // Well-being — sleep (every Thursday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 4, // Days 4, 11, 18...
        title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
        message: WELLBEING_SLEEP_MESSAGES[i % WELLBEING_SLEEP_MESSAGES.length],
        perspective: 'bemEstar' as Perspective,
    })),

    // Well-being — weekend (every Sunday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 7, // Days 7, 14, 21...
        title: `[GAMIFICAÇÃO] Check-in de Bem-Estar (Semana ${i + 1})`,
        message: WELLBEING_SUNDAY_MESSAGES[i % WELLBEING_SUNDAY_MESSAGES.length],
        perspective: 'bemEstar' as Perspective,
    })),

    // Lunch check-ins (every Tuesday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 2, // Days 2, 9, 16...
        title: `[GAMIFICAÇÃO] Check-in de Almoço (Semana ${i + 1})`,
        message: LUNCH_MESSAGES[i % LUNCH_MESSAGES.length],
        perspective: 'alimentacao' as Perspective,
    })),

    // Dinner check-ins (every Friday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 5, // Days 5, 12, 19...
        title: `[GAMIFICAÇÃO] Check-in de Jantar (Semana ${i + 1})`,
        message: DINNER_MESSAGES[i % DINNER_MESSAGES.length],
        perspective: 'alimentacao' as Perspective,
    })),

    // Activity — Wednesday (every Wednesday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 3, // Days 3, 10, 17...
        title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
        message: ACTIVITY_WEDNESDAY_MESSAGES[i % ACTIVITY_WEDNESDAY_MESSAGES.length],
        perspective: 'movimento' as Perspective,
    })),

    // Activity — Saturday (every Saturday for 13 weeks)
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 6, // Days 6, 13, 20...
        title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
        message: ACTIVITY_SATURDAY_MESSAGES[i % ACTIVITY_SATURDAY_MESSAGES.length],
        perspective: 'movimento' as Perspective,
    })),
];
