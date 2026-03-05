import { ai } from './src/ai/genkit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSingleModel(modelName: string) {
    try {
        console.log(`Testing ${modelName}...`);
        // @ts-ignore
        const response = await ai.generate({
            model: `googleai/${modelName}`,
            prompt: "Respond with 'OK'",
        });
        console.log(`${modelName} Success:`, response.text);
        return true;
    } catch (e: any) {
        console.error(`${modelName} Failed:`, e.message);
        return false;
    }
}

async function run() {
    await testSingleModel('gemini-1.5-flash');
    await testSingleModel('gemini-1.5-flash-latest');
    await testSingleModel('gemini-2.0-flash');
}

run();
