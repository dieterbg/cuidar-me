import twilio from 'twilio';
import { NextRequest } from 'next/server';
import { getTwilioCredentials } from '@/ai/actions/system';


// This function dynamically gets the Twilio client.
async function getTwilioClient() {
    const creds = await getTwilioCredentials();

    // Prioritize values from .env.local for easier local configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID || creds?.accountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || creds?.authToken;

    if (!accountSid || !authToken) {
        console.error("[Twilio] ERRO: Credenciais do Twilio (Account SID ou Auth Token) não configuradas.");
        return null;
    }

    return twilio(accountSid, authToken);
}


export async function sendWhatsappMessage(
    to: string,
    body: string,
    options?: { contentSid?: string; contentVariables?: Record<string, string> }
): Promise<string | null> {
    const twilioClient = await getTwilioClient();
    if (!twilioClient) {
        console.error("[Twilio] Falha ao enviar mensagem: Cliente Twilio não inicializado.");
        return null;
    }

    // Normalizar o número de destino
    const { normalizeBrazilianNumber } = require('./utils');
    const normalizedTo = normalizeBrazilianNumber(to);

    // Get the configured Twilio phone number
    const creds = await getTwilioCredentials();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || creds?.phoneNumber;

    if (!fromNumber) {
        console.error("[Twilio] ERRO: Nenhum número de telefone do Twilio configurado.");
        return null;
    }

    try {
        const messageParams: any = {
            from: fromNumber,
            to: normalizedTo
        };

        // 1. Enviar via Template se houver ContentSid
        // Se o template falhar por motivos de limite de caracteres, tentamos o fallback em "body"
        if (options?.contentSid) {
            try {
                const templateParams = {
                    ...messageParams,
                    contentSid: options.contentSid,
                    contentVariables: options.contentVariables ? JSON.stringify(options.contentVariables) : undefined
                };
                const message = await twilioClient.messages.create(templateParams);
                console.log(`[Twilio] ✅ Template enviado. SID: ${message.sid} (ContentSID: ${options.contentSid})`);
                return message.sid;
            } catch (templateError: any) {
                // 63016 = fora da janela de 24h → precisa de template aprovado
                if (templateError.code === 63016) {
                    console.error(`[Twilio] ❌ Fora da janela de 24h. Use um template aprovado pelo WhatsApp. (Code: 63016, ContentSID: ${options.contentSid})`);
                    // Não adianta tentar fallback se a janela está fechada
                    return null;
                } else {
                    console.error(`[Twilio] ❌ Falha no template (SID: ${options.contentSid}): ${templateError.message} (Code: ${templateError.code})`);
                    console.log(`[Twilio] 🔄 Tentando fallback para mensagem livre (body)...`);
                    // Continua execução para tentar enviar via Body
                }
            }
        }

        // 2. Enviar via Body (apenas para mensagens sem template ou via fallback)
        const message = await twilioClient.messages.create({
            ...messageParams,
            body: body
        });

        console.log(`[Twilio] ✅ Mensagem enviada via BODY. SID: ${message.sid}`);
        return message.sid;
    } catch (error: any) {
        console.error(`[Twilio Error]:`, error.message);
        return null;
    }
}


export async function validateTwilioWebhook(request: NextRequest, body: any) {
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    const signature = request.headers.get('x-twilio-signature');
    if (!signature) return false;

    // Vercel proxy headers
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');

    // Check multiple possible URLs because Twilio signature validation is very sensitive to the exact string
    const urlFromHeaders = `${protocol}://${host}${request.nextUrl.pathname}`;
    const urlFromEnv = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}${request.nextUrl.pathname}`
        : null;

    const creds = await getTwilioCredentials();
    const authToken = process.env.TWILIO_AUTH_TOKEN || creds?.authToken;

    if (!authToken) return false;

    const isValid = twilio.validateRequest(authToken, signature, urlFromHeaders, body);

    if (!isValid && urlFromEnv && urlFromEnv !== urlFromHeaders) {
        // Fallback to Env URL if headers-based one fails
        return twilio.validateRequest(authToken, signature, urlFromEnv, body);
    }

    return isValid;
}
