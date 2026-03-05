const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        console.log("Testing gemini-2.0-flash via standalone CommonJS...");
        const result = await model.generateContent("Respond exactly with: Gemini 2.0 works!");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (error) {
        console.error("SDK Error:", error.message);
    }
}

run();
