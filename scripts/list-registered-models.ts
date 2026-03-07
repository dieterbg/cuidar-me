
import { ai } from '../src/ai/genkit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    console.log('🔍 Listing available models from Genkit registry...');
    // In Genkit, models are registered in the registry
    const models = ai.registry.listEntries();
    const modelNames = models
        .filter(m => m.key.includes('model/'))
        .map(m => m.key.replace('model/', ''));

    console.log('\n✅ Registered Models:');
    modelNames.forEach(name => console.log(`- ${name}`));
}

listModels();
