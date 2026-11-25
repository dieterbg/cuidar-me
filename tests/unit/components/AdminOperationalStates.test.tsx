import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    router: { replace: vi.fn() },
    toast: vi.fn(),
    getSystemUsers: vi.fn(),
    updateUserRole: vi.fn(),
    deleteUser: vi.fn(),
    getLogsStats: vi.fn(),
    getAuditLogs: vi.fn(),
    getSecurityEvents: vi.fn(),
    getBusinessEvents: vi.fn(),
    getTwilioWebhooks: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/use-auth', () => ({
    useAuth: () => ({ profile: { role: 'admin' }, user: { id: 'admin-1' }, loading: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/ai/actions/system', () => ({
    getSystemUsers: mocks.getSystemUsers,
    updateUserRole: mocks.updateUserRole,
    deleteUser: mocks.deleteUser,
}));
vi.mock('@/ai/actions/logs', () => ({
    getLogsStats: mocks.getLogsStats,
    getAuditLogs: mocks.getAuditLogs,
    getSecurityEvents: mocks.getSecurityEvents,
    getBusinessEvents: mocks.getBusinessEvents,
    getTwilioWebhooks: mocks.getTwilioWebhooks,
}));

import AdminPage from '@/app/(dashboard)/admin/page';
import LogsPage from '@/app/(dashboard)/admin/logs/page';

const account = { id: 'user-1', displayName: 'Conta de teste', email: 'teste@example.test', photoURL: null, role: 'pendente' };
const date = '2026-11-25T14:00:00Z';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSystemUsers.mockResolvedValue([account]);
    mocks.getLogsStats.mockResolvedValue({ auditLast24h: 0, securityCritical: null, webhooksFailed24h: 0, webhooks63049_7d: 0 });
    mocks.getAuditLogs.mockResolvedValue([]);
    mocks.getSecurityEvents.mockResolvedValue([]);
    mocks.getBusinessEvents.mockResolvedValue([]);
    mocks.getTwilioWebhooks.mockResolvedValue([]);
});

describe('Admin', () => {
    it('oferece nova tentativa quando a consulta falha e separa o vazio legítimo', async () => {
        mocks.getSystemUsers
            .mockRejectedValueOnce(new Error('Consulta indisponível'))
            .mockResolvedValueOnce([]);
        render(<AdminPage />);

        expect(await screen.findByText('Não foi possível carregar as contas')).toBeInTheDocument();
        expect(screen.queryByText(/Nenhum outro usuário/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByText(/Nenhum outro usuário/)).toBeInTheDocument();
        expect(screen.queryByText('Não foi possível carregar as contas')).not.toBeInTheDocument();
    });

    it('mantém a edição como rascunho até confirmar o perfil salvo', async () => {
        let finishSave!: (result: { success: false; error: string }) => void;
        mocks.updateUserRole
            .mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }))
            .mockResolvedValueOnce({ success: true, role: 'assistente' });
        render(<AdminPage />);

        const role = await screen.findByRole('combobox', { name: 'Perfil de Conta de teste' });
        const save = screen.getByRole('button', { name: 'Salvar perfil de Conta de teste' });
        expect(save).toBeDisabled();
        fireEvent.keyDown(role, { key: 'Enter' });
        fireEvent.keyDown(await screen.findByRole('option', { name: 'Assistente' }), { key: 'Enter' });
        expect(screen.getByText('Perfil confirmado: Pendente')).toBeInTheDocument();
        expect(save).toBeEnabled();

        fireEvent.click(save);
        expect(save).toBeDisabled();
        await act(async () => finishSave({ success: false, error: 'Alteração não confirmada' }));
        expect(screen.getByText('Perfil confirmado: Pendente')).toBeInTheDocument();
        expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Perfil atualizado' }));
        expect(save).toBeEnabled();

        fireEvent.click(save);
        await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
            title: 'Perfil atualizado',
            description: 'Conta de teste está com o perfil Assistente.',
        }));
        expect(screen.queryByText('Perfil confirmado: Pendente')).not.toBeInTheDocument();
        expect(save).toBeDisabled();
        expect(mocks.updateUserRole).toHaveBeenCalledWith('user-1', 'assistente');
    });
});

describe('Logs & Auditoria', () => {
    it('mostra falha e permite nova tentativa, preservando zero nos indicadores válidos', async () => {
        mocks.getAuditLogs
            .mockRejectedValueOnce(new Error('Consulta indisponível'))
            .mockResolvedValueOnce([]);
        render(<LogsPage />);

        expect(await screen.findByText('Não foi possível carregar a trilha de auditoria.')).toBeInTheDocument();
        const countTile = screen.getByText('Auditoria 24h').parentElement!.parentElement!;
        expect(within(countTile).getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Indisponível')).toBeInTheDocument();
        expect(screen.queryByText('Sem registros de auditoria.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByText('Sem registros de auditoria.')).toBeInTheDocument();
    });

    it('distingue filtros sem correspondência de uma consulta sem registros', async () => {
        mocks.getAuditLogs.mockResolvedValue([
            { id: 'audit-1', action: 'acesso', resource_type: 'perfil', created_at: date },
        ]);
        mocks.getTwilioWebhooks.mockResolvedValue([
            { id: 'webhook-1', message_sid: 'synthetic-sid', status: 'delivered', created_at: date },
        ]);
        render(<LogsPage />);

        await screen.findByText('acesso');
        fireEvent.change(screen.getByRole('textbox', { name: 'Filtrar trilha de auditoria' }), { target: { value: 'exclusão' } });
        expect(screen.getByText('Nenhum registro carregado corresponde ao filtro.')).toBeInTheDocument();

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Twilio' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('button', { name: 'failed' }));
        expect(screen.getByText('Nenhuma entrega carregada corresponde ao status selecionado.')).toBeInTheDocument();
        expect(screen.queryByText('Nenhum webhook recebido ainda.')).not.toBeInTheDocument();
    });
});
