import type { Perspective } from '../types';

export type WeeklyMessageRole = 'weekly_weight' | 'weekly_adherence' | 'weekly_checkin' | 'education' | 'weekly_summary';

export interface WeeklyProtocolMessage {
    day: number;
    week: number;
    title: string;
    message: string;
    role: WeeklyMessageRole;
    perspective?: Perspective;
}

export interface WeeklyScoreInput {
    weightKg: number;
    adherence: 'A' | 'B' | 'C';
}

export interface WeeklyScoreResult {
    score: number;
    band: 'excelente' | 'consistente' | 'retomada';
    label: string;
}

export interface WeeklyProtocolProfile {
    id: string;
    shortName: string;
    checkinTone: string;
    summaryTone: string;
    education: string[];
    starRotation: Perspective[][];
    badges: {
        first: string;
        fourWeeks: string;
        eightWeeks: string;
        twelveWeeks: string;
    };
}

const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';
const EVOLUCAO_ID = 'b9a33669-05c3-4316-b669-f9d0a84c4a83';
const PERFORMANCE_ID = '63e69258-ca73-4a6f-bd64-13031fa140f2';

const DEFAULT_PROFILE: WeeklyProtocolProfile = {
    id: EVOLUCAO_ID,
    shortName: 'Evolucao',
    checkinTone: 'Vamos olhar para a semana como um todo: padrao, escolhas e aprendizados.',
    summaryTone: 'Evolucao acontece quando voce entende o padrao e ajusta a rota.',
    starRotation: [
        ['disciplina', 'alimentacao'],
        ['movimento', 'hidratacao'],
        ['bemEstar', 'alimentacao'],
        ['disciplina', 'movimento'],
        ['hidratacao', 'bemEstar'],
    ],
    badges: {
        first: 'evolucao_first_checkin',
        fourWeeks: 'evolucao_consistency_4',
        eightWeeks: 'evolucao_consistency_8',
        twelveWeeks: 'evolucao_consistency_12',
    },
    education: [
        'Proteina no cafe da manha aumenta saciedade e reduz beliscos. Escolha uma fonte simples esta semana.',
        'Carboidrato nao e vilao. O foco e qualidade, porcao e contexto da rotina.',
        'Hidratacao melhora fome percebida, energia e disposicao. Deixe uma garrafa visivel.',
        'Sono ruim costuma aumentar fome e impulsividade. Escolha um horario limite para telas.',
        'Planejamento reduz decisoes no impulso. Separe 10 minutos para mapear duas refeicoes-chave.',
        'Fibras ajudam saciedade: aveia, feijao, frutas e vegetais sao aliados praticos.',
        'Um deslize nao estraga a semana. A habilidade mais importante e retomar rapido.',
        'Comer devagar melhora percepcao de saciedade. Teste pausar os talheres no almoco.',
        'Ambiente vence forca de vontade. Deixe opcoes melhores mais faceis de acessar.',
        'Eventos sociais pedem estrategia, nao culpa. Combine uma escolha livre com uma escolha consciente.',
        'Atividade fisica conta mesmo quando e simples. Consistencia vale mais que intensidade isolada.',
        'A balanca mostra tendencia, nao julgamento. Compare semanas, nao dias soltos.',
        'Ultima etapa: pense em quais habitos voce quer manter sem precisar de esforco heroico.',
    ],
};

const PROFILES: Record<string, WeeklyProtocolProfile> = {
    [FUNDAMENTOS_ID]: {
        id: FUNDAMENTOS_ID,
        shortName: 'Fundamentos',
        checkinTone: 'Sem perfeicao: queremos so o retrato honesto da sua semana e um proximo passo possivel.',
        summaryTone: 'Pequenas vitorias repetidas constroem base. Retomar tambem conta.',
        starRotation: [
            ['disciplina', 'hidratacao'],
            ['alimentacao', 'bemEstar'],
            ['movimento', 'disciplina'],
            ['hidratacao', 'alimentacao'],
            ['bemEstar', 'disciplina'],
        ],
        badges: {
            first: 'fundamentos_first_checkin',
            fourWeeks: 'fundamentos_consistency_4',
            eightWeeks: 'fundamentos_consistency_8',
            twelveWeeks: 'fundamentos_consistency_12',
        },
        education: [
            'Comece pelo simples: agua, sono e uma refeicao um pouco melhor. O basico bem feito funciona.',
            'Seu prato nao precisa ser perfeito. Tente incluir uma proteina e uma cor a mais.',
            'Caminhar 10 minutos ja e movimento. O objetivo e ensinar o corpo a voltar para a rotina.',
            'Dormir melhor ajuda fome, humor e energia. Escolha um ritual pequeno antes de deitar.',
            'Planejar uma unica refeicao dificil da semana ja reduz muito o risco de sair do trilho.',
            'Quando bater vontade de beliscar, tome agua e espere alguns minutos. Muitas vezes era sede ou pausa.',
            'Se a semana foi dificil, a meta e reiniciar. Nao precisa compensar: precisa voltar.',
            'Coma com menos pressa em uma refeicao. Perceber saciedade e uma habilidade treinavel.',
            'Deixe frutas, iogurte ou ovos mais faceis que ultraprocessados. O ambiente ajuda voce.',
            'Fim de semana tambem pode ter cuidado. Escolha uma refeicao livre e mantenha o resto simples.',
            'Movimento leve conta. Uma volta no quarteirao e melhor que esperar o treino perfeito.',
            'Peso oscila. O que importa e voce continuar registrando e aprendendo.',
            'Ao fechar o ciclo, escolha tres habitos que cabem na sua vida real.',
        ],
    },
    [EVOLUCAO_ID]: DEFAULT_PROFILE,
    [PERFORMANCE_ID]: {
        id: PERFORMANCE_ID,
        shortName: 'Performance',
        checkinTone: 'Check-in de performance: vamos olhar tendencia, execucao e recuperacao.',
        summaryTone: 'Performance sustentavel e precisao com recuperacao. Dados bons geram ajustes bons.',
        starRotation: [
            ['disciplina', 'movimento'],
            ['alimentacao', 'movimento'],
            ['bemEstar', 'disciplina'],
            ['hidratacao', 'movimento'],
            ['bemEstar', 'alimentacao'],
        ],
        badges: {
            first: 'performance_first_checkin',
            fourWeeks: 'performance_consistency_4',
            eightWeeks: 'performance_consistency_8',
            twelveWeeks: 'performance_consistency_12',
        },
        education: [
            'Proteina distribuida ao longo do dia melhora saciedade e recuperacao. Revise suas refeicoes-chave.',
            'Treino intenso sem recuperacao vira ruido. Sono e descanso fazem parte do protocolo.',
            'Hidratacao e performance: mire constancia, principalmente em dias de treino.',
            'Pre-treino simples: carboidrato adequado e digestao leve podem melhorar execucao.',
            'Pos-treino nao precisa ser perfeito, mas precisa existir: proteina e rotina vencem improviso.',
            'Ajustes de carboidrato devem ser pontuais e acompanhados. Evite restricao agressiva sem orientacao.',
            'HIIT e ferramenta, nao obrigacao. Use intensidade quando recuperacao e seguranca permitirem.',
            'Fotos e medidas complementam a balanca. Tendencia corporal e mais rica que um numero isolado.',
            'Micronutrientes importam: folhas, frutas e sementes protegem energia e recuperacao.',
            'Suplemento so faz sentido sobre base bem feita. Treino, proteina, sono e adesao vem antes.',
            'Pressao social exige plano: defina antes o que e inegociavel e onde voce pode flexibilizar.',
            'Ajuste fino nao e punicao. E calibragem baseada em dados.',
            'Fechamento: performance real e manter resultado sem depender de motivacao extrema.',
        ],
    },
};

export function getWeeklyProtocolProfile(protocolId: string): WeeklyProtocolProfile {
    return PROFILES[protocolId] || DEFAULT_PROFILE;
}

export function getWeeklyProtocolMessages(
    protocolId: string,
    durationDays: number = 90
): WeeklyProtocolMessage[] {
    const profile = getWeeklyProtocolProfile(protocolId);
    const weeks = Math.ceil(durationDays / 7);
    const messages: WeeklyProtocolMessage[] = [];

    for (let week = 1; week <= weeks; week++) {
        const startDay = ((week - 1) * 7) + 1;
        if (startDay > durationDays) continue;

        // Adesão Semanal (Segunda-feira - Dia 1)
        messages.push({
            day: startDay,
            week,
            role: 'weekly_adherence',
            perspective: 'disciplina',
            title: `Adesão Semanal - ${profile.shortName} (Semana ${week})`,
            message: buildWeeklyAdherenceCheckinMessage(profile, week),
        });

        // Foco da Semana / Dica Educativa (Quarta-feira - Dia 3)
        const educationDay = startDay + 2;
        if (educationDay <= durationDays) {
            messages.push({
                day: educationDay,
                week,
                role: 'education',
                title: `Foco da Semana - ${profile.shortName} (Semana ${week})`,
                message: profile.education[(week - 1) % profile.education.length],
            });
        }

        // Pesagem Semanal (Sexta-feira - Dia 5)
        const weightDay = startDay + 4;
        if (weightDay <= durationDays) {
            messages.push({
                day: weightDay,
                week,
                role: 'weekly_weight',
                perspective: 'disciplina',
                title: `Pesagem Semanal - ${profile.shortName} (Semana ${week})`,
                message: buildWeeklyWeightCheckinMessage(profile, week),
            });
        }

        // Resumo Semanal (Sábado - Dia 6)
        const summaryDay = Math.min(startDay + 5, durationDays);
        messages.push({
            day: summaryDay,
            week,
            role: 'weekly_summary',
            perspective: 'disciplina',
            title: `Resumo Semanal - ${profile.shortName} (Semana ${week})`,
            message: `Resumo da semana ${week}: vamos consolidar seu progresso dos ultimos 7 dias.`,
        });
    }

    return messages.sort((a, b) => a.day - b.day || roleOrder(a.role) - roleOrder(b.role));
}

export function calculateWeeklyScore(input: WeeklyScoreInput): WeeklyScoreResult {
    const adherencePoints = { A: 30, B: 20, C: 10 }[input.adherence];
    const score = 40 + 20 + adherencePoints + 10;

    if (score >= 95) {
        return { score, band: 'excelente', label: 'Semana excelente' };
    }
    if (score >= 85) {
        return { score, band: 'consistente', label: 'Semana consistente' };
    }
    return { score, band: 'retomada', label: 'Semana de retomada' };
}

export function getWeeklyStarFocus(protocolId: string, week: number): Perspective[] {
    const profile = getWeeklyProtocolProfile(protocolId);
    const rotation = profile.starRotation.length > 0 ? profile.starRotation : DEFAULT_PROFILE.starRotation;
    return rotation[(week - 1) % rotation.length];
}

export function buildWeeklyStarProgress(
    protocolId: string,
    week: number,
    adherence: 'A' | 'B' | 'C'
): Record<Perspective, { current: number; goal: number; isComplete: boolean }> {
    const focus = new Set<Perspective>(['disciplina', ...getWeeklyStarFocus(protocolId, week)]);
    const valuesByAdherence: Record<'A' | 'B' | 'C', { focus: number; support: number }> = {
        A: { focus: 5, support: 3 },
        B: { focus: 4, support: 2 },
        C: { focus: 2, support: 1 },
    };
    const values = valuesByAdherence[adherence];
    const perspectives: Perspective[] = ['alimentacao', 'movimento', 'hidratacao', 'disciplina', 'bemEstar'];

    return perspectives.reduce((acc, perspective) => {
        const current = focus.has(perspective) ? values.focus : values.support;
        acc[perspective] = {
            current,
            goal: 5,
            isComplete: current >= 5,
        };
        return acc;
    }, {} as Record<Perspective, { current: number; goal: number; isComplete: boolean }>);
}

export function buildWeeklySummaryMessage(args: {
    protocolId: string;
    week: number;
    score?: number | null;
    adherence?: 'A' | 'B' | 'C' | null;
    weightKg?: number | null;
    totalPoints?: number | null;
}): string {
    const profile = getWeeklyProtocolProfile(args.protocolId);

    if (!args.score) {
        return [
            `Resumo semanal - ${profile.shortName}`,
            '',
            'Ainda nao recebi seu check-in desta semana.',
            'Sem problema: a melhor gamificacao aqui e retomar.',
            'Na proxima segunda, envie seu peso e A/B/C para atualizar seu placar.',
        ].join('\n');
    }

    const band = args.score >= 95 ? 'excelente' : args.score >= 85 ? 'consistente' : 'retomada';
    const weightLine = args.weightKg ? `Peso registrado: ${formatWeight(args.weightKg)} kg` : 'Peso registrado: sim';
    const adherenceLine = `Percepcao da semana: ${formatAdherence(args.adherence)}`;

    return [
        `Resumo semanal - ${profile.shortName}`,
        '',
        weightLine,
        adherenceLine,
        `Score semanal: ${args.score}/100 (${band})`,
        args.totalPoints !== null && args.totalPoints !== undefined ? `Health Coins acumulados: ${args.totalPoints}` : null,
        '',
        profile.summaryTone,
        'Proxima meta: repetir o basico por mais 7 dias.',
    ].filter(Boolean).join('\n');
}

export function buildWeeklyWeightCheckinMessage(profile: WeeklyProtocolProfile, week: number): string {
    return [
        `Semana ${week} - ${profile.shortName}`,
        'Bom dia! Sexta-feira é dia de pesagem oficial.',
        '',
        'Responda apenas com o número do seu peso em jejum (ex: 85). 📊'
    ].join('\n');
}

export function buildWeeklyAdherenceCheckinMessage(profile: WeeklyProtocolProfile, week: number): string {
    return [
        `Semana ${week} - ${profile.shortName}`,
        profile.checkinTone,
        '',
        'Como foi a sua consistência com a alimentação e treinos na última semana?',
        'Responda com a letra correspondente:',
        '',
        'A) Fui consistente',
        'B) Oscilei, mas mantive parte do plano',
        'C) Tive dificuldade e quero retomar',
        '',
        'Isso vale até 100 Health Coins na semana.'
    ].join('\n');
}

function buildWeeklyCheckinMessage(profile: WeeklyProtocolProfile, week: number): string {
    return [
        `Semana ${week} - ${profile.shortName}`,
        profile.checkinTone,
        '',
        'Responda em uma unica mensagem:',
        'Peso: 84,7',
        'Semana: A, B ou C',
        '',
        'A) Fui consistente',
        'B) Oscilei, mas mantive parte do plano',
        'C) Tive dificuldade e quero retomar',
        '',
        'Isso vale ate 100 Health Coins na semana.',
    ].join('\n');
}

function formatAdherence(adherence?: 'A' | 'B' | 'C' | null): string {
    if (adherence === 'A') return 'A - consistente';
    if (adherence === 'B') return 'B - oscilou, mas manteve parte do plano';
    if (adherence === 'C') return 'C - semana dificil, foco em retomada';
    return 'nao informada';
}

function formatWeight(weight: number): string {
    return weight.toFixed(1).replace('.', ',');
}

function roleOrder(role: WeeklyMessageRole): number {
    if (role === 'weekly_adherence') return 1;
    if (role === 'weekly_checkin') return 1;
    if (role === 'education') return 2;
    if (role === 'weekly_weight') return 3;
    return 4;
}
