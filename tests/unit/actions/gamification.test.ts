import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

// --- Mock container ---
const mockContainer = { supabase: null as any };

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

vi.mock('@/lib/level-system', () => ({
    calculateLevel: vi.fn((pts: number) => {
        if (pts >= 500) return 5;
        if (pts >= 200) return 3;
        return 1;
    }),
    getLevelName: vi.fn((lvl: number) => `Nível ${lvl}`),
}));

// Mock dynamic import of badges
vi.mock('@/ai/actions/badges', () => ({
    awardNewBadges: vi.fn().mockResolvedValue({ success: true, newBadges: [], message: '' }),
}));

import { registerQuickAction } from '@/ai/actions/gamification';

describe('Server Action: Gamification', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    function makePatient(overrides: any = {}) {
        return {
            id: 'p1',
            user_id: 'user-1',
            gamification: {
                totalPoints: 100,
                level: 1,
                badges: [],
                weeklyProgress: {
                    perspectives: {
                        hidratacao: { current: 0, goal: 5, isComplete: false },
                        bemEstar: { current: 0, goal: 5, isComplete: false },
                        alimentacao: { current: 0, goal: 5, isComplete: false },
                        movimento: { current: 0, goal: 5, isComplete: false },
                        disciplina: { current: 0, goal: 5, isComplete: false },
                    },
                },
                streak: { currentStreak: 3, longestStreak: 5, lastActivityDate: null, streakFreezes: 2, freezesUsedThisMonth: 0 },
            },
            ...overrides,
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    // =================================================================
    // GAM-01: hydration +10 pts
    // =================================================================
    it('GAM-01: hydration soma +10 pts', async () => {
        mockFrom('patients', { data: makePatient(), error: null });

        const result = await registerQuickAction('user-1', 'hydration');

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(10);
        expect(result.message).toContain('10');
    });

    // =================================================================
    // GAM-02: mood +15 pts
    // =================================================================
    it('GAM-02: mood soma +15 pts', async () => {
        mockFrom('patients', { data: makePatient(), error: null });

        const result = await registerQuickAction('user-1', 'mood');

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(15);
    });

    // =================================================================
    // GAM-03: perspectiva override
    // =================================================================
    it('GAM-03: perspectiva override funciona', async () => {
        mockFrom('patients', { data: makePatient(), error: null });

        const result = await registerQuickAction('user-1', 'hydration', 'alimentacao');

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(10);
    });

    // =================================================================
    // GAM-04: bônus +50 ao completar meta semanal
    // =================================================================
    it('GAM-04: bônus +50 quando completa meta semanal', async () => {
        const patient = makePatient();
        patient.gamification.weeklyProgress.perspectives.hidratacao.current = 4; // Will become 5 → complete

        mockFrom('patients', { data: patient, error: null });

        const result = await registerQuickAction('user-1', 'hydration');

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(60); // 10 + 50 bonus
        expect(result.message).toContain('Meta Semanal');
    });

    // =================================================================
    // GAM-05: atualiza nível quando sobe
    // =================================================================
    it('GAM-05: atualiza nível quando sobe de nível', async () => {
        const patient = makePatient();
        patient.gamification.totalPoints = 490; // +10 = 500 → level 5

        mockFrom('patients', { data: patient, error: null });

        const result = await registerQuickAction('user-1', 'hydration');

        expect(result.success).toBe(true);
        expect(result.message).toContain('PARABÉNS');
    });

    // =================================================================
    // GAM-06: retorna erro se paciente não encontrado
    // =================================================================
    it('GAM-06: retorna erro se paciente não encontrado', async () => {
        mockFrom('patients', { data: null, error: { message: 'not found' } });

        const result = await registerQuickAction('fake-user', 'hydration');

        expect(result.success).toBe(false);
        expect(result.pointsEarned).toBe(0);
    });
});
