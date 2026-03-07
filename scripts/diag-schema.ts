import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('get_column_names', { table_name: 'messages' });

    // Fallback: search via information_schema if rpc is not available
    if (error) {
        console.log('[DIAG] RPC failed, trying generic query...');
        const { data: cols, error: err2 } = await supabase.from('information_schema.columns' as any)
            .select('column_name')
            .eq('table_name', 'messages');

        if (err2) {
            console.error('[DIAG] Failed to get schema:', err2);

            // Final fallback: try a dry insert with metadata
            const { error: err3 } = await supabase.from('messages').insert({
                patient_id: '00000000-0000-0000-0000-000000000000',
                sender: 'system',
                text: 'temp',
                metadata: {}
            } as any);

            if (err3 && err3.message.includes('column "metadata" of relation "messages" does not exist')) {
                console.log('CRITICAL: metadata column is MISSING in messages table');
            } else {
                console.log('Insert error (might be pkid/rls):', err3?.message);
            }
        } else {
            console.log('Columns in messages:', cols);
        }
    } else {
        console.log('Columns in messages:', data);
    }
}

run().catch(console.error);
