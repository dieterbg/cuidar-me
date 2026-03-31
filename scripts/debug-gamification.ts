import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { handleProtocolGamification } from '../src/ai/handlers/gamification-handler';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // ID the user has
    const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
    if (!patient) return console.log('Patient not found');

    const { data: patientProtocol } = await supabase
        .from('patient_protocols')
        .select('*, protocol:protocols(id, name, duration_days)')
        .eq('patient_id', patient.id)
        .eq('is_active', true)
        .single();
    
    if (!patientProtocol) {
        console.log("No active protocol!");
        return;
    }

    console.log("Testing with Adaptei:");
    const processed = await handleProtocolGamification(
        patient,
        patientProtocol,
        "Adaptei",
        patient.whatsapp_number,
        supabase
    );
    console.log(`Result for Adaptei: ${processed}`);
    
    console.log("Testing with Sim:");
    const processed2 = await handleProtocolGamification(
        patient,
        patientProtocol,
        "Sim",
        patient.whatsapp_number,
        supabase
    );
    console.log(`Result for Sim: ${processed2}`);
}

run().catch(console.error);
