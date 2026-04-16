import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/whatsapp/route';
import { NextRequest } from 'next/server';

// Mocks
vi.mock('@/lib/twilio', () => ({
    validateTwilioWebhook: vi.fn(),
}));

vi.mock('@/ai/handle-patient-reply', () => ({
    handlePatientReply: vi.fn(),
}));

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(),
}));

vi.mock('@vercel/functions', () => ({
    waitUntil: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true })
} as any);

// Import mocks
import { validateTwilioWebhook } from '@/lib/twilio';
import { handlePatientReply } from '@/ai/handle-patient-reply';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

describe('WhatsApp Webhook API', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default Supabase mock chain
        const insertMock = vi.fn().mockResolvedValue({ error: null });
        const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
        mockSupabase = { from: fromMock };
        (createServiceRoleClient as any).mockReturnValue(mockSupabase);
    });

    it('should return 401 if Twilio validation fails', async () => {
        (validateTwilioWebhook as any).mockResolvedValue(false);

        const formData = new FormData();
        formData.append('From', 'whatsapp:+1234567890');
        formData.append('Body', 'Hello');

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        expect(res.status).toBe(401);
        expect(handlePatientReply).not.toHaveBeenCalled();
    });

    it('should process valid request and enqueue message', async () => {
        (validateTwilioWebhook as any).mockResolvedValue(true);

        const formData = new FormData();
        formData.append('From', 'whatsapp:+1234567890');
        formData.append('Body', 'Hello World');
        formData.append('ProfileName', 'John Doe');
        formData.append('MessageSid', 'SM123');

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        expect(res.status).toBe(200);
        
        // Verify it inserted into queue instead of calling handler directly
        const fromMock = mockSupabase.from;
        expect(fromMock).toHaveBeenCalledWith('message_queue');
        
        const insertMock = fromMock().insert;
        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
            whatsapp_number: 'whatsapp:+1234567890',
            message_text: 'Hello World',
            profile_name: 'John Doe',
            message_sid: 'SM123'
        }));

        // Verify it triggered the background process
        expect(global.fetch).toHaveBeenCalled();
        expect(handlePatientReply).not.toHaveBeenCalled(); // AI processing is now deferred
    });

    it('should use default profile name if missing in queue', async () => {
        (validateTwilioWebhook as any).mockResolvedValue(true);

        const formData = new FormData();
        formData.append('From', 'whatsapp:+1234567890');
        formData.append('Body', 'Hello');

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        await POST(req);

        const fromMock = mockSupabase.from;
        const insertMock = fromMock().insert;
        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
            profile_name: 'Novo Contato'
        }));
    });

    it('should handle duplicate webhooks gracefully (Idempotency)', async () => {
        (validateTwilioWebhook as any).mockResolvedValue(true);

        // Mock Supabase returning a "Unique Constraint Violation" code 23505
        const insertMock = vi.fn().mockResolvedValue({ error: { code: '23505' } });
        mockSupabase.from = vi.fn().mockReturnValue({ insert: insertMock });

        const formData = new FormData();
        formData.append('From', 'whatsapp:+1234567890');
        formData.append('Body', 'Hello Again');
        formData.append('MessageSid', 'SM_RETRY_123');

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        // Should still return 200 to Twilio to acknowledge receipt, even if it's a duplicate
        expect(res.status).toBe(200);
        
        // Should NOT trigger the background processor for a duplicate
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
