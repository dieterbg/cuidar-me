import { ai } from './src/ai/genkit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        console.log("Testing Genkit default model...");
        // @ts-ignore
        const response = await ai.generate({
            prompt: "Olá, responda apenas 'Genkit OK'",
        });
        console.log("Success! Response:", response.text);
    } catch (error: any) {
        console.error("Genkit Error:", error.message);
    }
}

run();
