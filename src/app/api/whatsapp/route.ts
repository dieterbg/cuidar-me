
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

    const from = body.From as string;
    const messageText = body.Body as string;

    // --- DIAGNOSTIC LOG (TEMPORARY) ---
    const { createServiceRoleClient } = await import('@/lib/supabase-server-utils');
    const supabaseDebug = createServiceRoleClient();
    await supabaseDebug.from('messages').insert({
      sender: 'system',
      text: `[DEBUG] Webhook arrived from ${from}. Body length: ${messageText?.length || 0}. URL: ${request.url}`,
      metadata: { body_keys: Object.keys(body), headers: Array.from(request.headers.keys()) }
    }).select();
    // ----------------------------------

    // Validate the request is from Twilio before proceeding
    const isTwilioRequest = await validateTwilioWebhook(request, body);

    if (!isTwilioRequest) {
      console.warn("Received a request that failed Twilio validation.");
      // Log validation failure to DB
      await supabaseDebug.from('messages').insert({
        sender: 'system',
        text: `[DEBUG] Webhook validation FAILED for ${body.From}. Signature: ${request.headers.get('x-twilio-signature')}`,
      });
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }

    console.log("Twilio webhook request validated successfully.");
    await supabaseDebug.from('messages').insert({
      sender: 'system',
      text: `[DEBUG] Webhook validation SUCCESS for ${body.From}`,
    });

    const profileName = body.ProfileName as string; // Patient's WhatsApp profile name
    const messageSid = body.MessageSid as string; // Twilio's unique message identifier

    if (!from || !messageText) {
      return new NextResponse('Missing required fields: From or Body', { status: 400 });
    }

    // IMPORTANT: We MUST await handlePatientReply before returning.
    await handlePatientReply(from, messageText, profileName || 'Novo Contato', messageSid);

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
