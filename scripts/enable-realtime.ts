import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    console.log('[REALTIME] Connecting to Supabase...');
    const supabase = createServiceRoleClient();

    // Actually, we can't reliably alter publications via the REST API.
    // Let's try to execute a raw SQL query using the rpc or a specialized function.
    // If not possible, I might have to add a polling fallback or tell the user.

    // Let's see if there's any active realtime for messages
    const { data: realtimeSettings, error } = await supabase.rpc('enable_realtime_for_table', { table_name: 'messages' });
    console.log('[REALTIME] RPC call result:', { data: realtimeSettings, error });
}

run().catch(console.error);
