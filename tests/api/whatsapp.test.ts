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

// Import mocks to control them
import { validateTwilioWebhook } from '@/lib/twilio';
import { handlePatientReply } from '@/ai/handle-patient-reply';

describe('WhatsApp Webhook API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 401 if Twilio validation fails', async () => {
        // Setup mock to fail validation
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
        expect(await res.text()).toBe('Invalid Twilio Signature');
        expect(handlePatientReply).not.toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
        // Setup mock to pass validation
        (validateTwilioWebhook as any).mockResolvedValue(true);

        const formData = new FormData();
        // Missing 'Body'
        formData.append('From', 'whatsapp:+1234567890');

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        expect(res.status).toBe(400);
        expect(await res.text()).toContain('Missing required fields');
        expect(handlePatientReply).not.toHaveBeenCalled();
    });

    it('should process valid request and return TwiML', async () => {
        // Setup mock to pass validation
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
        expect(res.headers.get('content-type')).toBe('text/xml');

        // Verify handler was called with correct args
        expect(handlePatientReply).toHaveBeenCalledWith(
            'whatsapp:+1234567890',
            'Hello World',
            'John Doe',
            'SM123'
        );
    });

    it('should use default profile name if missing', async () => {
        (validateTwilioWebhook as any).mockResolvedValue(true);

        const formData = new FormData();
        formData.append('From', 'whatsapp:+1234567890');
        formData.append('Body', 'Hello');
        // Missing ProfileName

        const req = new NextRequest('http://localhost/api/whatsapp', {
            method: 'POST',
            body: formData,
        });

        await POST(req);

        expect(handlePatientReply).toHaveBeenCalledWith(
            'whatsapp:+1234567890',
            'Hello',
            'Novo Contato', // Default value
            undefined // No MessageSid provided
        );
    });
});
