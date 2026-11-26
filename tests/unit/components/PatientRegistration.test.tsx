import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    user: { id: 'user-1', email: 'patient@example.test' },
    profile: { role: 'paciente' },
    router: { replace: vi.fn() },
    createPatientRecord: vi.fn(),
    removeChannel: vi.fn(),
    channel: { on: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router, usePathname: () => '/portal/welcome' }));
vi.mock('@/hooks/use-auth', () => ({
    useAuth: () => ({ user: mocks.user, profile: mocks.profile, signOut: vi.fn(), loading: false }),
}));
vi.mock('@/ai/actions/patients', () => ({ createPatientRecord: mocks.createPatientRecord }));
vi.mock('@/lib/supabase-client', () => ({
    createClient: () => ({ channel: () => mocks.channel, removeChannel: mocks.removeChannel }),
}));

import PortalLayout from '@/app/portal/layout';

const patient = { id: 'p1', fullName: 'Paciente de teste', status: 'active', subscription: { plan: 'freemium' } };

beforeEach(() => {
    vi.clearAllMocks();
    mocks.channel.on.mockReturnValue(mocks.channel);
    mocks.channel.subscribe.mockReturnValue(mocks.channel);
    mocks.createPatientRecord.mockReset();
});

describe('entrada no portal de pacientes', () => {
    it('abre o portal após o cadastro automático sem pedir nome e WhatsApp de novo', async () => {
        mocks.createPatientRecord.mockResolvedValue({ success: true, patient });
        render(<PortalLayout><p>Portal do paciente</p></PortalLayout>);

        expect(await screen.findByText('Portal do paciente')).toBeInTheDocument();
        expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('WhatsApp')).not.toBeInTheDocument();
        expect(mocks.createPatientRecord).toHaveBeenCalledWith(undefined);
    });

    it('mostra somente o WhatsApp para a conta que ainda precisa informar o número', async () => {
        mocks.createPatientRecord
            .mockResolvedValueOnce({ success: false, missing: { name: false, phone: true, consent: false } })
            .mockResolvedValueOnce({ success: true, patient });
        render(<PortalLayout><p>Portal do paciente</p></PortalLayout>);

        const phone = await screen.findByLabelText('WhatsApp');
        expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        fireEvent.change(phone, { target: { value: '(11) 90000-0000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
        await waitFor(() => expect(mocks.createPatientRecord).toHaveBeenLastCalledWith({ whatsappNumber: '(11) 90000-0000' }));
        expect(await screen.findByText('Portal do paciente')).toBeInTheDocument();
    });

    it('oferece nova tentativa em uma falha do servidor sem reabrir o formulário completo', async () => {
        mocks.createPatientRecord
            .mockRejectedValueOnce(new Error('Falha simulada'))
            .mockResolvedValueOnce({ success: true, patient });
        render(<PortalLayout><p>Portal do paciente</p></PortalLayout>);

        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir seu cadastro');
        expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('WhatsApp')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByText('Portal do paciente')).toBeInTheDocument();
    });
});
