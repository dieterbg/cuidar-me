import type { ProtocolStep, Perspective } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL IDs
// ─────────────────────────────────────────────────────────────────────────────
const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';
const PERFORMANCE_ID = '63e69258-ca73-4a6f-bd64-13031fa140f2';
// Evolução ('b9a33669-...') e Teste ('2412145d-...') usam mensagens padrão

// ─────────────────────────────────────────────────────────────────────────────
// PONTUAÇÃO (valores reais definidos em checkin-response-handler.ts — NÃO editar aqui)
// Peso: 50 pts | Planejamento: A=30 | Hidratação: A=15/B=10/C=5
// Almoço/Jantar: A=20/B=15/C=10 | Atividade: A=40 | Bem-Estar/Sono: A=15/B=10/C=5
// Meta: paciente consistente (70%) → Bronze V em 13 semanas
//       paciente dedicado (100%) → Prata I em 13 semanas
// ─────────────────────────────────────────────────────────────────────────────

// =============================================================================
// MENSAGENS PADRÃO — EVOLUÇÃO (tom educativo, crescimento, progresso mensurável)
// =============================================================================

const WEIGHIN_MESSAGES = [
    'Check-in Semanal de Peso\nBom dia! É dia de registrar seu progresso.\n\nResponda apenas com o número do seu peso em jejum (ex: 85). 📊',
    'Check-in Semanal de Peso\nSegunda-feira é dia de acompanhamento!\n\nResponda apenas com o número do seu peso em jejum (ex: 85).',
    'Check-in Semanal de Peso\nVamos acompanhar sua evolução!\n\nResponda com o número do seu peso em jejum (ex: 85).',
    'Check-in Semanal de Peso\nHora do registro oficial da semana.\n\nResponda apenas com o número do peso em jejum (ex: 85).',
    'Check-in Semanal de Peso\nCada medição conta para sua meta final!\n\nResponda com o número do peso em jejum (ex: 85).',
];

const PLANNING_MESSAGES = [
    'Planejamento Semanal\nVocê já planejou suas atividades e refeições para os próximos dias?\n\nA) Sim, tudo planejado! (+30 pts)\nB) Ainda não parei para isso (+0 pts)',
    'Planejamento Semanal\nQuem planeja chega mais longe! Organizou seus treinos e refeições?\n\nA) Sim, já está organizado! (+30 pts)\nB) Ainda não, vou fazer hoje (+0 pts)',
    'Planejamento Semanal\nO segredo dos resultados está no planejamento. Reservou seu momento?\n\nA) Sim, já planejei! (+30 pts)\nB) Não ainda, mas quero começar (+0 pts)',
    'Planejamento Semanal\nSegunda é o melhor dia para organizar a rota. Tudo no radar?\n\nA) Sim, semana organizada! (+30 pts)\nB) Não, preciso fazer isso (+0 pts)',
    'Planejamento Semanal\nPlanejar evita decisões impulsivas. Dedicou seu tempo de organização?\n\nA) Sim, está planejado! (+30 pts)\nB) Ainda não, mas vou agora (+0 pts)',
];

const HYDRATION_MESSAGES = [
    'Check-in de Hidratação\nComo você se saiu com a meta de água hoje?\n\nA) Bati a meta! (+15 pts)\nB) Bebi um pouco menos (+10 pts)\nC) Preciso melhorar (+5 pts)',
    'Check-in de Hidratação\nÁgua é vida! Como foi sua hidratação hoje?\n\nA) Bebi tudo! (+15 pts)\nB) Bebi um pouco menos (+10 pts)\nC) Preciso melhorar (+5 pts)',
    'Check-in de Hidratação\nCada copo conta para seu metabolismo e disposição. Como foi?\n\nA) Meta batida! (+15 pts)\nB) Quase atingi (+10 pts)\nC) Esqueci bastante hoje (+5 pts)',
    'Check-in de Hidratação\nSeu corpo é 60% água — hidratar é prioridade! Como foi hoje?\n\nA) Meta batida! (+15 pts)\nB) Faltou pouco (+10 pts)\nC) Fiquei muito aquém (+5 pts)',
    'Check-in de Hidratação\nEncerrando o dia com o check-in de água!\n\nA) Meta batida! (+15 pts)\nB) Faltou pouco (+10 pts)\nC) Fiquei muito aquém (+5 pts)',
];

const WELLBEING_SLEEP_MESSAGES = [
    'Check-in de Sono\nComo você avalia a sua noite de sono de ontem?\n\nA) Bem, estou descansado(a) (+15 pts)\nB) Razoável / despertares (+10 pts)\nC) Ruim / não descansei (+5 pts)',
    'Check-in de Sono\nO sono regula seus hormônios do apetite. Como dormiu?\n\nA) Bem, acordei disposto (+15 pts)\nB) Mais ou menos / fragmentado (+10 pts)\nC) Mal, acordei cansado (+5 pts)',
];

const WELLBEING_SUNDAY_MESSAGES = [
    'Check-in de Bem-Estar\nFim de semana é para recarregar! Como você está hoje?\n\nA) Ótimo, energias recarregadas (+15 pts)\nB) Bem, mas poderia ser melhor (+10 pts)\nC) Cansado ou estressado (+5 pts)',
    'Check-in de Bem-Estar\nO equilíbrio emocional impacta seus resultados. Como está?\n\nA) Renovado(a)! (+15 pts)\nB) Razoável, preciso de descanso (+10 pts)\nC) Estressado ou desanimado (+5 pts)',
];

const LUNCH_MESSAGES = [
    'Check-in de Almoço\nComo foi seu almoço hoje em relação ao plano?\n\nA) Refeição dentro do plano! (+20 pts)\nB) Adaptei alguns itens, mas equilibrado (+15 pts)\nC) Saí do plano hoje (+10 pts)',
    'Check-in de Almoço\nUm bom almoço define a segunda metade do seu dia. Como você se saiu hoje?\n\nA) Segui o plano com capricho! (+20 pts)\nB) Segui parcialmente (+15 pts)\nC) Não consegui seguir hoje (+10 pts)',
    'Check-in de Almoço\nComo foi seu almoço? Uma refeição equilibrada ao meio-dia ajuda a controlar a fome no restante do dia.\n\nA) No plano! (+20 pts)\nB) Adaptei itens (+15 pts)\nC) Saí do plano (+10 pts)',
];

const DINNER_MESSAGES = [
    'Check-in de Jantar\nRefeições noturnas leves favorecem o sono e o metabolismo. E hoje?\n\nA) Sem excessos! (+20 pts)\nB) Um pouco fora, mas controlado (+15 pts)\nC) Saí totalmente do plano (+10 pts)',
];

const ACTIVITY_WEDNESDAY_MESSAGES = [
    'Check-in de Atividade Física\nÉ dia de movimento! Você praticou alguma atividade hoje?\n\nA) Sim, treino/movimento feito! (+40 pts)\nB) Não consegui hoje (+0 pts)',
    'Check-in de Atividade Física\nConsistência é o diferencial. Concluiu seu movimento do dia?\n\nA) Sim, missão cumprida! (+40 pts)\nB) Hoje não foi possível (+0 pts)',
];

const ACTIVITY_SATURDAY_MESSAGES = [
    'Check-in de Atividade Física\nSábado ativo! Você incluiu algum movimento no seu dia?\n\nA) Sim, me movimentei! (+40 pts)\nB) Hoje foi dia de descanso (+0 pts)',
    'Check-in de Atividade Física\nFinal de semana ativo acelera seus resultados. Treinou hoje?\n\nA) Sim, atividade feita! (+40 pts)\nB) Optei por recuperar hoje (+0 pts)',
];

// =============================================================================
// MENSAGENS FUNDAMENTOS — tom gentil, acolhedor, celebra pequenas vitórias
// =============================================================================

const FUNDAMENTOS_WEIGHIN = [
    'Check-in Semanal de Peso\nChegou o momento de registrar seu peso.\n\nResponda com o número do seu peso em jejum (ex: 85).',
    'Check-in Semanal de Peso\nDia de se pesar! O que conta é o seu cuidado constante.\n\nResponda com o número em jejum (ex: 85).',
];

const FUNDAMENTOS_PLANNING = [
    'Planejamento Semanal\nPlanejar é um ato de cuidado com você. Organizou sua semana?\n\nA) Sim, tenho um plano! (+30 pts)\nB) Ainda não, vou fazer agora (+0 pts)',
    'Planejamento Semanal\nUm minutinho de organização muda sua semana inteira. Vamos nessa?\n\nA) Sim, já planejei! (+30 pts)\nB) Ainda não, vou agora (+0 pts)',
];

const FUNDAMENTOS_HYDRATION = [
    'Check-in de Hidratação\nHora de checar sua água!\n\nA) Meta batida! (+15 pts)\nB) Mas faltou (+10 pts)\nC) Esqueci de me hidratar (+5 pts)',
    'Check-in de Hidratação\nBeber água é o hábito mais poderoso e simples. Concluiu sua meta?\n\nA) Meta batida! (+15 pts)\nB) Faltou pouco (+10 pts)\nC) Bebeu pouca água (+5 pts)',
];

const FUNDAMENTOS_WELLBEING_SLEEP = [
    'Check-in de Sono\nComo você dormiu ontem à noite? O descanso é a base de tudo.\n\nA) Dormi bem! (+15 pts)\nB) Noite razoável (+10 pts)\nC) Dormi mal (+5 pts)',
    'Check-in de Sono\nO sono ajuda na sua recuperação metabólica. Como foi?\n\nA) Descansado! (+15 pts)\nB) Mais ou menos (+10 pts)\nC) Cansado (+5 pts)',
];

const FUNDAMENTOS_WELLBEING_SUNDAY = [
    'Check-in de Bem-Estar\nDomingo de renovação! 😊 Como você está se sentindo hoje?\n\nA) Renovado(a)! (+15 pts)\nB) Razoável (+10 pts)\nC) Cansado(a) (+5 pts)',
];

const FUNDAMENTOS_LUNCH = [
    'Check-in de Almoço\nComo foi seu almoço em relação ao plano?\n\nA) No plano! (+20 pts)\nB) Adaptei alguns itens (+15 pts)\nC) Saí do plano hoje (+10 pts)',
    'Check-in de Almoço\nHora de registrar sua vitória no almoço!\n\nA) No plano! (+20 pts)\nB) Adaptei alguns itens (+15 pts)\nC) Saí do plano hoje (+10 pts)',
];

const FUNDAMENTOS_DINNER = [
    'Check-in de Jantar\nUma refeição leve à noite ajuda sua recuperação. Como foi?\n\nA) No plano! (+20 pts)\nB) Adaptei itens (+15 pts)\nC) Saí do plano (+10 pts)',
    'Check-in de Jantar\nEncerrando o dia com consciência! Como foi o jantar?\n\nA) No plano! (+20 pts)\nB) Adaptei itens (+15 pts)\nC) Saí do plano (+10 pts)',
];

const FUNDAMENTOS_ACTIVITY_WED = [
    'Check-in de Atividade Física\nMeio de semana, hora de se mover! 🚶 Praticou algo hoje?\n\nA) Sim, me movi hoje! (+40 pts)\nB) Hoje não consegui (+0 pts)',
];

const FUNDAMENTOS_ACTIVITY_SAT = [
    'Check-in de Atividade Física\nSábado é dia de se cuidar com prazer! 😊 Se movimentou?\n\nA) Sim, movimento feito! (+40 pts)\nB) Hoje foi dia de descanso (+0 pts)',
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
    'Planejamento semanal de alta performance. Refeições, treinos, recuperação e sono — tudo mapeado?\n\nA) Sim, plano de alta performance pronto! (+30 pts)\nB) Ainda não — esse é o momento de planejar (+0 pts)',
    'A semana do atleta é planejada antes de começar. Você mapeou treinos, refeições estratégicas e recuperação?\n\nA) Sim, 100% planejado! (+30 pts)\nB) Ainda não — vou estruturar agora (+0 pts)',
    'Controle total começa com planejamento total. Refeições, treinos e recuperação — tudo na agenda?\n\nA) Sim, tudo sob controle! (+30 pts)\nB) Planejando agora (+0 pts)',
];

const PERFORMANCE_HYDRATION = [
    'Hidratação é performance. Cada 1% de desidratação reduz capacidade física e cognitiva. Hoje?\n\nA) Meta batida! (+15 pts)\nB) Faltou pouco (+10 pts)\nC) Hidratação insuficiente (+5 pts)',
    'Monitoramento de hidratação. Ideal: ~35ml/kg de peso corporal/dia. Como você se saiu?\n\nA) Excelente hidratação hoje! (+15 pts)\nB) Razoável, abaixo da meta ideal (+10 pts)\nC) Fraco hoje — corrigir amanhã (+5 pts)',
];

const PERFORMANCE_WELLBEING_SLEEP = [
    'Check-in de recuperação. O sono é onde ocorre a síntese proteica e a consolidação metabólica. Como foi ontem?\n\nA) Sono reparador, recuperação completa! (+15 pts)\nB) Sono razoável (+10 pts)\nC) Noite ruim (+5 pts)',
    'Monitoramento de recuperação noturna. Qualidade do sono impacta composição corporal. Ontem?\n\nA) Sono de alta qualidade — 7h+! (+15 pts)\nB) Razoável (+10 pts)\nC) Ruim — recuperação prejudicada (+5 pts)',
    'Performance do sono. Atletas de elite priorizam 7-9h. Como foi ontem?\n\nA) Dormi o necessário! (+15 pts)\nB) Sono fragmentado (+10 pts)\nC) Dormi muito mal (+5 pts)',
];

const PERFORMANCE_WELLBEING_SUNDAY = [
    'Check-in de estado geral. Como está o bem-estar?\n\nA) Totalmente recuperado(a) — pronto(a)! (+15 pts)\nB) Parcialmente recuperado(a) (+10 pts)\nC) Ainda com fadiga ou estresse (+5 pts)',
    'Avaliação de bem-estar: domingo. Prontidão mental = prontidão física. Como você está?\n\nA) 100% — energia e motivação em alta! (+15 pts)\nB) Em recuperação (+10 pts)\nC) Baixo — fadiga ou estresse elevado (+5 pts)',
];

const PERFORMANCE_LUNCH = [
    'Check-in de Almoço\nProtocolo de macros: proteína e carga glicêmica.\n\nA) 100% no plano! (+20 pts)\nB) Ajustes necessários (+15 pts)\nC) Fora do protocolo (+10 pts)',
];

const PERFORMANCE_DINNER = [
    'Check-in de Jantar\nProtocolo noturno: leveza e recuperação celular.\n\nA) 100% no plano! (+20 pts)\nB) Ajustes necessários (+15 pts)\nC) Fora do protocolo (+10 pts)',
];

const PERFORMANCE_ACTIVITY_WED = [
    'Check-in de Atividade Física\nMid-week training check. Consistência é o diferencial.\n\nA) Sim, treino executado! (+40 pts)\nB) Não treinei hoje (+0 pts)',
];

const PERFORMANCE_ACTIVITY_SAT = [
    'Check-in de Atividade Física\nSábado de performance! Intensidade ou recuperação ativa?\n\nA) Sim, missão cumprida! (+40 pts)\nB) Descanso estratégico (+0 pts)',
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
            title: `Check-in Semanal de Peso (Semana ${i + 1})`,
            message: i === 0
                ? 'Check-in de Peso (Início)\nBem-vindo(a)! Para registrarmos nosso ponto de partida, responda apenas com o número do seu peso em jejum (ex: 85).'
                : weighin[i % weighin.length],
            perspective: 'disciplina' as Perspective,
        })),

        // Planejamento semanal (toda segunda — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 1,
            title: `Planejamento Semanal (Semana ${i + 1})`,
            message: planning[i % planning.length],
            perspective: 'disciplina' as Perspective,
        })),

        // Hidratação terça (dia 2, 9, 16...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 2,
            title: `Check-in de Hidratação`,
            message: hydration[i % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Hidratação quinta (dia 4, 11, 18...) — offset de 2
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 4,
            title: `Check-in de Hidratação`,
            message: hydration[(i + 2) % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Hidratação sábado (dia 6, 13, 20...) — offset de 4
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 6,
            title: `Check-in de Hidratação`,
            message: hydration[(i + 4) % hydration.length],
            perspective: 'hidratacao' as Perspective,
        })),

        // Bem-estar sono (toda quinta — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 4,
            title: `Check-in de Bem-Estar (Semana ${i + 1})`,
            message: sleepWellbeing[i % sleepWellbeing.length],
            perspective: 'bemEstar' as Perspective,
        })),

        // Bem-estar domingo (todo domingo — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 7,
            title: `Check-in de Bem-Estar (Semana ${i + 1})`,
            message: sundayWellbeing[i % sundayWellbeing.length],
            perspective: 'bemEstar' as Perspective,
        })),

        // Almoço (toda terça — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 2,
            title: `Check-in de Almoço (Semana ${i + 1})`,
            message: lunch[i % lunch.length],
            perspective: 'alimentacao' as Perspective,
        })),

        // Jantar (toda sexta — 13 semanas)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 5,
            title: `Check-in de Jantar (Semana ${i + 1})`,
            message: dinner[i % dinner.length],
            perspective: 'alimentacao' as Perspective,
        })),

        // Atividade quarta (dia 3, 10, 17...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 3,
            title: `Check-in de Atividade Física (Semana ${i + 1})`,
            message: activityWed[i % activityWed.length],
            perspective: 'movimento' as Perspective,
        })),

        // Atividade sábado (dia 6, 13, 20...)
        ...Array.from({ length: 13 }, (_, i) => ({
            day: (i * 7) + 6,
            title: `Check-in de Atividade Física (Semana ${i + 1})`,
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
