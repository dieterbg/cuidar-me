
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Checking messages table...');
    const { data: msgData, error: msgError } = await supabase.from('messages').select('*').limit(1);
    if (msgError) console.error('Error fetching messages:', msgError);
    else if (msgData && msgData.length > 0) console.log('Messages columns:', Object.keys(msgData[0]));
    else console.log('Messages table is empty or inaccessible.');

    console.log('\nChecking onboarding_states table...');
    const { data: obData, error: obError } = await supabase.from('onboarding_states').select('*').limit(1);
    if (obError) console.error('Error fetching onboarding_states:', obError);
    else if (obData && obData.length > 0) console.log('Onboarding_states columns:', Object.keys(obData[0]));
    else console.log('Onboarding_states table is empty or inaccessible.');
}

checkSchema();
