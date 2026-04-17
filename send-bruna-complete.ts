import { createServiceRoleClient } from './src/lib/supabase-server-utils';
import { getStepMessage } from './src/ai/onboarding';
import { sendWhatsappMessage } from './src/lib/twilio';
import { addMessage } from './src/ai/actions/messages';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const patientId = 'ccaf1b65-f6f4-4ed1-a980-b6ab685d1332';
    const supabase = createServiceRoleClient();
    
    const { data: patient } = await supabase
        .from('patients')
        .select('full_name, whatsapp_number, plan')
        .eq('id', patientId)
        .single();
        
    if (!patient) return;

    const message = getStepMessage('complete', patient.plan as any, {}, patient.full_name);
    
    console.log('[DEBUG] Enviando mensagem final para Bruna:', message);
    
    const sent = await sendWhatsappMessage(patient.whatsapp_number!, message);
    if (sent) {
        await addMessage(patientId, { sender: 'system', text: message });
        console.log('[DEBUG] Sucesso!');
    }
}

run();
