import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import * as fs from 'fs';

async function checkQueue() {
    const supabase = createServiceRoleClient();
    console.log('--- CHECKING MESSAGE QUEUE ---');

    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase.from('message_queue').select('id').limit(1);
    if (tableError) {
        console.error('ERROR ACCESSING TABLE:', tableError.message);
        fs.writeFileSync('scripts/queue-out.json', JSON.stringify({ error: tableError.message }));
        return;
    }

    const { data: allMessages, error } = await supabase
        .from('message_queue')
        .select('id, whatsapp_number, message_text, status, error_log, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching messages:', error);
        fs.writeFileSync('scripts/queue-out.json', JSON.stringify({ error }));
    } else {
        console.log(`Found ${allMessages.length} recent messages in queue:`);
        fs.writeFileSync('scripts/queue-out.json', JSON.stringify(allMessages, null, 2));
    }
}

checkQueue();
