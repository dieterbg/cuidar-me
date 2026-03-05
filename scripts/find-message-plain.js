const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    console.log("Searching for recent messages (simplified)...");
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .ilike('text', '%Sugira um exercicio%')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("Error fetching messages:", error);
        return;
    }

    if (!messages || messages.length === 0) {
        console.log("No messages found matching criteria.");
        // List last 5 messages regardless
        console.log("Listing last 5 messages in DB:");
        const { data: lastMsgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
        console.log(JSON.stringify(lastMsgs, null, 2));
        return;
    }

    console.log(JSON.stringify(messages, null, 2));
}

run();
