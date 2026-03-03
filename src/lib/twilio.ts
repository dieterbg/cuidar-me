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
): Promise<boolean> {
    const twilioClient = await getTwilioClient();
    if (!twilioClient) {
        console.error("[Twilio] Falha ao enviar mensagem: Cliente Twilio não inicializado.");
        return false;
    }

    // Normalizar o número de destino
    const { normalizeBrazilianNumber } = require('./utils');
    const normalizedTo = normalizeBrazilianNumber(to);

    // Get the configured Twilio phone number
    const creds = await getTwilioCredentials();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || creds?.phoneNumber;

    if (!fromNumber) {
        console.error("[Twilio] ERRO: Nenhum número de telefone do Twilio configurado.");
        return false;
    }

    try {
        const messageParams: any = {
            from: fromNumber,
            to: normalizedTo
        };

        // 1. Tentar enviar via Template se houver ContentSid
        if (options?.contentSid) {
            try {
                const templateParams = {
                    ...messageParams,
                    contentSid: options.contentSid,
                    contentVariables: options.contentVariables ? JSON.stringify(options.contentVariables) : undefined
                };
                const message = await twilioClient.messages.create(templateParams);
                console.log(`[Twilio] Mensagem enviada via TEMPLATE para ${normalizedTo}. SID: ${message.sid}`);
                return true;
            } catch (templateError: any) {
                // Erros fatais (como remetente inexistente/inválido) não devem tentar o fallback
                const fatalCodes = [63007, 21211, 21606, 20003];
                if (fatalCodes.includes(templateError.code)) {
                    console.error(`[Twilio Fatal Error]: ${templateError.message} (Code: ${templateError.code})`);
                    return false;
                }

                console.warn(`[Twilio] Falha no template (SID: ${options.contentSid}). Tentando body normal como fallback...`);
                // Continua para o passo 2
            }
        }

        // 2. Enviar via Body (Mensagem Normal ou Fallback)
        const message = await twilioClient.messages.create({
            ...messageParams,
            body: body
        });

        console.log(`[Twilio] Mensagem enviada via BODY para ${normalizedTo}. SID: ${message.sid}`);
        return true;
    } catch (error: any) {
        console.error(`[Twilio Error]:`, error.message);
        return false;
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

    // Try primary URL from headers
    const isValid = twilio.validateRequest(authToken, signature, urlFromHeaders, body);

    if (!isValid && urlFromEnv && urlFromEnv !== urlFromHeaders) {
        // Fallback to Env URL if headers-based one fails
        return twilio.validateRequest(authToken, signature, urlFromEnv, body);
    }

    return isValid;
}
