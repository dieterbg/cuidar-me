import { Twilio } from 'twilio';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const to = 'whatsapp:+5511982054657'; // Dieter's number from DB

const client = new Twilio(accountSid, authToken);

async function sendPing() {
    console.log(`📡 Enviando PING de teste para ${to}...`);
    console.log(`Using From: ${from}`);
    try {
        const message = await client.messages.create({
            body: '🔔 Teste de Conexão Cuidar-me: Se você está lendo isso, a integração com Twilio está funcionando! Favor avisar o suporte.',
            from: from,
            to: to
        });
        console.log('✅ Sucesso! SID:', message.sid);
        console.log('Status Atual:', message.status);
    } catch (error: any) {
        console.error('❌ ERRO ao enviar mensagem:', error.message);
        if (error.code) console.error('Código de Erro Twilio:', error.code);
    }
}

sendPing();
