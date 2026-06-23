import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const twilioMock = vi.hoisted(() => {
    const validateRequest = vi.fn();
    const twilioClient = vi.fn(() => ({ messages: { create: vi.fn() } }));
    (twilioClient as any).validateRequest = validateRequest;
    return { validateRequest, twilioClient };
});

vi.mock('twilio', () => ({
    default: twilioMock.twilioClient,
}));

vi.mock('@/lib/twilio-credentials', () => ({
    getTwilioCredentialsInternal: vi.fn().mockResolvedValue({
        accountSid: 'AC123',
        authToken: 'auth-token',
        phoneNumber: 'whatsapp:+15550000000',
    }),
}));

import { validateTwilioWebhook } from '@/lib/twilio';

describe('Twilio webhook validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('allows SKIP_TWILIO_VALIDATION only for local development', async () => {
        vi.stubEnv('SKIP_TWILIO_VALIDATION', '1');
        vi.stubEnv('NODE_ENV', 'development');
        delete process.env.VERCEL;
        delete process.env.VERCEL_ENV;

        const req = new NextRequest('http://localhost/api/whatsapp', { method: 'POST' });

        await expect(validateTwilioWebhook(req, {})).resolves.toBe(true);
        expect(twilioMock.validateRequest).not.toHaveBeenCalled();
    });

    it('ignores SKIP_TWILIO_VALIDATION on Vercel/production-like environments', async () => {
        vi.stubEnv('SKIP_TWILIO_VALIDATION', '1');
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL', '1');
        vi.stubEnv('VERCEL_ENV', 'production');

        const req = new NextRequest('https://app.example.com/api/whatsapp', { method: 'POST' });

        await expect(validateTwilioWebhook(req, {})).resolves.toBe(false);
        expect(twilioMock.validateRequest).not.toHaveBeenCalled();
    });
});
