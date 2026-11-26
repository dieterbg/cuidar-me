import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChainMock, createMockSupabase } from '../../helpers/supabase-mock-helper';

// --- Mock container (mutável para cada test) ---
const mockContainer = { supabase: null as any, adminSupabase: null as any };

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/lib/supabase-admin', () => ({
    createAdminClient: vi.fn(() => mockContainer.adminSupabase),
}));

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(() => mockContainer.adminSupabase),
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

vi.mock('@/lib/utils', () => ({
    normalizeBrazilianNumber: vi.fn((val: string) => 'whatsapp:+55' + val.replace(/\D/g, '')),
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
        sb.mockFrom('profiles', { data: { role: 'admin' }, error: null });
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
            adminMockFrom('attention_requests', { data: [], count: 0, error: null });

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
        const consentAt = '2026-11-25T10:00:00Z';
        const consent = {
            privacy_consent_at: consentAt,
            whatsapp_consent_at: consentAt,
            ai_consent_at: consentAt,
        };
        const account = {
            id: 'user-1', email: 'patient@example.test',
            user_metadata: { ...consent, invite_plan: 'vip', invite_pre_approved: true },
        };
        const profile = { role: 'paciente', display_name: 'Paciente de teste', phone: '(11) 90000-0000' };

        beforeEach(() => {
            mockContainer.supabase.auth.getUser.mockResolvedValue({ data: { user: account }, error: null });
            mockFrom('profiles', { data: profile, error: null });
            adminMockFrom('invite_tokens', { data: null, error: null });
        });

        it('reaproveita os dados e consentimentos sem confiar no plano editável da conta', async () => {
            const initial = createChainMock();
            const insert = createChainMock({ data: { id: 'p1', status: 'active' }, error: null });
            mockContainer.adminSupabase.from
                .mockReturnValueOnce(initial)
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(insert);

            const result = await createPatientRecord();
            expect(result).toMatchObject({ success: true, patient: { id: 'p1', status: 'active' } });
            expect(initial.eq).toHaveBeenCalledWith('user_id', 'user-1');
            expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-1', full_name: 'Paciente de teste', email: 'patient@example.test',
                whatsapp_number: 'whatsapp:+5511900000000', plan: 'freemium', status: 'active',
                ...consent,
            }));
            expect(mockContainer.supabase.from).not.toHaveBeenCalledWith('patients');
        });

        it('pede somente o WhatsApp quando o restante está salvo', async () => {
            mockFrom('profiles', { data: { ...profile, phone: '' }, error: null });
            await expect(createPatientRecord()).resolves.toMatchObject({
                success: false, missing: { name: false, phone: true, consent: false },
            });
            expect(mockContainer.adminSupabase.from).not.toHaveBeenCalledWith('invite_tokens');
        });

        it('reutiliza um cadastro existente e preserva o status pendente', async () => {
            const existing = createChainMock({ data: { id: 'existing', status: 'pending' }, error: null });
            mockContainer.adminSupabase.from.mockReturnValueOnce(existing);
            await expect(createPatientRecord()).resolves.toMatchObject({
                success: true, patient: { id: 'existing', status: 'pending' },
            });
            expect(existing.insert).not.toHaveBeenCalled();
            expect(mockContainer.adminSupabase.from).not.toHaveBeenCalledWith('invite_tokens');
        });

        it('usa o plano do convite consumido pela conta autenticada', async () => {
            const invite = createChainMock({ data: { plan: 'premium' }, error: null });
            const insert = createChainMock({ data: { id: 'p1' }, error: null });
            mockContainer.adminSupabase.from
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(invite)
                .mockReturnValueOnce(insert);
            await expect(createPatientRecord()).resolves.toMatchObject({ success: true });
            expect(invite.eq).toHaveBeenCalledWith('used_by', 'user-1');
            expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ plan: 'premium' }));
        });

        it('mantém o cadastro anterior intacto quando o WhatsApp já foi usado por outra conta', async () => {
            const duplicate = createChainMock({ data: null, error: { code: '23505' } });
            const owned = createChainMock();
            mockContainer.adminSupabase.from
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(duplicate)
                .mockReturnValueOnce(owned);
            await expect(createPatientRecord()).resolves.toMatchObject({
                success: false, error: expect.stringContaining('WhatsApp já está cadastrado'),
                missing: { name: false, phone: true, consent: false },
            });
            expect(owned.eq).toHaveBeenCalledWith('user_id', 'user-1');
            expect(owned.update).not.toHaveBeenCalled();
        });

        it('detecta o mesmo telefone em cadastros legados sem alterar dados existentes', async () => {
            const legacy = createChainMock({ data: { id: 'legacy' }, error: null });
            mockContainer.adminSupabase.from
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(legacy)
                .mockReturnValueOnce(createChainMock());
            await expect(createPatientRecord()).resolves.toMatchObject({
                success: false, missing: { name: false, phone: true, consent: false },
            });
            expect(legacy.in).toHaveBeenCalledWith('whatsapp_number', expect.arrayContaining(['11900000000', '(11) 90000-0000']));
            expect(legacy.update).not.toHaveBeenCalled();
            expect(mockContainer.adminSupabase.from).not.toHaveBeenCalledWith('invite_tokens');
        });

        it('recupera o registro existente se outra tentativa concluir primeiro', async () => {
            mockContainer.adminSupabase.from
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock())
                .mockReturnValueOnce(createChainMock({ data: null, error: { code: '23505' } }))
                .mockReturnValueOnce(createChainMock({ data: { id: 'created-first', status: 'active' }, error: null }));
            await expect(createPatientRecord()).resolves.toMatchObject({
                success: true, patient: { id: 'created-first' },
            });
        });

        it('bloqueia a criação para uma conta da clínica', async () => {
            mockFrom('profiles', { data: { ...profile, role: 'assistente' }, error: null });
            await expect(createPatientRecord()).resolves.toMatchObject({ success: false });
            expect(mockContainer.adminSupabase.from).not.toHaveBeenCalled();
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
            adminMockFrom('health_metrics', { data: null, error: null });

            const result = await addHealthMetric('p1', { weight: 80, glucoseLevel: 95 });
            expect(result.success).toBe(true);
        });

        it('retorna erro se falha na inserção', async () => {
            adminMockFrom('health_metrics', { data: null, error: { message: 'insert error' } });

            const result = await addHealthMetric('p1', { weight: 80 });
            expect(result.success).toBe(false);
        });

        it('bloqueia metrica quando paciente nao pertence ao usuario', async () => {
            mockFrom('profiles', { data: { role: 'paciente' }, error: null });
            adminMockFrom('patients', { data: null, error: null });
            adminMockFrom('health_metrics', { data: null, error: null });

            const result = await addHealthMetric('p1', { weight: 80 });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Acesso negado');
            expect(mockContainer.adminSupabase.from).not.toHaveBeenCalledWith('health_metrics');
        });
    });
});
