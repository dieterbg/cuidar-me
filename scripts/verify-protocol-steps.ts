
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySteps() {
    console.log('🔍 Verifying protocol steps...');
    const { data: protocols, error } = await supabase
        .from('protocols')
        .select(`
      id,
      name,
      protocol_steps (count)
    `)
        .eq('is_active', true);

    if (error) {
        console.error('Error verifying steps:', error);
        return;
    }

    console.log(`\n✅ Verified ${protocols.length} active protocols:`);
    protocols.forEach(p => {
        const stepCount = p.protocol_steps?.[0]?.count || 0;
        console.log(`- ${p.name}: ${stepCount} steps`);
    });
}

verifySteps();
