
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing to ensure we get the keys
function loadEnv(filePath: string) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
    return env;
}

const envLocal = loadEnv(path.resolve(process.cwd(), '.env.local'));
const env = loadEnv(path.resolve(process.cwd(), '.env'));

const supabaseUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envLocal.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Could not find Supabase credentials in .env or .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAdmin(email: string) {
    console.log(`Verifying user: ${email}...`);

    // 1. Check Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ User with email ${email} NOT FOUND in Auth.`);
        return;
    }
    console.log(`✅ Auth User found: ${user.id}`);

    // 2. Check Profile Role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError.message);
        return;
    }

    if (profile.role === 'admin') {
        console.log(`🎉 SUCCESS! User '${email}' has role 'admin'.`);
    } else {
        console.log(`⚠️ User found, but role is '${profile.role}' (expected 'admin').`);
        console.log('Attempting to fix...');

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Failed to update role:', updateError.message);
        } else {
            console.log('✅ Role updated to admin successfully.');
        }
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx src/scripts/verify-admin.ts <email>');
    process.exit(1);
}

verifyAdmin(email);
