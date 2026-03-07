
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectQueue() {
    console.log('🔍 Fetching last 10 items from message_queue...');
    const { data, error } = await supabase
        .from('message_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching queue:', error);
        return;
    }

    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/log-details.json', JSON.stringify(data, null, 2));
    console.log('✅ Logs written to scripts/log-details.json');
}

inspectQueue();
