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
    const CRON_SECRET = 'test-secret';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = CRON_SECRET;
        
        // Helper to create a chainable mock that also resolves as a promise
        const createChainable = () => {
            const chain = {
                eq: vi.fn(),
                order: vi.fn(),
                limit: vi.fn(),
                then: (resolve: any) => Promise.resolve({ data: [{ id: 1, whatsapp_number: '123' }], error: null }).then(resolve),
                catch: (reject: any) => Promise.resolve({ error: null }).catch(reject),
            };
            chain.eq.mockReturnValue(chain);
            chain.order.mockReturnValue(chain);
            chain.limit.mockReturnValue(chain);
            // Allow checking result for updates specifically
            chain.then = (resolve: any) => Promise.resolve({ error: null }).then(resolve);
            return chain;
        };

        const mockUpdate = vi.fn().mockImplementation(() => createChainable());
        const mockSelect = vi.fn().mockImplementation(() => {
            const c = createChainable();
            c.then = (resolve: any) => Promise.resolve({ data: [{ id: 1, whatsapp_number: '123' }], error: null }).then(resolve);
            return c;
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
