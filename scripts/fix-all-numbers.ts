import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixAll() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing environment variables.");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Checking for patients with potential 9th digit issues...');

    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, full_name, whatsapp_number');

    if (error) {
        console.error('Error fetching patients:', error);
        return;
    }

    let fixCount = 0;
    for (const p of patients) {
        const raw = p.whatsapp_number || '';
        const digits = raw.replace(/\D/g, '');

        // Pattern: 55 (country) + DD (area) + 8 digits (number without mobile 9)
        // If it has 12 digits and starts with 55, it might be missing the 9.
        if (digits.length === 12 && digits.startsWith('55')) {
            const ddd = digits.substring(2, 4);
            const main = digits.substring(4);

            // Heuristic: Most numbers in our context are mobile. 
            // In Brazil, all area codes (DDD) now have the 9th digit for mobile.
            const fixedDigits = `55${ddd}9${main}`;
            const fixedFull = raw.includes('whatsapp:') ? `whatsapp:+${fixedDigits}` : `+${fixedDigits}`;

            console.log(`🔧 Fixing ${p.full_name}: ${raw} -> ${fixedFull}`);

            const { error: updateError } = await supabase
                .from('patients')
                .update({ whatsapp_number: fixedFull })
                .eq('id', p.id);

            if (updateError) {
                console.error(`Failed to fix ${p.id}:`, updateError);
            } else {
                fixCount++;
            }
        }
    }

    console.log(`\n✅ Finished global fix. Updated ${fixCount} patients.`);
}

fixAll();
