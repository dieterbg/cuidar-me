import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    console.log('Applying migration: Add metadata to messages...');

    // Using unsafe-sql RPC if available, or just trying to run it
    const sql = `
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING gin(metadata);
    `;

    // Supabase JS doesn't have raw SQL. We must use an RPC or do it via the dashboard.
    // Let's try to check if it's already applied first.
    const { error: testError } = await supabase.from('messages').select('metadata').limit(1);

    if (testError && testError.message.includes('column "metadata" does not exist')) {
        console.log('Column MISSING. Please apply the migration in the Supabase Dashboard:');
        console.log('--------------------------------------------------');
        console.log(sql);
        console.log('--------------------------------------------------');
    } else if (testError) {
        console.error('Other error:', testError.message);
    } else {
        console.log('Migration already applied or column exists!');
    }
}

run().catch(console.error);
