const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    console.log("Listing tables in 'public' schema...");
    const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    if (error) {
        // Alternative way if pg_tables is not accessible
        console.log("Error querying pg_tables, trying a dummy query on 'messages'...");
        const { error: mError } = await supabase.from('messages').select('count').limit(1);
        if (mError) console.error("Dummy query error:", mError);
        else console.log("Table 'messages' exists.");
    } else {
        console.log("Tables:", data);
    }
}

run();
