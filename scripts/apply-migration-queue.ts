import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import * as fs from 'fs';

async function run() {
    const supabase = createServiceRoleClient();
    console.log('Testing if message_queue exists...');

    // Check if table exists
    const { error: testError } = await supabase.from('message_queue').select('id').limit(1);

    if (testError && testError.message.includes('does not exist')) {
        const sql = fs.readFileSync('supabase/migrations/20260307_create_message_queue.sql', 'utf8');
        console.log('Table MISSING. Please apply this SQL in the Supabase Dashboard:');
        console.log('--------------------------------------------------');
        console.log(sql);
        console.log('--------------------------------------------------');
    } else if (testError) {
        console.error('Other error:', testError.message);
    } else {
        console.log('Migration already applied or table exists!');
    }
}

run().catch(console.error);
