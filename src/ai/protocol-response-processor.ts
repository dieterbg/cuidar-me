/**
 * @fileOverview Processador de respostas de protocolos
 * Identifica e processa respostas de check-ins de gamificação
 */

import type { Perspective } from '@/lib/types';

export interface ProtocolStep {
    day: number;
    title: string;
    message: string;
    perspective?: Perspective;
}

/**
 * Identifica se uma mensagem é um check-in de gamificação
 */
export function isGamificationCheckin(protocolStep: ProtocolStep): boolean {
    return protocolStep.title?.includes('[GAMIFICAÇÃO]') || false;
}

/**
 * Extrai a perspectiva de um check-in
 */
export function extractPerspective(protocolStep: ProtocolStep): Perspective | null {
    return protocolStep.perspective || null;
}

/**
 * Processa resposta A/B/C
 */
export function processABCResponse(response: string): {
    isValid: boolean;
    grade: 'A' | 'B' | 'C' | null;
} {
    const normalized = response.trim().toUpperCase();

    if (normalized === 'A' || normalized.includes('A)') || normalized.startsWith('A ')) {
        return { isValid: true, grade: 'A' };
    }
    if (normalized === 'B' || normalized.includes('B)') || normalized.startsWith('B ')) {
        return { isValid: true, grade: 'B' };
    }
    if (normalized === 'C' || normalized.includes('C)') || normalized.startsWith('C ')) {
        return { isValid: true, grade: 'C' };
    }

    return { isValid: false, grade: null };
}

/**
 * Processa resposta SIM/NÃO
 */
export function processYesNoResponse(response: string): {
    isValid: boolean;
    isPositive: boolean;
} {
    const normalized = response.trim().toLowerCase();

    const positiveWords = [
        'sim', 's', 'yes', 'y', 'claro', 'com certeza',
        'consegui', 'consigo', 'fiz', 'faço', 'ok', 'beleza'
    ];

    const negativeWords = [
        'não', 'nao', 'n', 'no', 'não consegui',
        'nao consegui', 'não fiz', 'nao fiz'
    ];

    const isPositive = positiveWords.some(word => normalized.includes(word));
    const isNegative = negativeWords.some(word => normalized.includes(word));

    if (isPositive) return { isValid: true, isPositive: true };
    if (isNegative) return { isValid: true, isPositive: false };

    if (normalized.length > 3) {
        return { isValid: true, isPositive: true };
    }

    return { isValid: false, isPositive: false };
}

/**
 * Processa resposta numérica (peso)
 */
export function processNumericResponse(response: string): {
    isValid: boolean;
    value: number | null;
} {
    const normalized = response.trim().replace(',', '.');
    const match = normalized.match(/(\d+\.?\d*)/);

    if (match) {
        const value = parseFloat(match[1]);
        if (value >= 30 && value <= 300) {
            return { isValid: true, value };
        }
    }

    return { isValid: false, value: null };
}

/**
 * Determina pontos baseado no tipo de check-in e resposta
 */
export function calculatePoints(
    checkinTitle: string,
    response: string,
    perspective: Perspective
): number {
    // Check-ins de alimentação (A/B/C)
    if (checkinTitle.includes('Almoço') || checkinTitle.includes('Jantar') || checkinTitle.includes('Refeição')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 20;
        if (grade === 'B') return 15;
        if (grade === 'C') return 10;
        return 0;
    }

    // Check-in de hidratação (A/B/C)
    if (checkinTitle.includes('Hidratação')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 15;
        if (grade === 'B') return 10;
        if (grade === 'C') return 5;
        return 0;
    }

    // Check-in de bem-estar - sono (A/B/C)
    if (checkinTitle.includes('Bem-Estar') && checkinTitle.includes('sono')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 15;
        if (grade === 'B') return 10;
        if (grade === 'C') return 5;
        return 0;
    }

    // Pesagem semanal
    if (checkinTitle.includes('Peso')) {
        const { isValid } = processNumericResponse(response);
        return isValid ? 50 : 0;
    }

    // Planejamento semanal (A/B)
    if (checkinTitle.includes('Planejamento')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 30; // Sim
        if (grade === 'B') return 0;  // Não

        // Fallback para Sim/Não antigo (caso responda texto)
        const { isPositive } = processYesNoResponse(response);
        return isPositive ? 30 : 0;
    }

    // Atividade física (A/B)
    if (checkinTitle.includes('Atividade')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 40; // Sim
        if (grade === 'B') return 0;  // Não

        // Fallback para Sim/Não antigo
        const { isPositive } = processYesNoResponse(response);
        return isPositive ? 40 : 0;
    }

    // Bem-estar geral (A/B/C)
    if (checkinTitle.includes('Bem-Estar') && !checkinTitle.includes('sono')) {
        const { grade } = processABCResponse(response);
        if (grade === 'A') return 15;
        if (grade === 'B') return 10;
        if (grade === 'C') return 5;

        // Fallback para texto livre (qualquer resposta > 0)
        return response.trim().length > 0 ? 15 : 0;
    }

    return 0;
}

/**
 * Determina o tipo de ação para registerQuickAction
 */
export function getActionType(perspective: Perspective): 'hydration' | 'mood' {
    return perspective === 'hidratacao' ? 'hydration' : 'mood';
}

/**
 * Gera mensagem de confirmação personalizada
 */
export function generateConfirmationMessage(
    checkinTitle: string,
    points: number,
    perspective: Perspective
): string {
    if (points === 0) {
        return "Resposta registrada! Continue tentando, cada dia é uma nova oportunidade! 💪";
    }

    const perspectiveEmojis: Record<Perspective, string> = {
        hidratacao: '💧',
        alimentacao: '🍽️',
        movimento: '🏃',
        disciplina: '⚡',
        bemEstar: '🧠'
    };

    const emoji = perspectiveEmojis[perspective];

    return `✅ Registrado! +${points} pontos ${emoji}`;
}
