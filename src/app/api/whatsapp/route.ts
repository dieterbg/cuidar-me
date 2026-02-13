
import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioWebhook } from '@/lib/twilio';
import { handlePatientReply } from '@/ai/handle-patient-reply';
import twilio from 'twilio';

// This is the endpoint that Twilio will call when a message is received.
// Como ele apenas chama uma Server Action, ele não precisa do Firebase Admin aqui diretamente.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    // Validate the request is from Twilio before proceeding
    const isTwilioRequest = await validateTwilioWebhook(request, body);
    if (!isTwilioRequest) {
      console.warn("Received a request that failed Twilio validation.");
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }

    console.log("Twilio webhook request validated successfully.");

    const from = body.From as string; // Patient's WhatsApp number (e.g., 'whatsapp:+15551234567')
    const message = body.Body as string; // The message text
    const profileName = body.ProfileName as string; // Patient's WhatsApp profile name
    const messageSid = body.MessageSid as string; // Twilio's unique message identifier

    if (!from || !message) {
      return new NextResponse('Missing required fields: From or Body', { status: 400 });
    }

    // IMPORTANT: In serverless environments (like Vercel), we SHOULD use waitUntil
    // to ensure the background task completes before the function instance is culled.
    // Next.js 15 supports request.waitUntil. For Next.js 14, we fallback to plain execution.
    const backgroundTask = handlePatientReply(from, message, profileName || 'Novo Contato', messageSid);
    if ('waitUntil' in request && typeof (request as any).waitUntil === 'function') {
      (request as any).waitUntil(backgroundTask);
    }

    // Respond to Twilio with empty TwiML to confirm receipt and stop further actions.
    const twiml = new twilio.twiml.MessagingResponse();
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error processing Twilio webhook:", error);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
  }
}
