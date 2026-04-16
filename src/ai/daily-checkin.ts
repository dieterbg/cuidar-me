
/**
 * @fileOverview Sistema de check-in diário consolidado
 * Substitui 5 mensagens/dia por 1 mensagem conversacional às 20h
 */

import { z } from 'zod';

// Estados do check-in diário
export type CheckinStep =
    | 'hydration'
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'snacks'
    | 'activity'
    | 'wellbeing'
    | 'weight'
    | 'complete';

export interface DailyCheckinState {
    step: CheckinStep;
    date: string; // YYYY-MM-DD
    data: {
        // Hidratação
        hydration?: 'yes' | 'almost' | 'no'; // 👍 🤏 👎
        waterLiters?: number;

        // Alimentação
        breakfast?: 'A' | 'B' | 'C'; // 100% | Adaptei | Fugi
        lunch?: 'A' | 'B' | 'C';
        dinner?: 'A' | 'B' | 'C';
        snacks?: 'yes' | 'no';
        mealPhotoUrl?: string;

        // Atividade
        activity?: 'yes' | 'no';
        activityType?: 'walking' | 'gym' | 'running' | 'cycling' | 'other';
        activityMinutes?: number;

        // Bem-estar
        wellbeing?: 1 | 2 | 3 | 4 | 5; // 😢 😕 😐 😊 😄
        sleep?: 'bad' | 'ok' | 'good'; // 😴 😐 😊

        // Peso (semanal)
        weight?: number;

        // Pontos ganhos
        pointsEarned?: number;
    };
    startedAt: Date;
    completedAt?: Date;
}

/**
 * Determina o próximo passo do check-in
 */
export function getNextCheckinStep(
    currentStep: CheckinStep,
    plan: 'freemium' | 'premium' | 'vip',
    isWeightDay: boolean
): CheckinStep {
    // Freemium não tem check-ins
    if (plan === 'freemium') {
        return 'complete';
    }

    const stepFlow: CheckinStep[] = [
        'hydration',
        'breakfast',
        'lunch',
        'dinner',
        'snacks',
        'activity',
        'wellbeing',
        ...(isWeightDay ? ['weight' as CheckinStep] : []),
        'complete',
    ];

    const currentIndex = stepFlow.indexOf(currentStep);

    if (currentIndex === -1 || currentIndex === stepFlow.length - 1) {
        return 'complete';
    }

    return stepFlow[currentIndex + 1];
}

/**
 * Gera a mensagem para cada passo do check-in
 */
export function getCheckinStepMessage(
    step: CheckinStep,
    data: DailyCheckinState['data'],
    patientName: string
): string {
    const firstName = patientName.split(' ')[0];

    switch (step) {
        case 'hydration':
            return `Olá ${firstName}! 💧 Vamos começar seu check-in? Água é fundamental. Como foi sua hidratação hoje?\n\n👍 Sim, tomei bastante\n🤏 Tomei um pouco\n👎 Quase nada`;
        
        case 'breakfast':
            return `Excelente! 🍳 E o Café da manhã? Escolha a opção que melhor descreve sua refeição:\n\nA) Saudável (Frutas, ovos, integral)\nB) Moderado (Pão branco, pouco açúcar)\nC) Não saudável (Processados, muito açúcar)`;
        
        case 'lunch':
            return `Ótimo! 🥗 E no Almoço? Como foi sua escolha?\n\nA) Saudável (Salada, proteína, pouco carboidrato)\nB) Equilibrado\nC) Pesado/Não saudável`;
        
        case 'dinner':
            return `Entendido! 🥣 E o Jantar?\n\nA) Leve e saudável\nB) Moderado\nC) Pesado ou tarde da noite`;
        
        case 'snacks':
            return `Quase lá! 🍎 Você fez *Lanches* saudáveis entre as refeições hoje?

👍 Sim
👎 Não`;
        
        case 'activity':
            return `Anotado! 🏃 Praticou alguma Atividade física hoje?\n\n👍 Sim\n👎 Não`;
        
        case 'wellbeing':
            return `Como você está se sentindo hoje, ${firstName}? 😊 Escolha um emoji:\n\n1. 😢 Muito mal\n2. 😕 Mal\n3. 😐 Neutro\n4. 😊 Bem\n5. 😄 Muito bem`;
        
        case 'weight':
            return `Dia de Pesagem! ⚖️ Por favor, informe seu peso atual (ex: 85.5).`;
        
        case 'complete':
            const points = calculateCheckinPoints(data);
            return `Check-in completo! 🎉\n\n${generateCheckinSummary(data, points)}`;
        
        default:
            return '';
    }
}

/**
 * Retorna o Content SID do template para um passo do check-in
 */
export function getCheckinStepTemplate(
    step: CheckinStep,
    patientName: string
): { sid?: string; variables?: Record<string, string> } {
    const sids: Record<CheckinStep, string | undefined> = {
        hydration: process.env.TWILIO_CHECKIN_WATER_SID,
        breakfast: process.env.TWILIO_CHECKIN_BREAKFAST_SID,
        lunch: process.env.TWILIO_CHECKIN_LUNCH_SID,
        dinner: process.env.TWILIO_CHECKIN_DINNER_SID,
        snacks: process.env.TWILIO_CHECKIN_SNACKS_SID,
        activity: process.env.TWILIO_CHECKIN_ACTIVITY_SID,
        wellbeing: process.env.TWILIO_CHECKIN_WELLBEING_SID,
        weight: process.env.TWILIO_CHECKIN_WEIGHT_SID,
        complete: undefined,
    };

    const sid = sids[step];
    if (!sid) return {};

    const firstName = patientName.split(' ')[0];
    const variables: Record<string, string> = {};

    // Mapear variáveis específicas de cada template se necessário
    if (step === 'hydration') {
        variables["1"] = firstName;
    }

    return { sid, variables };
}

/**
 * Processa a resposta do usuário para cada passo
 */
export function processCheckinResponse(
    step: CheckinStep,
    response: string,
    currentData: DailyCheckinState['data']
): { data: DailyCheckinState['data']; error?: string } {
    const data = { ...currentData };
    const lowerResponse = response.toLowerCase();

    try {
        switch (step) {
            case 'hydration':
                if (response.includes('👍') || lowerResponse.includes('sim')) {
                    data.hydration = 'yes';
                } else if (response.includes('🤏') || lowerResponse.includes('quase')) {
                    data.hydration = 'almost';
                } else if (response.includes('👎') || lowerResponse.includes('não') || lowerResponse.includes('nao')) {
                    data.hydration = 'no';
                } else {
                    return { data, error: 'Use os emojis: 👍 🤏 👎' };
                }
                break;

            case 'breakfast':
            case 'lunch':
            case 'dinner':
                if (response.includes('🅰️') || response.includes('A') || lowerResponse.includes('100')) {
                    data[step] = 'A';
                } else if (response.includes('🅱️') || response.includes('B') || lowerResponse.includes('adaptei')) {
                    data[step] = 'B';
                } else if (response.includes('🅲') || response.includes('C') || lowerResponse.includes('fugi')) {
                    data[step] = 'C';
                } else {
                    return { data, error: 'Use: 🅰️ 🅱️ 🅲' };
                }
                break;

            case 'snacks':
                if (response.includes('👍') || lowerResponse.includes('sim')) {
                    data.snacks = 'yes';
                } else if (response.includes('👎') || lowerResponse.includes('não') || lowerResponse.includes('nao')) {
                    data.snacks = 'no';
                } else {
                    return { data, error: 'Use: 👍 ou 👎' };
                }
                break;

            case 'activity':
                if (response.includes('👍') || lowerResponse.includes('sim')) {
                    data.activity = 'yes';
                } else if (response.includes('👎') || lowerResponse.includes('não') || lowerResponse.includes('nao')) {
                    data.activity = 'no';
                } else {
                    return { data, error: 'Use: 👍 ou 👎' };
                }
                break;

            case 'wellbeing':
                if (response.includes('😢') || lowerResponse.includes('péssimo') || lowerResponse.includes('pessimo')) {
                    data.wellbeing = 1;
                } else if (response.includes('😕') || lowerResponse.includes('ruim')) {
                    data.wellbeing = 2;
                } else if (response.includes('😐') || lowerResponse.includes('ok')) {
                    data.wellbeing = 3;
                } else if (response.includes('😊') || lowerResponse.includes('bem')) {
                    data.wellbeing = 4;
                } else if (response.includes('😄') || lowerResponse.includes('ótimo') || lowerResponse.includes('otimo')) {
                    data.wellbeing = 5;
                } else {
                    return { data, error: 'Use os emojis: 😢 😕 😐 😊 😄' };
                }
                break;

            case 'weight':
                const weight = parseFloat(response.replace(',', '.'));
                if (isNaN(weight) || weight < 30 || weight > 300) {
                    return { data, error: 'Informe um peso válido entre 30 e 300 kg' };
                }
                data.weight = weight;
                break;
        }

        return { data };
    } catch (error) {
        return { data, error: 'Erro ao processar resposta' };
    }
}

/**
 * Calcula pontos ganhos no check-in
 */
export function calculateCheckinPoints(data: DailyCheckinState['data']): number {
    let points = 0;

    // Hidratação: 15 pts
    if (data.hydration === 'yes') points += 15;
    else if (data.hydration === 'almost') points += 10;

    // Café da manhã: 20 pts
    if (data.breakfast === 'A') points += 20;
    else if (data.breakfast === 'B') points += 15;
    else if (data.breakfast === 'C') points += 5;

    // Almoço: 20 pts
    if (data.lunch === 'A') points += 20;
    else if (data.lunch === 'B') points += 15;
    else if (data.lunch === 'C') points += 5;

    // Jantar: 20 pts
    if (data.dinner === 'A') points += 20;
    else if (data.dinner === 'B') points += 15;
    else if (data.dinner === 'C') points += 5;

    // Lanches: 10 pts
    if (data.snacks === 'yes') points += 10;

    // Atividade: 30 pts base + minutos
    if (data.activity === 'yes') {
        points += 30;
        if (data.activityMinutes) {
            points += Math.min(data.activityMinutes, 60); // Max 60 pts
        }
    }

    // Bem-estar: 10 pts
    if (data.wellbeing && data.wellbeing >= 4) points += 10;

    // Peso (semanal): 20 pts
    if (data.weight) points += 20;

    return points;
}

/**
 * Gera resumo do check-in
 */
export function generateCheckinSummary(
    data: DailyCheckinState['data'],
    totalPoints: number
): string {
    const items: string[] = [];

    // Hidratação
    if (data.hydration === 'yes') items.push('💧 Hidratação: Excelente');
    else if (data.hydration === 'almost') items.push('💧 Hidratação: Regular');
    else if (data.hydration === 'no') items.push('💧 Hidratação: Precisa melhorar');

    // Alimentação (Média das refeições)
    const meals = [data.breakfast, data.lunch, data.dinner].filter(Boolean);
    if (meals.length > 0) {
        const isPerfect = meals.every(m => m === 'A');
        items.push(`🥗 Alimentação: ${isPerfect ? 'Perfeita' : 'Equilibrada'}`);
    }

    // Atividade
    if (data.activity === 'yes') {
        const mins = data.activityMinutes ? ` (${data.activityMinutes} min)` : '';
        items.push(`🏃 Atividade: Praticada${mins}`);
    }

    // Peso
    if (data.weight) {
        items.push(`⚖️ Peso: ${data.weight}kg`);
    }

    return `Check-in completo! 🎉

${items.map(item => `- ${item}`).join('\n')}

🏆 Você ganhou +${totalPoints} pontos hoje! Continue assim! 🚀`;
}
