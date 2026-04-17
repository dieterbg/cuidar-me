import { startOnboarding } from './src/ai/actions/onboarding';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const patientId = process.argv[2] || 'ccaf1b65-f6f4-4ed1-a980-b6ab685d1332'; // Bruna
const plan = 'premium';
const whatsappNumber = 'whatsapp:+5551980315720';
const patientName = 'Bruna Dornelles';

async function run() {
    console.log(`[DEBUG] Disparando startOnboarding para: ${patientId}`);
    try {
        const result = await startOnboarding(patientId, plan, whatsappNumber, patientName);
        console.log('[DEBUG] Resultado:', result);
        process.exit(result.success ? 0 : 1);
    } catch (err) {
        console.error('[DEBUG] Erro ao disparar onboarding:', err);
        process.exit(1);
    }
}

run();
