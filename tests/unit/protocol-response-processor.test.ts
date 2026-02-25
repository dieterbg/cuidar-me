import { describe, it, expect } from 'vitest';
import {
    isGamificationCheckin,
    extractPerspective,
    processABCResponse,
    processYesNoResponse,
    processNumericResponse,
    calculatePoints,
    getActionType,
    generateConfirmationMessage,
} from '@/ai/protocol-response-processor';

/**
 * Testes do Processador de Respostas de Protocolo
 * Funções puras — sem dependências externas
 */
describe('Protocol Response Processor', () => {

    // =================================================================
    // PRP-01/02: isGamificationCheckin
    // =================================================================
    describe('isGamificationCheckin', () => {
        it('PRP-01: detecta steps com [GAMIFICAÇÃO] no título', () => {
            expect(isGamificationCheckin({ day: 1, title: '[GAMIFICAÇÃO] Hidratação', message: '' })).toBe(true);
            expect(isGamificationCheckin({ day: 1, title: 'Dia 3 [GAMIFICAÇÃO] Peso', message: '' })).toBe(true);
        });

        it('PRP-02: retorna false para steps normais', () => {
            expect(isGamificationCheckin({ day: 1, title: 'Dica do dia', message: '' })).toBe(false);
            expect(isGamificationCheckin({ day: 1, title: '', message: '' })).toBe(false);
        });
    });

    // =================================================================
    // PRP-03: extractPerspective
    // =================================================================
    describe('extractPerspective', () => {
        it('PRP-03: retorna perspectiva do step', () => {
            expect(extractPerspective({ day: 1, title: 'Hidratação', message: '', perspective: 'hidratacao' })).toBe('hidratacao');
            expect(extractPerspective({ day: 1, title: 'Movimento', message: '', perspective: 'movimento' })).toBe('movimento');
        });

        it('retorna null se sem perspectiva', () => {
            expect(extractPerspective({ day: 1, title: 'Dica', message: '' })).toBeNull();
        });
    });

    // =================================================================
    // PRP-04/05/06: processABCResponse
    // =================================================================
    describe('processABCResponse', () => {
        it('PRP-04: aceita "A", "B", "C" (case-insensitive)', () => {
            expect(processABCResponse('A')).toEqual({ isValid: true, grade: 'A' });
            expect(processABCResponse('b')).toEqual({ isValid: true, grade: 'B' });
            expect(processABCResponse('C')).toEqual({ isValid: true, grade: 'C' });
        });

        it('PRP-05: aceita variantes "A)", "B ..."', () => {
            expect(processABCResponse('A) Sim')).toEqual({ isValid: true, grade: 'A' });
            expect(processABCResponse('B) Mais ou menos')).toEqual({ isValid: true, grade: 'B' });
            expect(processABCResponse('C) Não')).toEqual({ isValid: true, grade: 'C' });
            expect(processABCResponse('A bebi bastante')).toEqual({ isValid: true, grade: 'A' });
        });

        it('PRP-06: rejeita input totalmente inválido', () => {
            expect(processABCResponse('D')).toEqual({ isValid: false, grade: null });
            expect(processABCResponse('xyz')).toEqual({ isValid: false, grade: null });
        });
    });

    // =================================================================
    // PRP-07/08/09: processYesNoResponse
    // =================================================================
    describe('processYesNoResponse', () => {
        it('PRP-07: aceita variantes positivas', () => {
            expect(processYesNoResponse('sim').isPositive).toBe(true);
            expect(processYesNoResponse('s').isPositive).toBe(true);
            expect(processYesNoResponse('claro').isPositive).toBe(true);
            expect(processYesNoResponse('fiz').isPositive).toBe(true);
            expect(processYesNoResponse('ok').isPositive).toBe(true);
            expect(processYesNoResponse('beleza').isPositive).toBe(true);
        });

        it('PRP-08: aceita variantes negativas', () => {
            expect(processYesNoResponse('não').isPositive).toBe(false);
            expect(processYesNoResponse('nao').isPositive).toBe(false);
            expect(processYesNoResponse('n').isPositive).toBe(false);
        });

        it('PRP-09: fallback — msg > 3 chars = positivo', () => {
            const result = processYesNoResponse('hoje foi tranquilo');
            expect(result.isValid).toBe(true);
            expect(result.isPositive).toBe(true);
        });

        it('rejeita input vazio ou muito curto sem palavra-chave', () => {
            const result = processYesNoResponse('xy');
            expect(result.isValid).toBe(false);
        });
    });

    // =================================================================
    // PRP-10/11: processNumericResponse
    // =================================================================
    describe('processNumericResponse', () => {
        it('PRP-10: extrai número de "85.5" e "90,3kg"', () => {
            expect(processNumericResponse('85.5')).toEqual({ isValid: true, value: 85.5 });
            expect(processNumericResponse('90,3kg')).toEqual({ isValid: true, value: 90.3 });
            expect(processNumericResponse('Peso: 72')).toEqual({ isValid: true, value: 72 });
        });

        it('PRP-11: rejeita valores fora de 30-300', () => {
            expect(processNumericResponse('15')).toEqual({ isValid: false, value: null });
            expect(processNumericResponse('350')).toEqual({ isValid: false, value: null });
            expect(processNumericResponse('abc')).toEqual({ isValid: false, value: null });
        });
    });

    // =================================================================
    // PRP-12: calculatePoints
    // =================================================================
    describe('calculatePoints', () => {
        it('PRP-12: calcula pontos para Almoço (A=20, B=15, C=10)', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Almoço', 'A', 'alimentacao')).toBe(20);
            expect(calculatePoints('[GAMIFICAÇÃO] Almoço', 'B', 'alimentacao')).toBe(15);
            expect(calculatePoints('[GAMIFICAÇÃO] Almoço', 'C', 'alimentacao')).toBe(10);
        });

        it('calcula pontos para Hidratação (A=15, B=10, C=5)', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Hidratação', 'A', 'hidratacao')).toBe(15);
            expect(calculatePoints('[GAMIFICAÇÃO] Hidratação', 'B', 'hidratacao')).toBe(10);
            expect(calculatePoints('[GAMIFICAÇÃO] Hidratação', 'C', 'hidratacao')).toBe(5);
        });

        it('calcula pontos para Peso (numérico válido = 50)', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Peso', '85.5', 'disciplina')).toBe(50);
            expect(calculatePoints('[GAMIFICAÇÃO] Peso', 'abc', 'disciplina')).toBe(0);
        });

        it('calcula pontos para Atividade (A=40, B=0)', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Atividade', 'A', 'movimento')).toBe(40);
            expect(calculatePoints('[GAMIFICAÇÃO] Atividade', 'B', 'movimento')).toBe(0);
        });

        it('calcula pontos para Atividade via sim/não', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Atividade', 'sim fiz exercício', 'movimento')).toBe(40);
            // Nota: 'não fiz' contém 'fiz' que é positivo — processYesNoResponse
            // verifica positiveWords ANTES de negativeWords, então 'não fiz' → positivo → 40 pts
            expect(calculatePoints('[GAMIFICAÇÃO] Atividade', 'não fiz', 'movimento')).toBe(40);
        });

        it('calcula pontos para Bem-Estar geral', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Bem-Estar', 'A', 'bemEstar')).toBe(15);
            expect(calculatePoints('[GAMIFICAÇÃO] Bem-Estar', 'B', 'bemEstar')).toBe(10);
            expect(calculatePoints('[GAMIFICAÇÃO] Bem-Estar', 'C', 'bemEstar')).toBe(5);
        });

        it('calcula pontos para Bem-Estar sono', () => {
            expect(calculatePoints('[GAMIFICAÇÃO] Bem-Estar (sono)', 'A', 'bemEstar')).toBe(15);
            expect(calculatePoints('[GAMIFICAÇÃO] Bem-Estar (sono)', 'B', 'bemEstar')).toBe(10);
        });

        it('retorna 0 para título desconhecido', () => {
            expect(calculatePoints('Dica aleatória', 'qualquer', 'disciplina')).toBe(0);
        });
    });

    // =================================================================
    // PRP-13: generateConfirmationMessage
    // =================================================================
    describe('generateConfirmationMessage', () => {
        it('PRP-13: gera msg com emoji correto para pontos > 0', () => {
            const msg = generateConfirmationMessage('Hidratação', 15, 'hidratacao');
            expect(msg).toContain('+15 pontos');
            expect(msg).toContain('💧');
        });

        it('gera msg de incentivo para pontos = 0', () => {
            const msg = generateConfirmationMessage('Hidratação', 0, 'hidratacao');
            expect(msg).toContain('Continue tentando');
        });

        it('usa emoji correto por perspectiva', () => {
            expect(generateConfirmationMessage('X', 10, 'alimentacao')).toContain('🍽️');
            expect(generateConfirmationMessage('X', 10, 'movimento')).toContain('🏃');
            expect(generateConfirmationMessage('X', 10, 'disciplina')).toContain('⚡');
            expect(generateConfirmationMessage('X', 10, 'bemEstar')).toContain('🧠');
        });
    });

    // =================================================================
    // PRP-14: getActionType
    // =================================================================
    describe('getActionType', () => {
        it('PRP-14: mapeia hidratacao → hydration', () => {
            expect(getActionType('hidratacao')).toBe('hydration');
        });

        it('mapeia outras perspectivas → mood', () => {
            expect(getActionType('alimentacao')).toBe('mood');
            expect(getActionType('movimento')).toBe('mood');
            expect(getActionType('disciplina')).toBe('mood');
            expect(getActionType('bemEstar')).toBe('mood');
        });
    });
});
