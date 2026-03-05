import { ai } from '../src/ai/genkit';

async function listModels() {
    try {
        // Genkit doesn't have a direct 'listModels' on the 'ai' object usually, 
        // but we can try to see what's registered in the registry or just test strings.
        // Actually, let's try to use the raw google-generative-ai to see what's available for the API KEY.
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

        console.log("Listing models from @google/generative-ai...");
        // listModels is not on the browser/standard client easily reachable without auth usually, 
        // but let's try to use the Genkit registry if possible.

        // In Genkit 1.0.x:
        // @ts-ignore
        const models = ai.registry.listActions().filter(a => a.name.includes('model'));
        console.log("Registered models in Genkit:");
        models.forEach(m => console.log(`- ${m.name}`));

    } catch (e: any) {
        console.error("Error listing models:", e.message);
    }
}

listModels();
