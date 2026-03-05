const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
require('dotenv').config({ path: '.env.local' });

const ai = genkit({
    plugins: [googleAI()],
});

async function testModel(modelName) {
    try {
        console.log(`Testing ${modelName}...`);
        const response = await ai.generate({
            model: `googleai/${modelName}`,
            prompt: "Respond with 'OK'",
        });
        console.log(`- ${modelName} Success:`, response.text);
        return true;
    } catch (e) {
        console.log(`- ${modelName} Failed:`, e.message);
        return false;
    }
}

async function run() {
    console.log("Starting model string tests...");
    // Try absolute list names from listModels
    await testModel('gemini-1.5-flash');
    await testModel('gemini-1.5-flash-latest');
    await testModel('gemini-flash-latest');
    await testModel('gemini-pro-latest');
    await testModel('gemini-2.0-flash');
    await testModel('gemini-2.0-flash-001');
    await testModel('gemini-2.0-flash-exp');
    console.log("Tests finished.");
}

run();
