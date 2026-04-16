
import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioWebhook } from '@/lib/twilio';
import { handlePatientReply } from '@/ai/handle-patient-reply';
import twilio from 'twilio';
import { loggers } from '@/lib/logger';

// This is the endpoint that Twilio will call when a message is received.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    const from = body.From as string;
    const messageText = body.Body as string;
    const profileName = body.ProfileName as string;
    const messageSid = body.MessageSid as string;

    // Validate the request is from Twilio before proceeding
    const isTwilioRequest = await validateTwilioWebhook(request, body);

    if (!isTwilioRequest) {
      loggers.whatsapp.warn("Received a request that failed Twilio validation.", { from, messageSid });
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }

    if (!from || !messageText) {
      return new NextResponse('Missing required fields: From or Body', { status: 400 });
    }

    const { createServiceRoleClient } = await import('@/lib/supabase-server-utils');
    const supabase = createServiceRoleClient();

    // 1. O(1) Decoupled Architecture: Insert into queue immediately
    loggers.whatsapp.info(`Queueing message`, { from, messageSid, textLength: messageText?.length });
    const { error: queueError } = await supabase
      .from('message_queue')
      .insert({
        whatsapp_number: from,
        message_text: messageText,
        profile_name: profileName || 'Novo Contato',
        message_sid: messageSid, // Ensures Twilio retries don't duplicate processing
        status: 'pending'
      });

    if (queueError) {
      // If it's a unique constraint violation on message_sid, it means Twilio is retrying an already queued message.
      if (queueError.code === '23505') {
        loggers.whatsapp.info(`Duplicate webhook detected. Ignoring.`, { messageSid });
      } else {
        loggers.whatsapp.error("Failed to enqueue message", queueError, { from, messageSid });
        // Important: still return 200 to Twilio to stop retries, even if queue fails (though this is rare).
      }
    } else {
      // 2. Fire and Forget: Trigger the queue processor in the background
      // We don't await this so Vercel can return the response to Twilio instantly.
      const protocolValue = request.headers.get('x-forwarded-proto') || 'https';
      const hostValue = request.headers.get('host');
      const processUrl = `${protocolValue}://${hostValue}/api/process-queue`;

      const expectedToken = process.env.CRON_SECRET || 'fallback-secret';

      const { waitUntil } = require('@vercel/functions');

      // AI Processor — processa a resposta do paciente
      const runBgQueue = fetch(processUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${expectedToken}` }
      }).catch(err => {
        loggers.whatsapp.error("Failed to trigger background processor", err, { processUrl });
      });

      // ⚠️ NÃO disparar /api/cron/unified aqui.
      // O cron unificado (agendamento de protocolos, check-ins diários, etc.) deve rodar
      // apenas via cron schedule, não a cada mensagem recebida — isso causava envios duplicados/triplicados.

      waitUntil(runBgQueue);
    }

    // 3. Respond to Twilio with empty TwiML in < 200ms to confirm receipt.
    const twiml = new twilio.twiml.MessagingResponse();
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    loggers.whatsapp.error("Error processing Twilio webhook", error);
    return new NextResponse('Webhook Error', { status: 500 });
  }
}
