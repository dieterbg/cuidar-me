import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function removeFreemium() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all protocols
    const { data: protocols, error: fetchError } = await supabase
        .from('protocols')
        .select('*');

    if (fetchError) {
        console.error('Error fetching protocols:', fetchError);
        process.exit(1);
    }

    console.log(`Checking ${protocols?.length} protocols...`);

    for (const protocol of protocols) {
        if (protocol.eligible_plans && protocol.eligible_plans.includes('freemium')) {
            const newPlans = protocol.eligible_plans.filter((p: string) => p !== 'freemium');
            console.log(`Updating protocol "${protocol.name}" (ID: ${protocol.id}) to remove freemium. New plans:`, newPlans);

            const { error: updateError } = await supabase
                .from('protocols')
                .update({ eligible_plans: newPlans })
                .eq('id', protocol.id);

            if (updateError) {
                console.error(`Error updating protocol ${protocol.id}:`, updateError);
            } else {
                console.log(`Success updating protocol ${protocol.name}`);
            }
        }
    }
    console.log('Finished updating protocols.');
}

removeFreemium();
