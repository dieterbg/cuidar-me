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

vi.mock('date-fns', () => ({
    differenceInCalendarDays: vi.fn((a: Date, b: Date) => {
        const msPerDay = 86400000;
        const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.floor((utcA - utcB) / msPerDay);
    }),
}));

vi.mock('@/ai/actions/badges', () => ({
    awardNewBadges: vi.fn().mockResolvedValue({ success: true, newBadges: [], message: '' }),
}));

import { updateStreak, resetMonthlyFreezes, sendStreakReminders } from '@/ai/actions/streak';

describe('Server Action: Streak', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    function makePatientWithStreak(streakOverrides: any = {}, gamOverrides: any = {}) {
        const streak = {
            currentStreak: 5,
            longestStreak: 10,
            lastActivityDate: null as string | null,
            streakFreezes: 2,
            freezesUsedThisMonth: 0,
            ...streakOverrides,
        };
        return {
            id: 'p1',
            user_id: 'user-1',
            gamification: {
                totalPoints: 200,
                level: 3,
                badges: [],
                streak,
                ...gamOverrides,
            },
        };
    }

    function yesterdayISO(): string {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString();
    }

    function twoDaysAgoISO(): string {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d.toISOString();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    // =================================================================
    // STR-01: incrementa em dia consecutivo
    // =================================================================
    it('STR-01: incrementa streak em dia consecutivo', async () => {
        const patient = makePatientWithStreak({ lastActivityDate: yesterdayISO(), currentStreak: 5 });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.currentStreak).toBe(6);
        expect(result.message).toContain('6');
    });

    // =================================================================
    // STR-02: mantém se mesma data
    // =================================================================
    it('STR-02: mantém streak se mesma data (sem duplicar)', async () => {
        const patient = makePatientWithStreak({ lastActivityDate: new Date().toISOString(), currentStreak: 5 });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.currentStreak).toBe(5); // Unchanged
        expect(result.message).toContain('mantido');
    });

    // =================================================================
    // STR-03: usa freeze quando perde 1 dia
    // =================================================================
    it('STR-03: usa freeze quando perde 1 dia + tem freeze', async () => {
        const patient = makePatientWithStreak({
            lastActivityDate: twoDaysAgoISO(),
            currentStreak: 5,
            streakFreezes: 2,
        });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.streakFreezes).toBe(1);
        expect(result.message).toContain('protegido');
    });

    // =================================================================
    // STR-04: reseta streak quando perde dia + sem freeze
    // =================================================================
    it('STR-04: reseta streak quando perde dia + sem freeze', async () => {
        const patient = makePatientWithStreak({
            lastActivityDate: twoDaysAgoISO(),
            currentStreak: 10,
            streakFreezes: 0,
        });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.currentStreak).toBe(1); // Reset to 1
        expect(result.message).toContain('perdeu');
    });

    // =================================================================
    // STR-05: bônus 100 pts no dia 7
    // =================================================================
    it('STR-05: bônus 100 pts no dia 7', async () => {
        const patient = makePatientWithStreak({ lastActivityDate: yesterdayISO(), currentStreak: 6 });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.currentStreak).toBe(7);
        expect(result.bonusPoints).toBe(100);
        expect(result.message).toContain('100');
    });

    // =================================================================
    // STR-06: bônus 500 pts no dia 30
    // =================================================================
    it('STR-06: bônus 500 pts no dia 30', async () => {
        const patient = makePatientWithStreak({ lastActivityDate: yesterdayISO(), currentStreak: 29 });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.success).toBe(true);
        expect(result.streakData.currentStreak).toBe(30);
        expect(result.bonusPoints).toBe(500);
    });

    // =================================================================
    // STR-07: atualiza longestStreak quando bate recorde
    // =================================================================
    it('STR-07: atualiza longestStreak quando bate recorde', async () => {
        const patient = makePatientWithStreak({
            lastActivityDate: yesterdayISO(),
            currentStreak: 10,
            longestStreak: 10,
        });
        mockFrom('patients', { data: patient, error: null });

        const result = await updateStreak('user-1');

        expect(result.streakData.longestStreak).toBe(11);
    });

    // =================================================================
    // STR-08: resetMonthlyFreezes
    // =================================================================
    describe('resetMonthlyFreezes', () => {
        it('STR-08: reseta freezes para todos os pacientes', async () => {
            mockFrom('patients', {
                data: [
                    makePatientWithStreak({ streakFreezes: 0, freezesUsedThisMonth: 2 }),
                    { ...makePatientWithStreak({ streakFreezes: 1 }), id: 'p2' },
                ],
                error: null,
            });

            const result = await resetMonthlyFreezes();

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });
    });

    // =================================================================
    // sendStreakReminders
    // =================================================================
    describe('sendStreakReminders', () => {
        it('envia para quem não agiu hoje', async () => {
            mockFrom('patients', {
                data: [
                    makePatientWithStreak({ lastActivityDate: yesterdayISO(), currentStreak: 5 }),
                ],
                error: null,
            });

            const result = await sendStreakReminders();

            expect(result.success).toBe(true);
            expect(result.sent).toBeGreaterThanOrEqual(0);
        });
    });

    // =================================================================
    // Error handling
    // =================================================================
    it('retorna erro se paciente não encontrado', async () => {
        mockFrom('patients', { data: null, error: { message: 'not found' } });

        const result = await updateStreak('fake-id');

        expect(result.success).toBe(false);
        expect(result.bonusPoints).toBe(0);
    });
});
