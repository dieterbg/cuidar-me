import { handlePatientReply } from '../src/ai/handle-patient-reply';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SIMULADOR DE MENSAGENS WHATSAPP
 * Use este script para testar a lógica de orquestração localmente.
 */
async function simulate(whatsappNumber: string, messageText: string) {
    console.log(`\n--- SIMULANDO MENSAGEM ---`);
    console.log(`De: ${whatsappNumber}`);
    console.log(`Mensagem: "${messageText}"`);
    console.log(`--------------------------\n`);

    try {
        const result = await handlePatientReply(
            whatsappNumber,
            messageText,
            'SimulatedUser', // ProfileName
            'SM_simulated_id_' + Date.now() // MessageSid fake
        );

        console.log(`\n✅ Resultado:`, JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(`\n❌ Erro na simulação:`, error);
    }
}

// Exemplos de uso (descomente para testar cenários específicos)
const targetPhone = 'whatsapp:+5511999999999'; // Troque pelo seu número se quiser testar no seu perfil

async function runTests() {
    // 1. Testar SAIR
    // await simulate(targetPhone, 'SAIR');

    // 2. Testar Onboarding (se estiver ativo)
    // await simulate(targetPhone, 'A');

    // 3. Testar Emergência
    // await simulate(targetPhone, 'estou com muita dor no peito');

    // 4. Testar Conversa normal
    // await simulate(targetPhone, 'Como funciona o programa?');

    console.log('Script pronto. Edite as chamadas no final do arquivo para testar diferentes fluxos.');
}

// Pegar argumentos da linha de comando se houver
const args = process.argv.slice(2);
if (args.length >= 2) {
    const [phone, ...msgParts] = args;
    simulate(phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`, msgParts.join(' '));
} else {
    runTests();
}
