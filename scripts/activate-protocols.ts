
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function activateProtocols() {
    console.log('🚀 Activating all clinical protocols...');

    // Activate all protocols except those we might want to keep disabled (if any)
    // According to GOLDEN-RULES, we want Fundamentos, Evolução, and Performance.
    const { data, error } = await supabase
        .from('protocols')
        .update({ is_active: true })
        .match({ is_active: false }) // Only activate those that are currently inactive to be safe
        .select();

    if (error) {
        console.error('Error activating protocols:', error);
    } else {
        console.log(`✅ Activated ${data.length} protocols:`);
        data.forEach(p => console.log(`- ${p.name}`));
    }
}

activateProtocols();
