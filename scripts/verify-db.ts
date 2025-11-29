
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
    console.log('Verifying transactions table...');

    // Try to select from transactions (limit 0 just to check existence)
    const { data, error } = await supabase.from('transactions').select('*').limit(1);

    if (error) {
        console.error('❌ Error accessing transactions table:', error.message);
        if (error.code === '42P01') {
            console.error('   -> Table "transactions" does not exist. Migration was NOT applied successfully.');
        }
        return;
    }

    console.log('✅ Table "transactions" exists and is accessible.');
    console.log('   -> Connection successful.');
}

verifyDatabase();
