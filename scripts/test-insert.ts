import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();

    // Attempt an insert without twilio_sid first
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8';

    const { data, error } = await supabase
        .from('messages')
        .insert({
            patient_id: patientId,
            sender: 'patient',
            text: 'Test message fallback'
        })
        .select('*');

    console.log('[TEST] Insert without twilio_sid error:', error);
    console.log('[TEST] Insert without twilio_sid data:', data);

    if (data && data.length > 0) {
        await supabase.from('messages').delete().eq('id', data[0].id);
    }
}

run().catch(console.error);
