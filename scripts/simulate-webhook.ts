import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { handlePatientReply } from '../src/ai/handle-patient-reply';

async function run() {
    const supabase = createServiceRoleClient();
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // Dieter's ID

    const { data: patient } = await supabase
        .from('patients')
        .select('whatsapp_number')
        .eq('id', patientId)
        .single();

    if (!patient) {
        console.error('Patient not found');
        return;
    }

    const from = patient.whatsapp_number.startsWith('whatsapp:') ? patient.whatsapp_number : `whatsapp:${patient.whatsapp_number}`;
    const message = 'Olá';
    const profileName = 'Dieter BG';

    console.log(`[TEST] Simulating Twilio webhook for ${from}`);
    console.log(`[TEST] Message: ${message}`);

    try {
        const result = await handlePatientReply(from, message, profileName);
        console.log('[TEST] Result:', result);
    } catch (e) {
        console.log('[TEST] Error caught by script:', e);
    }
}

run().catch(console.error);
