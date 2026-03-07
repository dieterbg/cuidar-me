
import { generateChatbotReply } from '../src/ai/flows/generate-chatbot-reply';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function reproduce() {
    console.log('🧪 Reproducing AI error...');

    const input = {
        patient: {
            id: 'test-patient',
            name: 'Usuario Teste',
            subscription: {
                plan: 'premium',
                priority: 1
            },
            gamification: {
                level: 'Iniciante'
            },
            protocol: null
        },
        patientMessage: 'Hj é sábado e gostaria de tomar uma Heineken no meio dia. O que acha?',
        protocolContext: ''
    };

    try {
        const result = await generateChatbotReply(input as any);
        console.log('\n✅ Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('\n❌ CAUGHT ERROR:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

reproduce();
