import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // Dieter's ID

    console.log('--- ONBOARDING STATES ---');
    const { data: st } = await supabase
        .from('onboarding_states')
        .select('*')
        .eq('patient_id', patientId);
    console.log(JSON.stringify(st, null, 2));
}

run().catch(console.error);
