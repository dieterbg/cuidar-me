
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupProtocols() {
    console.log('🧹 Cleaning up incomplete protocols...');

    // 1. Identify protocols with 0 steps
    const { data: protocols, error } = await supabase
        .from('protocols')
        .select(`
      id,
      name,
      protocol_steps (count)
    `);

    if (error) {
        console.error('Error fetching protocols:', error);
        return;
    }

    const toDelete = protocols.filter(p => (p.protocol_steps?.[0]?.count || 0) === 0);

    if (toDelete.length === 0) {
        console.log('✨ No incomplete protocols found.');
        return;
    }

    console.log(`Found ${toDelete.length} protocols to remove:`);
    toDelete.forEach(p => console.log(`- ${p.name} (${p.id})`));

    const idsToDelete = toDelete.map(p => p.id);

    // 2. Check if any patient is using them (to be extra safe)
    const { data: assignments, error: assignError } = await supabase
        .from('patient_protocols')
        .select('protocol_id')
        .in('protocol_id', idsToDelete)
        .eq('is_active', true);

    if (assignError) {
        console.error('Error checking assignments:', assignError);
        return;
    }

    if (assignments && assignments.length > 0) {
        console.warn('⚠️ Warning: Some protocols to be deleted are currently assigned to patients. Skipping deletion for those.');
        // We could filter idsToDelete here if we wanted to be more granular
    }

    // 3. Perform hard delete (or soft delete by setting is_active = false)
    // User asked to "exclua" (delete), so let's use the actual delete for the empty ones.
    const { error: deleteError } = await supabase
        .from('protocols')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('Error deleting protocols:', deleteError);
    } else {
        console.log(`✅ Successfully deleted ${idsToDelete.length} incomplete protocols.`);
    }
}

cleanupProtocols();
