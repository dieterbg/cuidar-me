import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

// --- Mock container (mutável para cada test) ---
const mockContainer = { supabase: null as any, adminSupabase: null as any };

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/lib/supabase-admin', () => ({
    createAdminClient: vi.fn(() => mockContainer.adminSupabase),
}));

vi.mock('@/lib/supabase-transforms', () => ({
    transformPatientFromSupabase: vi.fn((row: any) => ({
        id: row.id,
        fullName: row.full_name,
        status: row.status || 'active',
    })),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

import {
    getPatients,
    getPatientProfileByUserId,
    getPatientDetails,
    createPatientRecord,
    updatePatient,
    deletePatient,
    addHealthMetric,
} from '@/ai/actions/patients';

describe('Server Action: Patients', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];
    let adminMockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        const adminSb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockContainer.adminSupabase = adminSb.mock;
        mockFrom = sb.mockFrom;
        adminMockFrom = adminSb.mockFrom;

        // Default auth mock
        sb.mock.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
        });
    });

    // =================================================================
    // PAT-01/02: getPatients
    // =================================================================
    describe('getPatients', () => {
        it('PAT-01: retorna lista transformada de pacientes', async () => {
            // Mock profiles for role check
            mockFrom('profiles', { data: { role: 'admin' }, error: null });
            adminMockFrom('patients', {
                data: [
                    { id: 'p1', full_name: 'Maria' },
                    { id: 'p2', full_name: 'João' },
                ],
                error: null,
            });

            const result = await getPatients();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('p1');
        });

        it('PAT-02: retorna array vazio se erro', async () => {
            mockFrom('profiles', { data: { role: 'admin' }, error: null });
            adminMockFrom('patients', { data: null, error: { message: 'DB error' } });

            const result = await getPatients();
            expect(result).toEqual([]);
        });
    });

    // =================================================================
    // PAT-03/04: getPatientProfileByUserId
    // =================================================================
    describe('getPatientProfileByUserId', () => {
        it('PAT-03: retorna paciente por userId', async () => {
            mockFrom('patients', { data: { id: 'p1', full_name: 'Maria' }, error: null });

            const result = await getPatientProfileByUserId('user-1');
            expect(result).not.toBeNull();
            expect(result!.id).toBe('p1');
        });

        it('PAT-04: retorna null se não encontrar', async () => {
            mockFrom('patients', { data: null, error: { message: 'not found' } });

            const result = await getPatientProfileByUserId('fake-id');
            expect(result).toBeNull();
        });
    });

    // =================================================================
    // PAT-05: getPatientDetails
    // =================================================================
    describe('getPatientDetails', () => {
        it('PAT-05: retorna patient + metrics + videos + messages', async () => {
            adminMockFrom('patients', { data: { id: 'p1', full_name: 'Maria' }, error: null });
            adminMockFrom('health_metrics', { data: [{ id: 'm1', weight_kg: 80, date: '2026-01-01' }], error: null });
            adminMockFrom('sent_videos', { data: [{ id: 'sv1', video_id: 'v1', patient_id: 'p1', sent_at: '2026-01-01' }], error: null });
            adminMockFrom('messages', { data: [{ id: 'msg1', sender: 'patient', text: 'Olá', created_at: '2026-01-01' }], error: null });

            const result = await getPatientDetails('p1');

            expect(result.patient).not.toBeNull();
            expect(result.metrics).toHaveLength(1);
            expect(result.sentVideos).toHaveLength(1);
            expect(result.messages).toHaveLength(1);
        });

        it('retorna vazio se paciente não encontrado', async () => {
            adminMockFrom('patients', { data: null, error: { message: 'not found' } });

            const result = await getPatientDetails('fake');
            expect(result.patient).toBeNull();
            expect(result.metrics).toEqual([]);
        });
    });

    // =================================================================
    // PAT-06: createPatientRecord
    // =================================================================
    describe('createPatientRecord', () => {
        it('PAT-06: cria paciente com campos corretos', async () => {
            // Admin mock for user verification
            adminMockFrom('profiles', { data: { id: 'user-1', role: 'paciente' }, error: null });
            adminMockFrom('patients', { data: null, error: { code: 'PGRST116', message: 'not found' } });
            mockFrom('patients', { data: { id: 'new-p1' }, error: null });

            const result = await createPatientRecord({
                fullName: 'Ana Souza',
                email: 'ana@test.com',
                userId: 'user-1',
                whatsappNumber: 'whatsapp:+5511999',
            });

            expect(result.success).toBe(true);
            expect(result.patientId).toBe('new-p1');
        });
    });

    // =================================================================
    // PAT-08: updatePatient
    // =================================================================
    describe('updatePatient', () => {
        it('PAT-08: atualiza campos camelCase → snake_case', async () => {
            mockFrom('profiles', { data: { role: 'admin' }, error: null });
            adminMockFrom('patients', { data: null, error: null });

            const result = await updatePatient('p1', {
                fullName: 'Maria Silva Updated',
                status: 'active',
            } as any);

            expect(result.success).toBe(true);
        });

        it('retorna success se nenhum campo para atualizar', async () => {
            const result = await updatePatient('p1', {} as any);
            expect(result.success).toBe(true);
        });
    });

    // =================================================================
    // PAT-09: deletePatient
    // =================================================================
    describe('deletePatient', () => {
        it('PAT-09: remove paciente por ID', async () => {
            mockFrom('patients', { data: null, error: null });

            const result = await deletePatient('p1');
            expect(result.success).toBe(true);
        });

        it('retorna erro se falha', async () => {
            mockFrom('patients', { data: null, error: { message: 'FK violation' } });

            const result = await deletePatient('p1');
            expect(result.success).toBe(false);
        });
    });

    // =================================================================
    // PAT-10: addHealthMetric
    // =================================================================
    describe('addHealthMetric', () => {
        it('PAT-10: insere métrica de saúde', async () => {
            mockFrom('health_metrics', { data: null, error: null });

            const result = await addHealthMetric('p1', { weight: 80, glucoseLevel: 95 });
            expect(result.success).toBe(true);
        });

        it('retorna erro se falha na inserção', async () => {
            mockFrom('health_metrics', { data: null, error: { message: 'insert error' } });

            const result = await addHealthMetric('p1', { weight: 80 });
            expect(result.success).toBe(false);
        });
    });
});
