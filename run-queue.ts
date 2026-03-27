import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { processMessageQueue } from './src/ai/handle-patient-reply';

async function run() {
    console.log('DEBUG: WE_SID is set to:', (process.env.TWILIO_CHECKIN_WELLBEING_SID || 'MISSING').substring(0, 4));
    console.log('DEBUG: Running processMessageQueue...');
    const result = await processMessageQueue();
    console.log('DEBUG: Result:', JSON.stringify(result, null, 2));
}

run().catch(console.error);
