
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function checkMessages() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Fetching the absolute latest message to see its columns...');
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('LATEST MESSAGE RAW:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No messages found.');
    }
}

checkMessages();
