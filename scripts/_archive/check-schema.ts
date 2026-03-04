
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking patients table schema...');

    // We can't easily check schema metadata with just the JS client without admin access or specific SQL functions.
    // Instead, we'll try to select a single row and inspect its keys, 
    // OR try to update a dummy row (if we can find one) and catch the error.

    // Better approach: Use the RPC call if available, or just try to select * limit 1
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from patients:', error);
        return;
    }

    if (data && data.length > 0) {
        const patient = data[0];
        console.log('Columns found in patients table:', Object.keys(patient));

        const missing = [];
        if (!('gamification' in patient)) missing.push('gamification');
        if (!('total_points' in patient)) missing.push('total_points');
        if (!('level' in patient)) missing.push('level');

        if (missing.length > 0) {
            console.error('MISSING COLUMNS:', missing);
        } else {
            console.log('All gamification columns appear to be present.');
        }
    } else {
        console.log('No patients found to check schema against.');
    }
}

checkSchema();
