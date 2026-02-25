import { describe, it, expect } from 'vitest';
import {
    getNextCheckinStep,
    getCheckinStepMessage,
    processCheckinResponse,
    calculateCheckinPoints,
    generateCheckinSummary,
} from '@/ai/daily-checkin';

/**
 * Testes do Sistema de Check-in Diário
 * Funções puras — sem dependências externas
 */
describe('Daily Checkin', () => {

    // =================================================================
    // CHK-01/02/03: getNextCheckinStep
    // =================================================================
    describe('getNextCheckinStep', () => {
        it('CHK-01: avança corretamente para plano freemium (retorna complete direto)', () => {
            expect(getNextCheckinStep('hydration', 'freemium', false)).toBe('complete');
        });

        it('CHK-02: avança corretamente para plano premium', () => {
            expect(getNextCheckinStep('hydration', 'premium', false)).toBe('breakfast');
            expect(getNextCheckinStep('breakfast', 'premium', false)).toBe('lunch');
            expect(getNextCheckinStep('lunch', 'premium', false)).toBe('dinner');
            expect(getNextCheckinStep('dinner', 'premium', false)).toBe('snacks');
            expect(getNextCheckinStep('snacks', 'premium', false)).toBe('activity');
            expect(getNextCheckinStep('activity', 'premium', false)).toBe('wellbeing');
            expect(getNextCheckinStep('wellbeing', 'premium', false)).toBe('complete');
        });

        it('CHK-03: inclui peso em dia de pesagem', () => {
            expect(getNextCheckinStep('wellbeing', 'premium', true)).toBe('weight');
            expect(getNextCheckinStep('weight', 'premium', true)).toBe('complete');
        });

        it('funciona com plano VIP', () => {
            expect(getNextCheckinStep('hydration', 'vip', false)).toBe('breakfast');
        });

        it('retorna complete para step inválido', () => {
            expect(getNextCheckinStep('complete', 'premium', false)).toBe('complete');
            expect(getNextCheckinStep('invalid' as any, 'premium', false)).toBe('complete');
        });
    });

    // =================================================================
    // CHK-04: getCheckinStepMessage
    // =================================================================
    describe('getCheckinStepMessage', () => {
        it('CHK-04: gera mensagem por step com nome do paciente', () => {
            const msg = getCheckinStepMessage('hydration', {}, 'Maria Silva');
            expect(msg).toContain('Maria');
            expect(msg).toContain('Água');
        });

        it('gera mensagem para cada step', () => {
            expect(getCheckinStepMessage('breakfast', {}, 'João')).toContain('Café da manhã');
            expect(getCheckinStepMessage('lunch', {}, 'João')).toContain('Almoço');
            expect(getCheckinStepMessage('dinner', {}, 'João')).toContain('Jantar');
            expect(getCheckinStepMessage('snacks', {}, 'João')).toContain('Lanches');
            expect(getCheckinStepMessage('activity', {}, 'João')).toContain('Atividade');
            expect(getCheckinStepMessage('wellbeing', {}, 'João')).toContain('sentindo');
            expect(getCheckinStepMessage('weight', {}, 'João')).toContain('Pesagem');
        });

        it('gera resumo para step complete', () => {
            const msg = getCheckinStepMessage('complete', { hydration: 'yes' }, 'João');
            expect(msg).toContain('Check-in completo');
            expect(msg).toContain('pontos');
        });
    });

    // =================================================================
    // CHK-05 a CHK-10: processCheckinResponse
    // =================================================================
    describe('processCheckinResponse', () => {
        it('CHK-05: processa hidratação (👍/🤏/👎)', () => {
            expect(processCheckinResponse('hydration', '👍', {}).data.hydration).toBe('yes');
            expect(processCheckinResponse('hydration', '🤏', {}).data.hydration).toBe('almost');
            expect(processCheckinResponse('hydration', '👎', {}).data.hydration).toBe('no');
            expect(processCheckinResponse('hydration', 'sim', {}).data.hydration).toBe('yes');
            expect(processCheckinResponse('hydration', 'não', {}).data.hydration).toBe('no');
        });

        it('CHK-06: processa alimentação (A/B/C)', () => {
            expect(processCheckinResponse('breakfast', 'A', {}).data.breakfast).toBe('A');
            expect(processCheckinResponse('lunch', 'B', {}).data.lunch).toBe('B');
            expect(processCheckinResponse('dinner', 'C', {}).data.dinner).toBe('C');
            // Aceita emojis
            expect(processCheckinResponse('breakfast', '🅰️', {}).data.breakfast).toBe('A');
        });

        it('CHK-07: processa atividade (sim/não)', () => {
            expect(processCheckinResponse('activity', '👍', {}).data.activity).toBe('yes');
            expect(processCheckinResponse('activity', 'sim', {}).data.activity).toBe('yes');
            expect(processCheckinResponse('activity', '👎', {}).data.activity).toBe('no');
            expect(processCheckinResponse('activity', 'não', {}).data.activity).toBe('no');
        });

        it('CHK-08: processa bem-estar (1-5)', () => {
            expect(processCheckinResponse('wellbeing', '😢', {}).data.wellbeing).toBe(1);
            expect(processCheckinResponse('wellbeing', '😕', {}).data.wellbeing).toBe(2);
            expect(processCheckinResponse('wellbeing', '😐', {}).data.wellbeing).toBe(3);
            expect(processCheckinResponse('wellbeing', '😊', {}).data.wellbeing).toBe(4);
            expect(processCheckinResponse('wellbeing', '😄', {}).data.wellbeing).toBe(5);
            // Aceita texto
            expect(processCheckinResponse('wellbeing', 'ótimo', {}).data.wellbeing).toBe(5);
            expect(processCheckinResponse('wellbeing', 'ruim', {}).data.wellbeing).toBe(2);
        });

        it('CHK-09: processa peso numérico', () => {
            const r1 = processCheckinResponse('weight', '85.5', {});
            expect(r1.data.weight).toBe(85.5);
            expect(r1.error).toBeUndefined();

            const r2 = processCheckinResponse('weight', '90,3', {});
            expect(r2.data.weight).toBe(90.3);
        });

        it('CHK-10: rejeita respostas inválidas com mensagem de erro', () => {
            expect(processCheckinResponse('hydration', 'xyz', {}).error).toBeDefined();
            expect(processCheckinResponse('breakfast', 'xyz', {}).error).toBeDefined();
            expect(processCheckinResponse('activity', 'xyz', {}).error).toBeDefined();
            expect(processCheckinResponse('wellbeing', 'xyz', {}).error).toBeDefined();
            expect(processCheckinResponse('weight', '15', {}).error).toBeDefined();
            expect(processCheckinResponse('weight', 'abc', {}).error).toBeDefined();
        });

        it('processa snacks (sim/não)', () => {
            expect(processCheckinResponse('snacks', '👍', {}).data.snacks).toBe('yes');
            expect(processCheckinResponse('snacks', '👎', {}).data.snacks).toBe('no');
        });
    });

    // =================================================================
    // CHK-11: calculateCheckinPoints
    // =================================================================
    describe('calculateCheckinPoints', () => {
        it('CHK-11: calcula pontos corretos — dia perfeito', () => {
            const perfectDay = {
                hydration: 'yes' as const,
                breakfast: 'A' as const,
                lunch: 'A' as const,
                dinner: 'A' as const,
                snacks: 'yes' as const,
                activity: 'yes' as const,
                activityMinutes: 45,
                wellbeing: 5 as const,
                weight: 80,
            };
            // 15 + 20 + 20 + 20 + 10 + 30 + 45 + 10 + 20 = 190
            expect(calculateCheckinPoints(perfectDay)).toBe(190);
        });

        it('calcula pontos parciais', () => {
            expect(calculateCheckinPoints({ hydration: 'almost' })).toBe(10);
            expect(calculateCheckinPoints({ hydration: 'no' })).toBe(0);
            expect(calculateCheckinPoints({ breakfast: 'C' })).toBe(5);
            expect(calculateCheckinPoints({ activity: 'yes', activityMinutes: 90 })).toBe(90); // 30 + max(60)
            expect(calculateCheckinPoints({ wellbeing: 3 })).toBe(0); // < 4
            expect(calculateCheckinPoints({ wellbeing: 4 })).toBe(10);
        });

        it('calcula pontos para dados vazios', () => {
            expect(calculateCheckinPoints({})).toBe(0);
        });
    });

    // =================================================================
    // CHK-12: generateCheckinSummary
    // =================================================================
    describe('generateCheckinSummary', () => {
        it('CHK-12: gera resumo legível com pontos', () => {
            const data = {
                hydration: 'yes' as const,
                breakfast: 'A' as const,
                lunch: 'A' as const,
                dinner: 'A' as const,
                activity: 'yes' as const,
                activityMinutes: 30,
                wellbeing: 4 as const,
            };
            const summary = generateCheckinSummary(data, 125);

            expect(summary).toContain('Check-in completo');
            expect(summary).toContain('Hidratação: Excelente');
            expect(summary).toContain('Alimentação: Perfeita');
            expect(summary).toContain('30 min');
            expect(summary).toContain('+125 pontos');
        });

        it('mostra peso quando presente', () => {
            const summary = generateCheckinSummary({ weight: 85.5 }, 20);
            expect(summary).toContain('85.5kg');
        });

        it('mostra mensagem negativa para hidratação ruim', () => {
            const summary = generateCheckinSummary({ hydration: 'no' }, 0);
            expect(summary).toContain('Precisa melhorar');
        });
    });
});
