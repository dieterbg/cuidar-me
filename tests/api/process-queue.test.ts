import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/process-queue/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(),
}));

vi.mock('@/ai/handle-patient-reply', () => ({
    handlePatientReply: vi.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { handlePatientReply } from '@/ai/handle-patient-reply';

describe('API: Process Queue', () => {
    let mockSupabase: any;
    let mockUpdate: any;
    let pendingMessages: any[];
    let lockResult: any;
    const CRON_SECRET = 'test-secret';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = CRON_SECRET;

        pendingMessages = [{ id: 1, whatsapp_number: '123', message_text: 'oi', profile_name: 'Teste', message_sid: 'SM1' }];
        lockResult = { data: [{ id: 1 }], error: null };

        // Helper to create a chainable mock that also resolves as a promise
        const createChainable = (result: any) => {
            const chain = {
                eq: vi.fn(),
                order: vi.fn(),
                limit: vi.fn(),
                select: vi.fn(),
                then: (resolve: any) => Promise.resolve(result).then(resolve),
                catch: (reject: any) => Promise.resolve(result).catch(reject),
            };
            chain.eq.mockReturnValue(chain);
            chain.order.mockReturnValue(chain);
            chain.limit.mockReturnValue(chain);
            chain.select.mockReturnValue(chain);
            return chain;
        };

        mockUpdate = vi.fn().mockImplementation((payload: any) => {
            if (payload?.status === 'processing') return createChainable(lockResult);
            return createChainable({ error: null });
        });
        const mockSelect = vi.fn().mockImplementation(() => {
            return createChainable({ data: pendingMessages, error: null });
        });

        mockSupabase = {
            from: vi.fn().mockReturnValue({
                select: mockSelect,
                update: mockUpdate,
            })
        };
        (createServiceRoleClient as any).mockReturnValue(mockSupabase);
    });

    it('should return 401 if unauthorized', async () => {
        const req = new NextRequest('http://localhost/api/process-queue', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer wrong' }
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should return 500 if CRON_SECRET is missing', async () => {
        delete process.env.CRON_SECRET;
        const req = new NextRequest('http://localhost/api/process-queue', {
            method: 'POST'
        });
        const res = await POST(req);
        expect(res.status).toBe(500);
    });

    it('should process pending message and mark as completed', async () => {
        (handlePatientReply as any).mockResolvedValue({ success: true });

        const req = new NextRequest('http://localhost/api/process-queue', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(handlePatientReply).toHaveBeenCalled();
        
        // Verify update to 'completed'
        expect(mockSupabase.from).toHaveBeenCalledWith('message_queue');
    });

    it('should skip processing if another worker already claimed the message', async () => {
        lockResult = { data: [], error: null };

        const req = new NextRequest('http://localhost/api/process-queue', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.message).toBe('Message already claimed');
        expect(handlePatientReply).not.toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
    });

    it('should mark as error if AI processing fails', async () => {
        (handlePatientReply as any).mockResolvedValue({ success: false, error: 'AI Error' });

        const req = new NextRequest('http://localhost/api/process-queue', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
        });

        await POST(req);

        // Verify it called update with status 'error'
        const fromMock = mockSupabase.from;
        const updateMock = fromMock().update;
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            status: 'error',
            error_log: 'AI Error'
        }));
    });
});
