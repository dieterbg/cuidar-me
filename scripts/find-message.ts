import { createServiceRoleClient } from './src/lib/supabase-server-utils';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const supabase = createServiceRoleClient();
    console.log("Searching for recent messages...");
    const { data: messages, error } = await supabase
        .from('messages')
        .select(`
            id,
            text,
            sender,
            created_at,
            patient:patients (
                id,
                full_name,
                whatsapp_number,
                subscription:subscriptions (
                    plan,
                    status
                )
            )
        `)
        .ilike('text', '%Sugira um exercicio%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(JSON.stringify(messages, null, 2));
    }
}

run();
