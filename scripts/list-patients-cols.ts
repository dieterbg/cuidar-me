
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listColumns() {
    console.log('🔍 Listing columns of "patients" table...');
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const { writeFileSync } = await import('fs');
    if (data && data.length > 0) {
        writeFileSync('scripts/patient-cols.json', JSON.stringify(Object.keys(data[0]), null, 2));
        console.log('✅ Columns written to scripts/patient-cols.json');
    } else {
        console.log('No data found in patients table.');
    }
}

listColumns();
