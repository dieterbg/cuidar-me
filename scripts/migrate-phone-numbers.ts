
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { normalizeBrazilianNumber } from '../src/lib/utils';

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

async function migrate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching all patients...');
    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, full_name, whatsapp_number');

    if (error) {
        console.error('Error fetching patients:', error);
        return;
    }

    console.log(`Found ${patients.length} patients. Checking for normalization...`);

    for (const patient of patients) {
        if (!patient.whatsapp_number) continue;

        const normalized = normalizeBrazilianNumber(patient.whatsapp_number);

        if (normalized !== patient.whatsapp_number) {
            console.log(`Normalizing [${patient.full_name}]: "${patient.whatsapp_number}" -> "${normalized}"`);
            const { error: updateError } = await supabase
                .from('patients')
                .update({ whatsapp_number: normalized })
                .eq('id', patient.id);

            if (updateError) {
                console.error(`Failed to update ${patient.full_name}:`, updateError);
            }
        } else {
            // console.log(`Skipping [${patient.full_name}]: already normalized or invalid.`);
        }
    }

    console.log('Migration completed.');
}

migrate().catch(console.error);
