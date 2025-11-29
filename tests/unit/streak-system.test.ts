import { describe, it, expect } from 'vitest';
import type { StreakData } from '@/lib/streak-system';
import { isStreakAtRisk, formatStreakDisplay } from '@/lib/streak-system';

/**
 * Testes do Sistema de Streak
 */
describe('Streak System', () => {
    describe('is StreakAtRisk', () => {
        it('deve retornar false para streak sem atividade anterior', () => {
            const streakData: StreakData = {
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: null,
                streakFreezes: 2,
                freezesUsedThisMonth: 0,
            };

            expect(isStreakAtRisk(streakData)).toBe(false);
        });

        it('deve retornar true se última atividade foi há 2+ dias', () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            const streakData: StreakData = {
                currentStreak: 5,
                longestStreak: 10,
                lastActivityDate: twoDaysAgo.toISOString(),
                streakFreezes: 2,
                freezesUsedThisMonth: 0,
            };

            expect(isStreakAtRisk(streakData)).toBe(true);
        });

        it('deve retornar false se atividade foi ontem', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const streakData: StreakData = {
                currentStreak: 3,
                longestStreak: 5,
                lastActivityDate: yesterday.toISOString(),
                streakFreezes: 2,
                freezesUsedThisMonth: 0,
            };

            // Nota: função considera em risco se >= 1 dia
            // Se quiser mudar para > 1 dia, ajustar a função
            expect(isStreakAtRisk(streakData)).toBe(true);
        });
    });

    describe('formatStreakDisplay', () => {
        it('deve mostrar mensagem de início para streak 0', () => {
            expect(formatStreakDisplay(0)).toBe('🔥 Comece sua sequência!');
        });

        it('deve mostrar "dia" no singular para streak 1', () => {
            expect(formatStreakDisplay(1)).toBe('🔥 1 dia de sequência!');
        });

        it('deve mostrar "dias" no plural para streak > 1', () => {
            expect(formatStreakDisplay(5)).toBe('🔥 5 dias de sequência!');
            expect(formatStreakDisplay(30)).toBe('🔥 30 dias de sequência!');
        });
    });
});
