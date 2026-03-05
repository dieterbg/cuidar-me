import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // Dieter's ID

    console.log(`[TEST] Attempting to delete messages for patient ${patientId}`);

    const { data: beforeDel, error: beforeErr } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId);

    console.log(`[TEST] Messages before deletion: ${beforeDel?.length || 0}`);

    const { error: deleteError, count } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .eq('patient_id', patientId);

    if (deleteError) {
        console.error('[TEST] Error deleting messages:', deleteError);
    } else {
        console.log(`[TEST] Deleted ${count} messages successfully.`);
    }

    const { data: afterDel, error: afterErr } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId);

    console.log(`[TEST] Messages after deletion: ${afterDel?.length || 0}`);
}
run().catch(console.error);
