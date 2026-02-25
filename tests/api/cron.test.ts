import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks das Actions ---
vi.mock('@/ai/handle-patient-reply', () => ({
    processMessageQueue: vi.fn(),
    processMissedCheckins: vi.fn(),
}));

vi.mock('@/cron/send-protocol-messages', () => ({
    scheduleProtocolMessages: vi.fn(),
}));

vi.mock('@/cron/send-daily-checkins', () => ({
    sendDailyCheckins: vi.fn(),
}));

vi.mock('@/lib/error-handler', () => ({
    withRetry: vi.fn((fn) => fn()),
}));

// --- Imports das Rotas e Mocks ---
import { processMessageQueue, processMissedCheckins } from '@/ai/handle-patient-reply';
import { scheduleProtocolMessages } from '@/cron/send-protocol-messages';
import { sendDailyCheckins } from '@/cron/send-daily-checkins';
import { withRetry } from '@/lib/error-handler';

// --- Imports das Rotas ---
import { GET as queueGET } from '@/app/api/cron/process-message-queue/route';
import { GET as protocolGET } from '@/app/api/cron/schedule-protocol-messages/route';
import { GET as dailyGET } from '@/app/api/cron/send-daily-checkins/route';

// --- Mock do Environment ---
const CRON_SECRET = 'test-secret';
process.env.CRON_SECRET = CRON_SECRET;

describe('API Routes: Cron Jobs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function createReq(auth?: string) {
        const headers: Record<string, string> = {};
        if (auth) headers['authorization'] = auth;
        return new NextRequest('http://localhost/api/cron', { headers });
    }

    describe('process-message-queue', () => {
        it('CRN-04: rejeita se sem secret correto', async () => {
            const req = createReq('Bearer wrong');
            const res = await queueGET(req);
            expect(res.status).toBe(401);
        });

        it('CRN-01: processa fila com sucesso', async () => {
            (processMessageQueue as any).mockResolvedValue({ success: true, processed: 5 });
            (processMissedCheckins as any).mockResolvedValue({ success: true, processed: 2 });

            const req = createReq(`Bearer ${CRON_SECRET}`);
            const res = await queueGET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.processed).toBe(5);
            expect(data.missedCheckinsProcessed).toBe(2);
            expect(processMessageQueue).toHaveBeenCalled();
        });

        it('retorna 500 se falhar', async () => {
            (processMessageQueue as any).mockResolvedValue({ success: false, error: 'DB Error' });

            const req = createReq(`Bearer ${CRON_SECRET}`);
            const res = await queueGET(req);
            expect(res.status).toBe(500);
        });
    });

    describe('schedule-protocol-messages', () => {
        it('CRN-02: agenda mensagens de protocolo', async () => {
            (scheduleProtocolMessages as any).mockResolvedValue({ success: true, messagesScheduled: 10, protocolsCompleted: 1 });

            const req = createReq(`Bearer ${CRON_SECRET}`);
            const res = await protocolGET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.messagesScheduled).toBe(10);
            expect(withRetry).toHaveBeenCalled();
        });
    });

    describe('send-daily-checkins', () => {
        it('CRN-03: envia check-ins diários', async () => {
            (sendDailyCheckins as any).mockResolvedValue({ processed: 3, skipped: 0 });

            const req = createReq(`Bearer ${CRON_SECRET}`);
            const res = await dailyGET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.processed).toBe(3);
            expect(sendDailyCheckins).toHaveBeenCalled();
        });
    });
});
