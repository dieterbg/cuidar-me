import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

const mockContainer = {
    supabase: null as any,
    serviceSupabase: null as any,
};

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(() => mockContainer.serviceSupabase),
}));

vi.mock('@/lib/authz', () => ({
    STAFF_ROLES: ['admin', 'equipe_saude', 'assistente'],
    authErrorMessage: vi.fn((error: unknown) => error instanceof Error ? error.message : 'Erro inesperado'),
    getAuthenticatedUserAndRole: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'paciente' }),
    requireAdmin: vi.fn().mockResolvedValue('admin-1'),
    requirePatientOwnerOrStaff: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'paciente', isStaff: false }),
    requireStaff: vi.fn().mockResolvedValue({ userId: 'staff-1', role: 'admin' }),
}));

import {
    addCommentToTopic,
    createCommunityTopic,
    deleteAllUsers,
    sendCampaignMessage,
    togglePinStatus,
    updateGamificationProgress,
} from '@/ai/actions-extended';
import {
    getAuthenticatedUserAndRole,
    requireAdmin,
    requireStaff,
} from '@/lib/authz';

describe('actions-extended security guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        const serviceSb = createMockSupabase();
        serviceSb.mock.auth.admin.listUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null });
        serviceSb.mock.auth.admin.deleteUser = vi.fn().mockResolvedValue({ data: null, error: null });

        mockContainer.supabase = sb.mock;
        mockContainer.serviceSupabase = serviceSb.mock;
    });

    it('bloqueia criacao de topico em nome de outro usuario', async () => {
        (getAuthenticatedUserAndRole as any).mockResolvedValueOnce({ userId: 'user-1', role: 'paciente' });

        const result = await createCommunityTopic('other-user', 'ana', 'Titulo', 'Texto');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Acesso negado');
        expect(mockContainer.supabase.from).not.toHaveBeenCalledWith('community_topics');
    });

    it('bloqueia comentario em nome de outro usuario', async () => {
        (getAuthenticatedUserAndRole as any).mockResolvedValueOnce({ userId: 'user-1', role: 'paciente' });

        const result = await addCommentToTopic('topic-1', 'other-user', 'ana', 'Comentario');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Acesso negado');
        expect(mockContainer.supabase.from).not.toHaveBeenCalledWith('community_comments');
    });

    it('bloqueia fixar topico quando usuario nao e staff', async () => {
        (requireStaff as any).mockRejectedValueOnce(new Error('Acesso negado'));

        const result = await togglePinStatus('topic-1', true);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Acesso negado');
        expect(mockContainer.serviceSupabase.from).not.toHaveBeenCalled();
    });

    it('bloqueia deleteAllUsers quando usuario nao e admin', async () => {
        (requireAdmin as any).mockRejectedValueOnce(new Error('Acesso negado'));

        const result = await deleteAllUsers();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Acesso negado');
        expect(mockContainer.serviceSupabase.auth.admin.listUsers).not.toHaveBeenCalled();
    });

    it('rejeita campanha com mensagem muito longa antes de consultar pacientes', async () => {
        const result = await sendCampaignMessage(['p1'], 'a'.repeat(1501));

        expect(result.success).toBe(false);
        expect(result.error).toBe('Mensagem invalida');
        expect(mockContainer.serviceSupabase.from).not.toHaveBeenCalled();
    });

    it('rejeita pontuacao manual fora da faixa antes de chamar rpc', async () => {
        const result = await updateGamificationProgress('p1', 'disciplina', 1001);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Pontuacao invalida');
        expect(mockContainer.serviceSupabase.rpc).not.toHaveBeenCalled();
    });
});
