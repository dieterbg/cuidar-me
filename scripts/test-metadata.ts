import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();
    console.log('Testing insert with metadata into messages...');

    const { error } = await supabase.from('messages').insert({
        patient_id: '2fbe9232-22f1-4201-8cec-beefb0f8e3c8',
        sender: 'system',
        text: 'test metadata',
        metadata: { test: true }
    } as any);

    if (error) {
        console.log('INSERT FAILED!');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        if (error.message.includes('column "metadata" of relation "messages" does not exist')) {
            console.log('CONFIRMED: metadata column is MISSING');
        }
    } else {
        console.log('INSERT SUCCESSFUL: metadata column EXISTS');
    }
}

run().catch(console.error);
