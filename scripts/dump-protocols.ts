import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function exportProtocols() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: protocols, error } = await supabase
        .from('protocols')
        .select(`
            *,
            protocol_steps (
                day,
                title,
                message,
                is_gamification,
                perspective
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching protocols:', error);
        process.exit(1);
    }

    fs.writeFileSync('/tmp/protocols_dump.json', JSON.stringify(protocols, null, 2));
    console.log(`Exported ${protocols?.length} protocols to /tmp/protocols_dump.json`);
}

exportProtocols();
