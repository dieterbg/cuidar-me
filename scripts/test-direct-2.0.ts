import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        console.log("Testing gemini-2.0-flash directly...");
        const result = await model.generateContent("Olá, responda apenas 'Teste OK'");
        const response = await result.response;
        const text = response.text();
        console.log("Success! Response:", text);
    } catch (error: any) {
        console.error("Direct SDK Error:", error.message);
        if (error.response) {
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
        }
    }
}

run();
