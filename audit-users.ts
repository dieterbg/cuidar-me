
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function auditUsers() {
    console.log('--- AUDITING USERS ---');

    // 1. List Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('AUTH LIST ERROR:', authError);
    } else {
        console.log(`Found ${users.length} users in Auth.`);
        const adminUser = users.find(u => u.email === 'admin@gmail.com');
        if (adminUser) {
            console.log('admin@gmail.com EXISTS in Auth:', adminUser.id);
        } else {
            console.log('admin@gmail.com DOES NOT EXIST in Auth.');
        }

        // List all emails for debugging
        console.log('Emails in Auth:', users.map(u => u.email).join(', '));
    }

    // 2. List Profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) {
        console.error('PROFILES LIST ERROR:', profileError);
    } else {
        console.log(`Found ${profiles.length} profiles.`);
        const adminProfile = profiles.find(p => p.email === 'admin@gmail.com');
        if (adminProfile) {
            console.log('admin@gmail.com EXISTS in Profiles:', adminProfile);
        } else {
            console.log('admin@gmail.com DOES NOT EXIST in Profiles.');
        }
    }
}

auditUsers();
