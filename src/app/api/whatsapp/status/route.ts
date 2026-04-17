/**
 * Twilio Message Status Callback
 *
 * Twilio POSTs here whenever a sent message changes state:
 *   queued → sent → delivered → read
 *                              → failed / undelivered
 *
 * We persist the full payload in `twilio_webhooks` for delivery debugging
 * (especially error 63049 MARKETING blocks and 63016 outside-24h window).
 *
 * Configured per-message via `StatusCallback` URL in `sendWhatsappMessage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioWebhook } from '@/lib/twilio';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { loggers } from '@/lib/logger';

const log = loggers.whatsapp;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const body = Object.fromEntries(formData.entries()) as Record<string, string>;

        // Verify signature — same validator as main webhook
        const isValid = await validateTwilioWebhook(request, body);
        if (!isValid) {
            await log.security({
                eventType: 'invalid_twilio_signature',
                severity: 'warning',
                description: 'Status callback failed signature validation',
                metadata: { messageSid: body.MessageSid },
            });
            return new NextResponse('Invalid Twilio Signature', { status: 401 });
        }

        const messageSid    = body.MessageSid;
        const status        = body.MessageStatus;
        const errorCodeRaw  = body.ErrorCode;
        const errorCode     = errorCodeRaw ? parseInt(errorCodeRaw, 10) : null;
        const errorMessage  = body.ErrorMessage || null;
        const from          = body.From;
        const to            = body.To;

        if (!messageSid || !status) {
            return new NextResponse('Missing MessageSid or Status', { status: 400 });
        }

        const supabase = createServiceRoleClient();

        // Try to link back to scheduled_messages + patient
        // (scheduled_messages stores the MessageSid in error_info or a dedicated column later)
        let scheduledMessageId: string | null = null;
        let patientId: string | null = null;

        // Best-effort lookup by to_number in recent messages
        if (to) {
            const whatsappNumber = to.replace('whatsapp:', '');
            const { data: patient } = await supabase
                .from('patients')
                .select('id')
                .eq('whatsapp_number', whatsappNumber)
                .maybeSingle();
            patientId = patient?.id ?? null;
        }

        const { error: insertError } = await supabase
            .from('twilio_webhooks')
            .insert({
                message_sid:          messageSid,
                status,
                error_code:           errorCode,
                error_message:        errorMessage,
                from_number:          from ?? null,
                to_number:            to ?? null,
                scheduled_message_id: scheduledMessageId,
                patient_id:           patientId,
                raw:                  body,
            });

        if (insertError) {
            log.error('Failed to persist twilio webhook', insertError, { messageSid, status });
        }

        // Alert on known problematic error codes
        if (errorCode === 63049) {
            await log.security({
                eventType: 'whatsapp_marketing_blocked',
                severity: 'critical',
                description: `Meta blocked message as MARKETING (63049)`,
                metadata: { messageSid, to, errorMessage },
            });
        } else if (errorCode === 63016) {
            await log.security({
                eventType: 'whatsapp_outside_24h_window',
                severity: 'warning',
                description: 'Message rejected — outside 24h conversation window (template required)',
                metadata: { messageSid, to, errorMessage },
            });
        } else if (status === 'failed' || status === 'undelivered') {
            log.warn('Message failed', { messageSid, status, errorCode, errorMessage });
        }

        // Twilio expects a 200 quickly
        return new NextResponse('OK', { status: 200 });
    } catch (err: any) {
        log.error('Status callback handler crashed', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
