import { ai } from '../src/ai/genkit';

async function testGemini15Flash() {
    try {
        console.log("Testing googleai/gemini-1.5-flash...");
        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: 'Diga apenas "Funciona!"',
        });
        console.log("Success! Response:", response.text);
    } catch (e: any) {
        console.error("Error calling model:", e.message);
    }
}

testGemini15Flash();
