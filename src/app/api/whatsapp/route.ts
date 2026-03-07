
import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioWebhook } from '@/lib/twilio';
import { handlePatientReply } from '@/ai/handle-patient-reply';
import twilio from 'twilio';

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
      console.warn("[Twilio Webhook] Received a request that failed Twilio validation.");
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }

    if (!from || !messageText) {
      return new NextResponse('Missing required fields: From or Body', { status: 400 });
    }

    const { createServiceRoleClient } = await import('@/lib/supabase-server-utils');
    const supabase = createServiceRoleClient();

    // 1. O(1) Decoupled Architecture: Insert into queue immediately
    console.log(`[Twilio Webhook] Queueing message from ${from}`);
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
        console.log(`[Twilio Webhook] Duplicate webhook detected for SID ${messageSid}. Ignoring.`);
      } else {
        console.error("[Twilio Webhook] Failed to enqueue message:", queueError);
        // Important: still return 200 to Twilio to stop retries, even if queue fails (though this is rare).
      }
    } else {
      // 2. Fire and Forget: Trigger the queue processor in the background
      // We don't await this so Vercel can return the response to Twilio instantly.
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host');
      const processUrl = `${protocol}://${host}/api/process-queue`;

      const expectedToken = process.env.CRON_SECRET || 'fallback-secret';

      const { waitUntil } = require('@vercel/functions');

      // Dispara o worker assíncrono.
      const runBgQueue = fetch(processUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${expectedToken}` }
      }).catch(err => {
        console.error("[Twilio Webhook] Failed to trigger background processor:", err);
      });

      waitUntil(runBgQueue);
    }

    // 3. Respond to Twilio with empty TwiML in < 200ms to confirm receipt.
    const twiml = new twilio.twiml.MessagingResponse();
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Error processing Twilio webhook]", error);
    return new NextResponse('Webhook Error', { status: 500 });
  }
}
