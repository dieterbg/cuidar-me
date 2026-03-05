import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function run() {
    const supabase = createServiceRoleClient();

    // Fetch all active protocols
    const { data: protocols, error } = await supabase.from('protocols').select('id, name').eq('is_active', true);

    if (error) {
        console.error('Error fetching protocols:', error);
        return;
    }

    console.log('Active Protocols Before Cleanup:');
    console.table(protocols);

    const idsToKeepString = ['Fundamentos (30', 'Evolução (30', 'Performance (30']; // Usually they have this in the name
    const idsToKeep = ['fundamentos_iniciante', 'evolucao_intermediario', 'performance_avancado'];

    // Instead of guessing IDs, let's keep ones that DON'T have "90 Dias" in the name
    // and DO have "30 Dias" or don't have "90". Let's explicitly search for "90 Dias" and deactivate them.
    for (const p of protocols || []) {
        if (p.name.includes('90 Dias')) {
            console.log(`Deactivating ${p.name} (${p.id})`);
            await supabase.from('protocols').update({ is_active: false }).eq('id', p.id);
        } else {
            // Let's also deactivate "Performance (Avançado)", "Evolução (Intermediário)", "Fundamentos (Iniciante)" if the ones we want are the 30 Dias ones.
            // Wait, the ones we built using the golden rules say "Protocolo Fundamentos (30 Dias)".
            // Let's only keep exactly the ones that have `(30 Dias)` in the name, since those are our Golden Rule protocols.
            if (!p.name.includes('(30 Dias)')) {
                console.log(`Deactivating ${p.name} (${p.id})`);
                await supabase.from('protocols').update({ is_active: false }).eq('id', p.id);
            }
        }
    }

    const { data: after } = await supabase.from('protocols').select('id, name').eq('is_active', true);
    console.log('Active Protocols After Cleanup:');
    console.table(after);
}

run().catch(console.error);
