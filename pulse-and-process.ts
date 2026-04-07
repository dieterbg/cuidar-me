import { scheduleProtocolMessages } from './src/cron/send-protocol-messages';
import { processMessageQueue } from './src/ai/handle-patient-reply';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
    console.log('🚀 Iniciando PULSE + PROCESS (Correção de Dados)...');

    // Garantir que a variável FROM está correta (o projeto usa TWILIO_PHONE_NUMBER)
    const from = process.env.TWILIO_PHONE_NUMBER;
    console.log(`[ENV] Twilio From: ${from}`);
    
    if (!from || from.includes('4155238886')) {
        console.warn('⚠️ AVISO: Usando Sandbox ou variável ausente. Verifique .env.local!');
    }

    // 1. Agendar mensagens (Pulse = true) para carregar o Dia 1
    console.log('\n--- Passagem 1: Agendamento (Pulse) ---');
    const scheduleResult = await scheduleProtocolMessages(true);
    console.log('Mensagens agendadas:', scheduleResult?.length || 0);

    // 2. Processar fila
    console.log('\n--- Passagem 2: Processamento de Fila (Envio Real) ---');
    const processResult = await processMessageQueue();
    console.log('Resultado Processamento:', JSON.stringify(processResult, null, 2));
    
    console.log('\n✅ Ciclo concluído. Verifique o console do Twilio para o número +55 51 992500400.');
}

runTest().catch(console.error);
