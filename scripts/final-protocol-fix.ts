
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalCleanup() {
    console.log('🚀 Final Protocol Cleanup & Renaming...');

    const keepNames = ['Fundamentos (Iniciante)', 'Evolução (Intermediário)', 'Performance (Avançado)'];

    // 1. Get all protocols
    const { data: protocols } = await supabase.from('protocols').select('id, name');
    if (!protocols) return;

    const toDelete = protocols.filter(p => !keepNames.includes(p.name));
    const toKeep = protocols.filter(p => keepNames.includes(p.name));

    console.log(`\n❌ Deleting ${toDelete.length} placeholder protocols...`);
    const delIds = toDelete.map(p => p.id);

    const { error: delError } = await supabase.from('protocols').delete().in('id', delIds);
    if (delError) {
        console.error('Delete Error:', delError);
    } else {
        console.log('✅ Placeholders deleted.');
    }

    // 2. Rename the remaining 3
    console.log('\n📝 Renaming complete protocols to standard names...');

    const renameMap: Record<string, string> = {
        'Fundamentos (Iniciante)': 'Protocolo Fundamentos (Completo)',
        'Evolução (Intermediário)': 'Protocolo Evolução (Completo)',
        'Performance (Avançado)': 'Protocolo Performance (Completo)'
    };

    for (const protocol of toKeep) {
        const newName = renameMap[protocol.name];
        console.log(`- Renaming "${protocol.name}" to "${newName}"`);
        await supabase.from('protocols').update({ name: newName }).eq('id', protocol.id);
    }

    console.log('\n✨ All done!');
}

finalCleanup();
