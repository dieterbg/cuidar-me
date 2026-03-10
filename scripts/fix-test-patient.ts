
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixPatient() {
    const patientId = '2fbe9232-22f1-4201-8cec-beefb0f8e3c8'; // Dieter BG
    const correctNumber = 'whatsapp:+5551998770099';

    console.log(`🚀 Updating patient ${patientId} to Premium and number ${correctNumber}...`);

    const { data, error } = await supabase
        .from('patients')
        .update({
            plan: 'premium',
            whatsapp_number: correctNumber
        })
        .eq('id', patientId)
        .select();

    if (error) {
        console.error('Error updating patient:', error);
    } else {
        console.log('✅ Patient updated successfully:', JSON.stringify(data, null, 2));
    }
}

fixPatient();
