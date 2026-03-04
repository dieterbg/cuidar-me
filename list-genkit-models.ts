import { ai } from './src/ai/genkit';

async function listModels() {
    console.log('Available Models in Registry:');
    const models = await ai.registry.listActions();
    models.filter(a => a.actionType === 'model').forEach(m => {
        console.log(` - ${m.name} (${m.actionType})`);
    });
}

listModels().catch(console.error);
