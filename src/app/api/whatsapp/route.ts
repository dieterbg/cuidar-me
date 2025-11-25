
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
    const isTwilioRequest = validateTwilioWebhook(request, body);
    if (!isTwilioRequest) {
      console.warn("Received a request that failed Twilio validation.");
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }

    console.log("Twilio webhook request validated successfully.");

    const from = body.From as string; // Patient's WhatsApp number (e.g., 'whatsapp:+15551234567')
    const message = body.Body as string; // The message text
    const profileName = body.ProfileName as string; // Patient's WhatsApp profile name

    if (!from || !message) {
      return new NextResponse('Missing required fields: From or Body', { status: 400 });
    }

    // IMPORTANT: Do not await this. Respond to Twilio immediately,
    // and let the handler process in the background. This prevents timeouts.
    handlePatientReply(from, message, profileName || 'Novo Contato');

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
