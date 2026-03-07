import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();

    // Find patient by name
    const { data: patients } = await supabase.from('patients').select('id, full_name').ilike('full_name', '%Dieter%');
    console.log('Patients found:', patients);

    if (patients && patients.length > 0) {
        const patientId = patients[0].id;
        const { data: msgs, error } = await supabase.from('messages')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
        console.log('Recent messages count:', msgs?.length);
        const fs = require('fs');
        fs.writeFileSync('scripts/diag-output.json', JSON.stringify(msgs, null, 2));
        console.log('Full history saved to scripts/diag-output.json');
    }
}

run().catch(console.error);
