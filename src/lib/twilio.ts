
import twilio from 'twilio';
import { NextRequest } from 'next/server';
import { getTwilioCredentials } from '@/ai/actions-extended';

// This function dynamically gets the Twilio client.
async function getTwilioClient() {
    // First, try to get credentials from Firestore
    const creds = await getTwilioCredentials();

    const accountSid = creds?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = creds?.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        console.error("[Twilio] ERRO: Credenciais do Twilio (Account SID ou Auth Token) não configuradas no Firestore ou nas variáveis de ambiente.");
        return null;
    }

    return twilio(accountSid, authToken);
}


export async function sendWhatsappMessage(to: string, body: string): Promise<boolean> {
    const twilioClient = await getTwilioClient();
    if (!twilioClient) {
        console.error("[Twilio] Falha ao enviar mensagem: Cliente Twilio não pôde ser inicializado.");
        return false;
    }

    // Get the configured Twilio phone number
    const creds = await getTwilioCredentials();
    const fromNumber = creds?.phoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
        console.error("[Twilio] ERRO: Nenhum número de telefone do Twilio configurado para envio. Verifique as credenciais no Admin ou nas variáveis de ambiente.");
        return false;
    }

    try {
        const message = await twilioClient.messages.create({
            from: fromNumber, // Use the configured number
            to: to, // e.g., 'whatsapp:+5511999998888'
            body: body,
        });

        console.log(`[Twilio] Mensagem para ${to} enviada com sucesso! SID: ${message.sid}, Status: ${message.status}`);

        return true;
    } catch (error: any) {
        console.error(`[Twilio] ERRO AO ENVIAR para ${to}:`, error.message);
        return false;
    }
}


export async function validateTwilioWebhook(request: NextRequest, body: any) {
    if (process.env.NODE_ENV === 'development') {
        console.log("Skipping Twilio validation in development environment.");
        return true;
    }

    const signature = request.headers.get('x-twilio-signature');

    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const url = `${protocol}://${host}${request.nextUrl.pathname}`;

    const creds = await getTwilioCredentials();
    const authToken = creds?.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!authToken || !signature) {
        console.error("Auth token or signature is missing. Cannot validate Twilio webhook.");
        return false;
    }

    return twilio.validateRequest(authToken, signature, url, body);
}
