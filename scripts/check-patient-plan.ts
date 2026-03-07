
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPatientPlan() {
    const whatsappNumber = 'whatsapp:+555198770099'; // From your logs
    console.log(`🔍 Checking info for ${whatsappNumber}...`);

    const { data: patient, error } = await supabase
        .from('patients')
        .select('id, full_name, plan, subscription')
        .eq('whatsapp_number', whatsappNumber)
        .single();

    if (error) {
        console.error('Error fetching patient:', error);
        return;
    }

    console.log('\n✅ Patient found:');
    console.log(JSON.stringify(patient, null, 2));
}

checkPatientPlan();
