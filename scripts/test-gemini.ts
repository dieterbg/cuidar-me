import { ai } from './src/ai/genkit';

async function testGemini20FlashExp() {
    try {
        console.log("Testing googleai/gemini-2.0-flash-exp...");
        const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash-exp',
            prompt: 'Diga apenas "Funciona!"',
        });
        console.log("Success! Response:", response.text);
    } catch (e: any) {
        console.error("Error calling model:", e.message);
    }
}

testGemini20FlashExp();
