import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    from: vi.fn(),
    serviceFrom: vi.fn(),
    getUser: vi.fn(),
}));

vi.mock('@/lib/authz', () => ({
    requireAdmin: mocks.requireAdmin,
    authErrorMessage: () => 'Erro inesperado',
}));
vi.mock('@/lib/supabase-server', () => ({
    createClient: () => ({ from: mocks.from, auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: () => ({ from: mocks.serviceFrom }),
}));
vi.mock('@/lib/twilio-credentials', () => ({ getTwilioCredentialsInternal: vi.fn() }));

import { getSystemUsers, updateUserRole } from '@/ai/actions/system';
import { getAuditLogs, getLogsStats } from '@/ai/actions/logs';

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.requireAdmin.mockResolvedValue('admin-1');
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
});

afterEach(() => vi.restoreAllMocks());

describe('contas administrativas', () => {
    it('retorna nome e foto nos campos que a tela utiliza', async () => {
        const order = vi.fn().mockResolvedValue({
            data: [{ id: 'user-1', email: 'teste@example.test', display_name: 'Ana', photo_url: null, role: 'pendente' }],
            error: null,
        });
        mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });
        await expect(getSystemUsers()).resolves.toEqual([
            { id: 'user-1', email: 'teste@example.test', displayName: 'Ana', photoURL: null, role: 'pendente' },
        ]);
    });

    it('rejeita uma falha de consulta e preserva o resultado vazio válido', async () => {
        const order = vi.fn()
            .mockResolvedValueOnce({ data: null, error: { message: 'Falha de consulta' } })
            .mockResolvedValueOnce({ data: [], error: null });
        mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

        await expect(getSystemUsers()).rejects.toThrow('Não foi possível carregar as contas.');
        await expect(getSystemUsers()).resolves.toEqual([]);
    });

    it.each([null, { role: 'pendente' }])('não confirma uma alteração sem a função esperada (%j)', async (profile) => {
        const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
        const select = vi.fn().mockReturnValue({ maybeSingle });
        const eq = vi.fn().mockReturnValue({ select });
        mocks.from.mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) });

        await expect(updateUserRole('user-1', 'assistente')).resolves.toMatchObject({ success: false });
        expect(eq).toHaveBeenCalledWith('id', 'user-1');
        expect(select).toHaveBeenCalledWith('role');
    });

    it('confirma a função que o banco retornou após salvar', async () => {
        const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'assistente' }, error: null });
        const eq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }) });
        const update = vi.fn().mockReturnValue({ eq });
        mocks.from.mockReturnValue({ update });

        await expect(updateUserRole('user-1', 'assistente')).resolves.toEqual({ success: true, role: 'assistente' });
        expect(update).toHaveBeenCalledWith({ role: 'assistente' });
    });
});

describe('logs administrativos', () => {
    beforeEach(() => {
        const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' } });
        const eq = vi.fn().mockReturnValue({ maybeSingle });
        mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
    });

    it('distingue falha da trilha de auditoria e consulta sem registros', async () => {
        const limit = vi.fn()
            .mockResolvedValueOnce({ data: null, error: { message: 'Consulta indisponível' } })
            .mockResolvedValueOnce({ data: [], error: null });
        const order = vi.fn().mockReturnValue({ limit });
        mocks.serviceFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) });

        await expect(getAuditLogs()).rejects.toThrow('Não foi possível carregar a trilha de auditoria.');
        await expect(getAuditLogs()).resolves.toEqual([]);
    });

    it('representa as contagens indisponíveis como null e preserva o zero real', async () => {
        for (const result of [
            { count: 0, error: null },
            { count: null, error: { message: 'Consulta indisponível' } },
            { count: 4, error: null },
            { count: null, error: null },
        ]) {
            const gte = vi.fn().mockResolvedValue(result);
            const query = { gte, eq: vi.fn().mockReturnValue({ gte }), in: vi.fn().mockReturnValue({ gte }) };
            mocks.serviceFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(query) });
        }

        await expect(getLogsStats()).resolves.toEqual({
            auditLast24h: 0,
            securityCritical: null,
            webhooksFailed24h: 4,
            webhooks63049_7d: null,
        });
    });
});
