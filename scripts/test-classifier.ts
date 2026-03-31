import { config } from 'dotenv';
config({ path: '.env.local' });

import { classifyMessageIntent, MessageContext } from '../src/ai/message-intent-classifier';

async function testarClassificador() {
    const context: MessageContext = {
        hasActiveCheckin: true,
        checkinTitle: "[GAMIFICAÇÃO] Check-in de Almoço (Semana 1)"
    };
    
    console.log("=== TESTE CLASSIFICADOR ===");
    
    // Teste 1
    const res1 = await classifyMessageIntent("Sim", context);
    console.log(`Resposta "Sim":`, res1);
    
    // Teste 2
    const res2 = await classifyMessageIntent("Adaptei", context);
    console.log(`Resposta "Adaptei":`, res2);

    // Teste 3
    const res3 = await classifyMessageIntent("A", context);
    console.log(`Resposta "A":`, res3);
    
    // Teste 4
    const context2: MessageContext = {
        hasActiveCheckin: true,
        checkinTitle: "[GAMIFICAÇÃO] Check-in de Água..."
    };
    const res4 = await classifyMessageIntent("Sim", context2);
    console.log(`Resposta Água "Sim":`, res4);
}

testarClassificador().catch(console.error);
