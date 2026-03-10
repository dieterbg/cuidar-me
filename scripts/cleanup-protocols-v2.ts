
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupIncomplete() {
    console.log('🔍 Fetching all protocols and their steps...');

    const { data: protocols, error: protError } = await supabase
        .from('protocols')
        .select('id, name');

    if (protError) {
        console.error('Error:', protError);
        return;
    }

    const result = [];
    for (const protocol of protocols) {
        const { count, error } = await supabase
            .from('protocol_steps')
            .select('*', { count: 'exact', head: true })
            .eq('protocol_id', protocol.id);

        result.push({ ...protocol, stepCount: count || 0 });
    }

    console.log('\n📊 Protocol Status:');
    result.forEach(r => console.log(`- ${r.name}: ${r.stepCount} steps`));

    const toDelete = result.filter(r => r.stepCount === 0);
    if (toDelete.length === 0) {
        console.log('\n✅ No empty protocols to delete.');
        return;
    }

    console.log(`\n❌ Deleting ${toDelete.length} empty protocols...`);
    const ids = toDelete.map(d => d.id);

    const { error: delError } = await supabase
        .from('protocols')
        .delete()
        .in('id', ids);

    if (delError) {
        console.error('Delete Error:', delError);
    } else {
        console.log('✅ Cleanup complete!');
    }
}

cleanupIncomplete();
