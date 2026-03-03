
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listAll() {
    console.log('--- START AUDIT ---');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Total users in Auth: ${users.length}`);
    users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email} (${u.id}) - role: ${u.user_metadata?.role}`);
    });

    const { data: profiles } = await supabase.from('profiles').select('email, id, role');
    console.log(`Total profiles: ${profiles?.length || 0}`);
    profiles?.forEach((p, i) => {
        console.log(`${i + 1}. ${p.email} (${p.id}) - role: ${p.role}`);
    });

    console.log('--- END AUDIT ---');
}

listAll();
