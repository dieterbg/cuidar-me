import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    const testPatients = [
        { name: 'Teste Freemium', phone: 'whatsapp:+5511911110001', plan: 'freemium' },
        { name: 'Teste Premium', phone: 'whatsapp:+5511911110002', plan: 'premium' },
        { name: 'Teste VIP', phone: 'whatsapp:+5511911110003', plan: 'vip' }
    ];

    for (const p of testPatients) {
        console.log(`Setting up ${p.name} (${p.plan})...`);

        // 1. Upsert patient
        const { data: patient, error: pError } = await supabase
            .from('patients')
            .upsert({
                full_name: p.name,
                whatsapp_number: p.phone,
                plan: p.plan,
                status: 'pending'
            }, { onConflict: 'whatsapp_number' })
            .select()
            .single();

        if (pError) {
            console.error(`Error setting up ${p.name}:`, pError);
            continue;
        }

        // 2. Clean up old onboarding states
        await supabase
            .from('onboarding_states')
            .delete()
            .eq('patient_id', patient.id);

        // 3. Create fresh onboarding state
        await supabase
            .from('onboarding_states')
            .insert({
                patient_id: patient.id,
                step: 'welcome',
                plan: p.plan,
                data: {}
            });

        console.log(`✅ ${p.name} ready.`);
    }
}

setup().catch(console.error);
