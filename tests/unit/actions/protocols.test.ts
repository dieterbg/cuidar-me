import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

// --- Mock container ---
const mockContainer = { supabase: null as any };

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/lib/supabase-server-utils', () => ({
    getCurrentUser: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'admin' }),
}));

import {
    getProtocols,
    addProtocol,
    deleteProtocol,
    assignProtocolToPatient,
    unassignProtocolFromPatient,
} from '@/ai/actions/protocols';

describe('Server Action: Protocols', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    // =================================================================
    // PTC-01: getProtocols lista protocolos ativos
    // =================================================================
    describe('getProtocols', () => {
        it('PTC-01: lista protocolos ativos com steps', async () => {
            mockFrom('protocols', {
                data: [
                    {
                        id: 'prot1',
                        name: 'Protocolo 21 Dias',
                        description: 'Reeducação',
                        duration_days: 21,
                        eligible_plans: ['premium'],
                        protocol_steps: [
                            { day: 2, title: 'Dia 2', message: 'Msg 2', is_gamification: false, perspective: null },
                            { day: 1, title: 'Dia 1', message: 'Msg 1', is_gamification: true, perspective: 'hidratacao' },
                        ],
                    },
                ],
                error: null,
            });

            const result = await getProtocols();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Protocolo 21 Dias');
            expect(result[0].durationDays).toBe(21);
            // Steps should be sorted by day
            expect(result[0].messages[0].day).toBe(1);
            expect(result[0].messages[1].day).toBe(2);
        });

        it('retorna array vazio se erro', async () => {
            mockFrom('protocols', { data: null, error: { message: 'error' } });
            const result = await getProtocols();
            expect(result).toEqual([]);
        });
    });

    // =================================================================
    // PTC-02: assignProtocolToPatient
    // =================================================================
    describe('assignProtocolToPatient', () => {
        it('PTC-02: ativa protocolo para paciente', async () => {
            mockFrom('patient_protocols', { data: null, error: null });

            const result = await assignProtocolToPatient('p1', 'prot1', 75);

            expect(result.success).toBe(true);
            // Should call update (deactivate previous) and insert (new)
            const fromCalls = mockContainer.supabase.from.mock.calls;
            const ptProtocolCalls = fromCalls.filter((c: any) => c[0] === 'patient_protocols');
            expect(ptProtocolCalls.length).toBeGreaterThanOrEqual(2);
        });

        it('retorna erro se inserção falha', async () => {
            mockFrom('patient_protocols', { data: null, error: { message: 'FK error' } });

            const result = await assignProtocolToPatient('p1', 'fake-prot', null);
            expect(result.success).toBe(false);
        });
    });

    // =================================================================
    // PTC-03: addProtocol insere com steps
    // =================================================================
    describe('addProtocol', () => {
        it('PTC-03: insere protocolo com steps', async () => {
            mockFrom('protocols', { data: { id: 'new-prot' }, error: null });
            mockFrom('protocol_steps', { data: null, error: null });

            const result = await addProtocol({
                name: 'Novo Protocolo',
                description: 'Teste',
                durationDays: 7,
                eligiblePlans: ['premium'],
                messages: [
                    { day: 1, title: 'Dia 1', message: 'Olá', isGamification: false },
                ],
            } as any);

            expect(result.success).toBe(true);
            expect(result.protocolId).toBe('new-prot');
        });
    });

    // =================================================================
    // PTC-04: deleteProtocol desativa
    // =================================================================
    describe('deleteProtocol', () => {
        it('PTC-04: desativa protocolo (soft delete)', async () => {
            mockFrom('protocols', { data: null, error: null });

            const result = await deleteProtocol('prot1');

            expect(result.success).toBe(true);
        });

        it('retorna erro se falha', async () => {
            mockFrom('protocols', { data: null, error: { message: 'error' } });

            const result = await deleteProtocol('prot1');
            expect(result.success).toBe(false);
        });
    });

    // =================================================================
    // unassignProtocolFromPatient
    // =================================================================
    describe('unassignProtocolFromPatient', () => {
        it('desativa protocolo do paciente', async () => {
            mockFrom('patient_protocols', { data: null, error: null });

            const result = await unassignProtocolFromPatient('p1');
            expect(result.success).toBe(true);
        });
    });
});
