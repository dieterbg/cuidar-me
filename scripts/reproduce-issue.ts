
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { initiateWhatsAppOnboarding } from '../src/ai/actions/initiate-onboarding';

const logFile = 'scripts/repro_log.txt';
function log(msg: string, data?: any) {
    const formattedMsg = data ? `${msg} ${JSON.stringify(data, null, 2)}\n` : `${msg}\n`;
    fs.appendFileSync(logFile, formattedMsg);
    console.log(msg, data || '');
}

// Clear log
fs.writeFileSync(logFile, '');

// Load .env.local
try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envConfig = dotenv.parse(envContent);
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    log('Error loading .env.local:', e);
}

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log('--- Step 1: Inspect Patient Data ---');
    const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('*')
        .ilike('full_name', '%Dieter BG%');

    if (pError || !patients || patients.length === 0) {
        log('Patient not found:', pError);
        return;
    }

    const patient = patients[0];
    log('Patient Found:', {
        id: patient.id,
        full_name: patient.full_name,
        whatsapp_number: patient.whatsapp_number,
        status: patient.status
    });

    log('\n--- Step 2: Clear existing onboarding for clean test ---');
    const { error: delError } = await supabase.from('onboarding_states').delete().eq('patient_id', patient.id);
    log('Onboarding state cleared.', delError);

    log('\n--- Step 3: Trigger Onboarding Action ---');
    try {
        const result = await initiateWhatsAppOnboarding(patient.id);
        log('Result:', result);
    } catch (err: any) {
        log('Action failed with error:', err.message);
    }
}

run().catch(err => log('Fatal error:', err));
