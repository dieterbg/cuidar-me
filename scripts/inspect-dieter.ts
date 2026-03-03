
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envConfig = dotenv.parse(envContent);
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Searching for patient Dieter BG...');
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .ilike('full_name', '%Dieter BG%');

    if (error || !data || data.length === 0) {
        console.error('Error fetching patient:', error);
        return;
    }

    const patientId = data[0].id;
    console.log('Results:', JSON.stringify(data, null, 2));

    console.log('--- Onboarding States ---');
    const { data: states } = await supabase
        .from('onboarding_states')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
    console.log('Patient Onboarding States:', JSON.stringify(states, null, 2));

    console.log('--- Message History ---');
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);
    console.log('Recent Messages:', JSON.stringify(messages, null, 2));
}

inspect().catch(console.error);
