
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listProtocols() {
    console.log('🔍 Fetching all protocols...');
    const { data, error } = await supabase
        .from('protocols')
        .select('*');

    if (error) {
        console.error('Error fetching protocols:', error);
        return;
    }

    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/all-protocols.json', JSON.stringify(data, null, 2));
    console.log('✅ Protocols written to scripts/all-protocols.json');
}

listProtocols();
