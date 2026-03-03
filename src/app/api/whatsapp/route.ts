
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

    // IMPORTANT: We MUST await handlePatientReply before returning.
    // On Vercel Hobby / Next.js 14, waitUntil is NOT available, so fire-and-forget
    // patterns cause the serverless function to terminate before background work completes.
    // Twilio allows up to 15 seconds for webhook responses, which is sufficient.
    await handlePatientReply(from, message, profileName || 'Novo Contato', messageSid);

    // Respond to Twilio with empty TwiML to confirm receipt and stop further actions.
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
