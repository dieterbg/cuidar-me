import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // Dieter's ID

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('--- LAST 5 MESSAGES IN DATABASE ---');
    console.log(JSON.stringify(messages, null, 2));
}

run().catch(console.error);
