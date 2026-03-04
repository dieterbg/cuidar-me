import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixAgain() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const patientId = "2fbe9232-22f1-4201-8cec-beefb0f8e3c8";
    const correctNumber = "whatsapp:+5551998770099";

    await supabase.from('patients').update({ whatsapp_number: correctNumber }).eq('id', patientId);

    const { data } = await supabase.from('patients').select('whatsapp_number').eq('id', patientId).single();
    console.log("Forced current DB state:", data);
}

fixAgain();
