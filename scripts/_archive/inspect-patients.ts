
import dotenv from 'dotenv';
import fs from 'fs';
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

// Carregar .env.local
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

async function inspect() {
    const supabase = createServiceRoleClient();
    console.log('Inspecting patients table...');
    const { data, error } = await supabase.from('patients').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success. Row sample:', data);
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot infer columns from data.');
        }
    }
}

inspect().catch(console.error);
