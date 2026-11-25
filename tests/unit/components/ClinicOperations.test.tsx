import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    user: { id: 'admin' },
    toast: vi.fn(),
    getPatients: vi.fn(),
    getPatientsWithAttention: vi.fn(),
    getVideos: vi.fn(),
    recommendVideo: vi.fn(),
    previewCampaign: vi.fn(),
    sendCampaignMessage: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock('@/hooks/use-auth', () => ({
    useAuth: () => ({ user: mocks.user, loading: false, patientsUpdateCount: 0 }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/ai/actions/patients', () => ({
    getPatients: mocks.getPatients,
    getPatientsWithAttention: mocks.getPatientsWithAttention,
}));
vi.mock('@/ai/seed-database', () => ({ seedDatabase: vi.fn() }));
vi.mock('@/ai/actions/videos', () => ({
    getVideos: mocks.getVideos,
    recommendVideo: mocks.recommendVideo,
    addVideo: vi.fn(),
    deleteVideo: vi.fn(),
}));
vi.mock('@/ai/actions-extended', () => ({
    previewCampaign: mocks.previewCampaign,
    sendCampaignMessage: mocks.sendCampaignMessage,
}));

import PatientsPage from '@/app/(dashboard)/patients/page';
import CampaignsPage from '@/app/(dashboard)/campaigns/page';
import EducationPage from '@/app/(dashboard)/education/page';

const patient = {
    id: 'p1', name: 'Paciente de teste', status: 'active',
    subscription: { plan: 'vip', priority: 3 }, needsAttention: false,
};
const video = {
    id: 'v1', title: 'Material de teste', category: 'Geral', description: '',
    thumbnail_url: 'https://img.youtube.com/vi/12345678901/hqdefault.jpg',
    youtube_url: 'https://www.youtube.com/watch?v=12345678901',
    eligible_plans: ['vip'],
};
const review = { id: 'test-campaign', fingerprint: 'count-1', count: 1 };

beforeEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, '', '/');
    mocks.getPatients.mockResolvedValue([patient]);
    mocks.getPatientsWithAttention.mockResolvedValue([]);
    mocks.getVideos.mockResolvedValue([video]);
});

describe('fluxos operacionais da clínica', () => {
    it('abre Pendentes pelo endereço da Visão Geral', async () => {
        window.history.replaceState(null, '', '/patients?tab=pending');
        mocks.getPatientsWithAttention.mockResolvedValue([{ ...patient, status: 'pending' }]);
        render(<PatientsPage />);

        expect(await screen.findByText(patient.name)).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Pendentes/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('distingue uma falha na fila de uma fila vazia e permite carregar novamente', async () => {
        mocks.getPatientsWithAttention.mockRejectedValueOnce(new Error('falhou'));
        render(<PatientsPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a lista');
        expect(screen.queryByText(/Nenhum paciente precisando de atenção/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByText(/Nenhum paciente precisando de atenção/)).toBeInTheDocument();
    });

    it('ordena pelo alerta clínico mesmo quando o plano tem prioridade comercial maior', async () => {
        const request = { priority: 3, reason: 'Revisão urgente', createdAt: '2025-01-01T00:00:00Z' };
        mocks.getPatientsWithAttention.mockResolvedValue([
            { ...patient, id: 'standard', name: 'Prioridade comercial', needsAttention: true },
            {
                ...patient, id: 'urgent', name: 'Alerta clínico', needsAttention: true,
                subscription: { plan: 'freemium', priority: 1 }, attentionRequest: request,
            },
        ]);
        render(<PatientsPage />);

        await screen.findByText('Revisão urgente');
        expect(screen.getAllByRole('heading', { name: /Alerta clínico|Prioridade comercial/ })
            .map(heading => heading.textContent)).toEqual(['Alerta clínico', 'Prioridade comercial']);
        expect(screen.getByText('Prioridade a confirmar pela equipe')).toBeInTheDocument();
    });

    it('pede confirmação antes de agendar e informa a quantidade registrada na fila', async () => {
        mocks.previewCampaign.mockResolvedValue({ success: true, review });
        mocks.sendCampaignMessage.mockResolvedValue({ success: true, scheduled: 1, alreadyScheduled: 0 });
        render(<CampaignsPage />);

        fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Lembrete de teste' } });
        fireEvent.click(screen.getByRole('button', { name: 'Revisar campanha' }));

        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText(/1 paciente elegível/)).toBeInTheDocument();
        expect(within(dialog).getByText('Lembrete de teste')).toBeInTheDocument();
        expect(mocks.sendCampaignMessage).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar agendamento' }));
        await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
            title: 'Campanha agendada', description: '1 mensagem entrou na fila de envio.',
        }));
    });

    it('mostra falha de recomendação no lugar de sucesso', async () => {
        mocks.recommendVideo.mockResolvedValue({ success: false, error: 'Falha simulada no histórico.' });
        render(<EducationPage />);

        const select = await screen.findByRole('combobox', { name: 'Recomendar vídeo ao paciente' });
        fireEvent.keyDown(select, { key: 'Enter' });
        fireEvent.keyDown(await screen.findByRole('option', { name: /Paciente de teste/ }), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar recomendação' }));

        await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
            variant: 'destructive',
            title: 'Erro ao registrar recomendação',
            description: 'Falha simulada no histórico.',
        }));
        expect(mocks.recommendVideo).toHaveBeenCalledWith('p1', 'v1');
    });
});
