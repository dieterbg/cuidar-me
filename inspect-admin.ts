
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectAdmin() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('List error:', error);
        return;
    }

    const admin = users.find(u => u.email === 'admin@gmail.com');
    if (admin) {
        console.log('--- ADMIN METADATA ---');
        console.log('ID:', admin.id);
        console.log('Metadata:', JSON.stringify(admin.user_metadata, null, 2));
        console.log('Created At:', admin.created_at);
        console.log('Confirmed At:', admin.email_confirmed_at);
    } else {
        console.log('admin@gmail.com not found in Auth.');
    }
}

inspectAdmin();
