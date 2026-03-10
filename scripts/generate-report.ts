
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function report() {
    const { data: protocols } = await supabase.from('protocols').select('id, name');
    const results = [];

    if (protocols) {
        for (const p of protocols) {
            const { count } = await supabase
                .from('protocol_steps')
                .select('*', { count: 'exact', head: true })
                .eq('protocol_id', p.id);
            results.push({ id: p.id, name: p.name, steps: count || 0 });
        }
    }

    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/protocol-report.json', JSON.stringify(results, null, 2));
    console.log('✅ Report written to scripts/protocol-report.json');
}

report();
