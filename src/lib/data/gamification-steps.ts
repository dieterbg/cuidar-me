import type { ProtocolStep, Perspective } from '../types';

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
        message: 'Vamos começar a semana com o pé direito! Você já planejou suas atividades físicas e refeições principais para os próximos dias? Responda apenas com a letra:\n\nA) Sim, tudo planejado!\nB) Não, ainda não parei para isso.',
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
        message: 'Fim de semana é para relaxar! Como você está se sentindo hoje? Responda apenas com a letra:\n\nA) Ótimo(a), energias recarregadas!\nB) Bem, mas poderia ser melhor.\nC) Cansado(a) ou estressado(a).',
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
        message: 'É dia de movimento! Você praticou alguma atividade física hoje? Responda apenas com a letra:\n\nA) Sim, treino feito! 💪\nB) Não consegui hoje.',
        perspective: 'movimento' as Perspective
    })),
    ...Array.from({ length: 13 }, (_, i) => ({
        day: (i * 7) + 6, // Days 6, 13, 20...
        title: `[GAMIFICAÇÃO] Check-in de Atividade Física (Semana ${i + 1})`,
        message: 'Sabadou com movimento? Responda apenas com a letra:\n\nA) Sim, me movimentei!\nB) Hoje foi dia de descanso.',
        perspective: 'movimento' as Perspective
    })),
];
