import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChainMock } from '../../helpers/supabase-mock-helper';

const mocks = vi.hoisted(() => ({
    staff: vi.fn(),
    db: { from: vi.fn() },
    sendWhatsapp: vi.fn(),
}));
vi.mock('@/lib/authz', () => ({
    requireStaff: mocks.staff,
    authErrorMessage: () => 'Acesso negado',
}));
vi.mock('@/lib/supabase-server-utils', () => ({ createServiceRoleClient: () => mocks.db }));
vi.mock('@/lib/twilio', () => ({ sendWhatsappMessage: mocks.sendWhatsapp }));
vi.mock('@/ai/flows/generate-chatbot-reply', () => ({ generateChatbotReply: vi.fn() }));

import { previewCampaign, sendCampaignMessage } from '@/ai/actions-extended';
import { recommendVideo } from '@/ai/actions/videos';
import { processMessageQueue } from '@/ai/handle-patient-reply';

const active = {
    id: 'p1', status: 'active', plan: 'vip', whatsapp_number: '(11) 90000-0000',
    whatsapp_consent_at: '2025-01-01T00:00:00Z',
};
const phone = 'whatsapp:+5511900000000';
const text = 'Lembrete de teste';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.staff.mockResolvedValue({ userId: 'staff', role: 'admin' });
});

async function reviewCampaign() {
    const result = await previewCampaign(['vip'], text);
    if (!result.success) throw new Error(result.error);
    return result.review;
}

function audience(...rows: unknown[]) {
    mocks.db.from.mockReturnValueOnce(createChainMock({ data: rows, error: null }));
    if (rows.length) mocks.db.from.mockReturnValueOnce(createChainMock({ data: [], error: null }));
}

describe('campanhas', () => {
    it('exclui números inválidos, inativos e ausência de consentimento', async () => {
        audience(active, { ...active, id: 'p2', status: 'inactive' },
            { ...active, id: 'p3', whatsapp_consent_at: null },
            { ...active, id: 'p4', whatsapp_number: 'não informado' },
            { ...active, id: 'p5', whatsapp_number: '+12025550123' });
        expect((await reviewCampaign()).count).toBe(1);
        expect(mocks.db.from).not.toHaveBeenCalledWith('scheduled_messages');
    });

    it('pede revisão ao mudar um destinatário mesmo com a mesma contagem', async () => {
        audience(active);
        const review = await reviewCampaign();
        audience({ ...active, id: 'p2' });

        const result = await sendCampaignMessage(['vip'], text, review);
        expect(result).toMatchObject({ success: false, review: { id: review.id, count: 1 } });
        expect(mocks.db.from).not.toHaveBeenCalledWith('scheduled_messages');
    });

    it('reutiliza os IDs das mensagens quando uma confirmação é repetida', async () => {
        audience(active);
        const review = await reviewCampaign();
        const firstWrite = createChainMock({ data: [{ id: 'queued' }], error: null });
        const retryWrite = createChainMock({ data: [], error: null });
        audience(active);
        mocks.db.from.mockReturnValueOnce(firstWrite);
        audience(active);
        mocks.db.from.mockReturnValueOnce(retryWrite);

        await expect(sendCampaignMessage(['vip'], text, review)).resolves.toEqual({ success: true, scheduled: 1, alreadyScheduled: 0 });
        await expect(sendCampaignMessage(['vip'], text, review)).resolves.toEqual({ success: true, scheduled: 0, alreadyScheduled: 1 });
        expect(firstWrite.upsert.mock.calls[0][0][0].id).toEqual(retryWrite.upsert.mock.calls[0][0][0].id);
        expect(firstWrite.upsert).toHaveBeenCalledWith(
            [expect.objectContaining({ patient_whatsapp_number: phone })],
            { onConflict: 'id', ignoreDuplicates: true }
        );
    });

    it('processa campanha sem protocolo e exclui quem deixou de estar elegível', async () => {
        const scheduled = createChainMock({
            data: [
                { id: 'm1', patient_id: 'p1', patient_whatsapp_number: phone, message_content: text,
                    send_at: new Date().toISOString(), source: 'manual', metadata: { campaignPlan: 'vip' } },
                { id: 'm2', patient_id: 'p2', patient_whatsapp_number: 'whatsapp:+5511900000001', message_content: text,
                    send_at: new Date().toISOString(), source: 'manual', metadata: { campaignPlan: 'vip' } },
            ],
            error: null,
        });
        const patients = createChainMock({
            data: [
                { ...active, patient_protocols: [] },
                { ...active, id: 'p2', status: 'pending', patient_protocols: [{ id: 'protocol' }] },
            ], error: null,
        });
        const messages = createChainMock();
        const tables: Record<string, unknown> = { scheduled_messages: scheduled, patients, messages };
        mocks.db.from.mockImplementation(table => tables[table]);
        mocks.sendWhatsapp.mockResolvedValue('test-sid');

        await expect(processMessageQueue(mocks.db)).resolves.toMatchObject({ success: true, processed: 1, skipped: 1 });
        expect(mocks.sendWhatsapp).toHaveBeenCalledTimes(1);
        expect(mocks.sendWhatsapp).toHaveBeenCalledWith(phone, text, expect.any(Object));
        expect(scheduled.update).toHaveBeenCalledWith({ status: 'error', error_info: 'Campaign recipient no longer eligible' });
    });
});

describe('recomendações', () => {
    it('permite completar o histórico sem duplicar o registro de recomendação', async () => {
        const patient = createChainMock({ data: { ...active, full_name: 'Paciente de teste' }, error: null });
        const video = createChainMock({ data: { title: 'Material de teste', is_active: true, eligible_plans: ['vip'] }, error: null });
        const recommendation = createChainMock();
        const messages = createChainMock({ data: null, error: { message: 'falha simulada' } });
        const tables: Record<string, unknown> = { patients: patient, videos: video, sent_videos: recommendation, messages };
        mocks.db.from.mockImplementation(table => tables[table]);
        await expect(recommendVideo('p1', 'v1')).resolves.toMatchObject({ success: false, error: expect.stringContaining('histórico') });

        messages._setResult({ data: [{ id: 'saved' }], error: null });
        await expect(recommendVideo('p1', 'v1')).resolves.toEqual({ success: true });

        expect(recommendation.upsert.mock.calls[0]).toEqual(recommendation.upsert.mock.calls[1]);
        expect(messages.upsert.mock.calls[0]).toEqual(messages.upsert.mock.calls[1]);
        expect(mocks.sendWhatsapp).not.toHaveBeenCalled();
    });
});
