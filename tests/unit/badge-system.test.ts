import { describe, it, expect } from 'vitest';
import { checkBadgeCriteria, checkBadgeUnlocks, extractPatientStats, type PatientStats } from '@/lib/badge-unlock-logic';
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

    // =================================================================
    // BDG-08/09: extractPatientStats
    // =================================================================
    describe('extractPatientStats', () => {
        it('BDG-08: extrai stats de um Patient completo', () => {
            const patient = {
                gamification: {
                    totalPoints: 500,
                    level: '5',
                    badges: [],
                    streak: {
                        currentStreak: 7,
                        longestStreak: 15,
                    },
                    weeklyProgress: {},
                },
            } as any;

            const stats = extractPatientStats(patient);

            expect(stats.streak.current).toBe(7);
            expect(stats.streak.longest).toBe(15);
            expect(stats.points.total).toBe(500);
            expect(stats.level.current).toBe(5);
            expect(stats.perspectives.alimentacao).toEqual({ checkins: 0, perfectCheckins: 0 });
        });

        it('BDG-09: lida com Patient sem gamification', () => {
            const patient = {} as any;
            const stats = extractPatientStats(patient);

            expect(stats.streak.current).toBe(0);
            expect(stats.streak.longest).toBe(0);
            expect(stats.points.total).toBe(0);
            expect(stats.level.current).toBe(1); // Default 'Iniciante' → 1
        });
    });

    // =================================================================
    // BDG-10/11: checkBadgeCriteria special & level types
    // =================================================================
    describe('checkBadgeCriteria — special & level', () => {
        it('BDG-10: desbloqueia badge special (perfectWeeks)', () => {
            const specialBadge = BADGE_CATALOG.find(b => b.criteria.type === 'special' && b.criteria.requirement === 'perfect_4_weeks');
            if (specialBadge) {
                const statsWithPerfectWeeks = { ...mockStats, special: { perfectWeeks: 4, weightGoalReached: false } };
                expect(checkBadgeCriteria(specialBadge, statsWithPerfectWeeks)).toBe(true);

                const statsWithout = { ...mockStats, special: { perfectWeeks: 2, weightGoalReached: false } };
                expect(checkBadgeCriteria(specialBadge, statsWithout)).toBe(false);
            }
        });

        it('BDG-11: desbloqueia badge de level (nível mínimo)', () => {
            const levelBadge = BADGE_CATALOG.find(b => b.criteria.type === 'level');
            if (levelBadge) {
                const highLevelStats = { ...mockStats, level: { current: 20 } };
                expect(checkBadgeCriteria(levelBadge, highLevelStats)).toBe(true);

                const lowLevelStats = { ...mockStats, level: { current: 1 } };
                expect(checkBadgeCriteria(levelBadge, lowLevelStats)).toBe(false);
            }
        });
    });
});
