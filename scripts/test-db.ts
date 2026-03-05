import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    const phone = '0099';

    const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .like('whatsapp_number', `%${phone}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!patients || patients.length === 0) {
        console.log('Patient not found');
        return;
    }

    const patient = patients[0];
    console.log(`=== PATIENT ===\nID: ${patient.id}\nName: ${patient.full_name}\nPlan: ${patient.plan}`);

    const { data: states } = await supabase
        .from('onboarding_states')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

    console.log('\n=== ONBOARDING STATES ===');
    console.log(JSON.stringify(states, null, 2));

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\n=== RECENT MESSAGES ===');
    messages?.forEach(m => {
        console.log(`[${m.created_at}] [${m.sender}] ${m.text.substring(0, 50).replace(/\n/g, ' ')}...`);
    });
}
run().catch(console.error);
