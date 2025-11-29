import { describe, it, expect } from 'vitest';
import { checkBadgeCriteria, checkBadgeUnlocks, type PatientStats } from '@/lib/badge-unlock-logic';
import { BADGE_CATALOG } from '@/lib/badge-catalog';

/**
 * Testes do Sistema de Badges
 */
describe('Badge System', () => {
    const mockStats: PatientStats = {
        streak: { current: 10, longest: 15 },
        points: { total: 750 },
        level: { current: 5 },
        perspectives: {
            alimentacao: { checkins: 25, perfectCheckins: 15 },
            movimento: { checkins: 12, perfectCheckins: 0 },
            hidratacao: { checkins: 40, perfectCheckins: 0 },
            disciplina: { checkins: 5, perfectCheckins: 0 },
            bemEstar: { checkins: 8, perfectCheckins: 0 },
        },
        community: {
            comments: 12,
            reactions: 20,
            posts: 3,
        },
        special: {
            perfectWeeks: 2,
            weightGoalReached: false,
        },
    };

    describe('checkBadgeCriteria', () => {
        it('deve desbloquear badge de streak quando critério atendido', () => {
            const badge7Days = BADGE_CATALOG.find(b => b.id === 'streak_7')!;
            expect(checkBadgeCriteria(badge7Days, mockStats)).toBe(true);

            const badge30Days = BADGE_CATALOG.find(b => b.id === 'streak_30')!;
            expect(checkBadgeCriteria(badge30Days, mockStats)).toBe(false);
        });

        it('deve desbloquear badge de pontos quando critério atendido', () => {
            const badge500 = BADGE_CATALOG.find(b => b.id === 'points_500')!;
            expect(checkBadgeCriteria(badge500, mockStats)).toBe(true);

            const badge1000 = BADGE_CATALOG.find(b => b.id === 'points_1000')!;
            expect(checkBadgeCriteria(badge1000, mockStats)).toBe(false);
        });

        it('deve verificar perspectivas corretamente', () => {
            const hydrationBadge = BADGE_CATALOG.find(b => b.id === 'hydration_master')!;
            expect(checkBadgeCriteria(hydrationBadge, mockStats)).toBe(true); // 40 >= 30

            const athleteBadge = BADGE_CATALOG.find(b => b.id === 'athlete')!;
            expect(checkBadgeCriteria(athleteBadge, mockStats)).toBe(false); // 12 < 20
        });

        it('deve verificar comunidade corretamente', () => {
            const commentBadge = BADGE_CATALOG.find(b => b.id === 'community_10_comments')!;
            expect(checkBadgeCriteria(commentBadge, mockStats)).toBe(true); // 12 >= 10
        });
    });

    describe('checkBadgeUnlocks', () => {
        it('deve retornar apenas badges novos', () => {
            const currentBadges = ['streak_7', 'points_500'];
            const newBadges = checkBadgeUnlocks(currentBadges, mockStats);

            // Não deve incluir badges que já tem
            expect(newBadges).not.toContain('streak_7');
            expect(newBadges).not.toContain('points_500');

            // Deve incluir hydration_master (40 check-ins >= 30)
            expect(newBadges).toContain('hydration_master');

            // Deve incluir community_10_comments (12 >= 10)
            expect(newBadges).toContain('community_10_comments');
        });

        it('deve retornar array vazio se não houver badges novos', () => {
            const allBadges = BADGE_CATALOG.map(b => b.id);
            const newBadges = checkBadgeUnlocks(allBadges, mockStats);

            expect(newBadges).toEqual([]);
        });

        it('deve retornar todos os badges elegíveis se começar do zero', () => {
            const newBadges = checkBadgeUnlocks([], mockStats);

            // Deve conter pelo menos os badges que as stats atendem
            expect(newBadges.length).toBeGreaterThan(0);
            expect(newBadges).toContain('streak_7'); // 10 >= 7
            expect(newBadges).toContain('points_500'); // 750 >= 500
            expect(newBadges).toContain('hydration_master'); // 40 >= 30
        });
    });
});
