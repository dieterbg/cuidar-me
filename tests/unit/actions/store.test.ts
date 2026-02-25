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

import { purchaseStoreItem, getUserTransactions } from '@/ai/actions/store';

describe('Server Action: Store', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    function makePatient(totalPoints = 500, streakFreezes = 0) {
        return {
            id: 'p1',
            gamification: {
                totalPoints,
                level: 3,
                badges: [],
                streak: {
                    currentStreak: 3,
                    longestStreak: 5,
                    lastActivityDate: null,
                    streakFreezes,
                    freezesUsedThisMonth: 0,
                },
            },
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    // =================================================================
    // STO-01: deduz pontos e registra transação
    // =================================================================
    it('STO-01: deduz pontos e registra transação', async () => {
        mockFrom('patients', { data: makePatient(500, 0), error: null });
        mockFrom('transactions', { data: null, error: null });

        const result = await purchaseStoreItem('user-1', 'streak_freeze');

        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(300); // 500 - 200
        expect(result.message).toContain('sucesso');
    });

    // =================================================================
    // STO-02: rejeita se saldo insuficiente
    // =================================================================
    it('STO-02: rejeita se saldo insuficiente', async () => {
        mockFrom('patients', { data: makePatient(50), error: null });

        const result = await purchaseStoreItem('user-1', 'streak_freeze');

        expect(result.success).toBe(false);
        expect(result.message).toContain('insuficiente');
    });

    // =================================================================
    // STO-03: rejeita se item não existe
    // =================================================================
    it('STO-03: rejeita se item não existe', async () => {
        const result = await purchaseStoreItem('user-1', 'fake_item');

        expect(result.success).toBe(false);
        expect(result.message).toContain('não encontrado');
    });

    // =================================================================
    // STO-04: streak_freeze adiciona ao limite
    // =================================================================
    it('STO-04: streak_freeze adiciona ao streakFreezes', async () => {
        mockFrom('patients', { data: makePatient(500, 1), error: null });
        mockFrom('transactions', { data: null, error: null });

        const result = await purchaseStoreItem('user-1', 'streak_freeze');

        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(300);
    });

    // =================================================================
    // STO-05: rejeita streak_freeze se já tem 2
    // =================================================================
    it('STO-05: rejeita streak_freeze se já tem 2', async () => {
        mockFrom('patients', { data: makePatient(500, 2), error: null });

        const result = await purchaseStoreItem('user-1', 'streak_freeze');

        expect(result.success).toBe(false);
        expect(result.message).toContain('máximo');
    });

    // =================================================================
    // STO-06: getUserTransactions retorna histórico e saldo
    // =================================================================
    describe('getUserTransactions', () => {
        it('STO-06: retorna histórico ordenado e saldo', async () => {
            mockFrom('patients', { data: makePatient(300), error: null });
            mockFrom('transactions', {
                data: [
                    { id: 'tx1', item_id: 'streak_freeze', item_name: 'Proteção', cost: 200, transaction_type: 'purchase', created_at: '2026-01-01' },
                ],
                error: null,
            });

            const result = await getUserTransactions('user-1');

            expect(result.balance).toBe(300);
            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0].item_id).toBe('streak_freeze');
        });

        it('retorna vazio se paciente não encontrado', async () => {
            mockFrom('patients', { data: null, error: { message: 'not found' } });

            const result = await getUserTransactions('fake');

            expect(result.transactions).toEqual([]);
            expect(result.balance).toBe(0);
        });
    });

    // =================================================================
    // Error: paciente não encontrado na compra
    // =================================================================
    it('retorna erro se paciente não encontrado na compra', async () => {
        mockFrom('patients', { data: null, error: { message: 'not found' } });

        const result = await purchaseStoreItem('fake', 'streak_freeze');

        expect(result.success).toBe(false);
    });
});
