
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPatientPlan() {
    const numbers = ['whatsapp:+5551998770099', 'whatsapp:+555198770099'];
    console.log('🔍 Checking specific test numbers...');

    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, full_name, whatsapp_number, plan')
        .or(`whatsapp_number.eq.${numbers[0]},whatsapp_number.eq.${numbers[1]}`);

    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/all-patients.json', JSON.stringify(patients, null, 2));
    console.log('✅ Patients written to scripts/all-patients.json');
}

checkPatientPlan();
