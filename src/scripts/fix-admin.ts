
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
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
    console.error('Error: Could not find Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdmin(email: string) {
    console.log(`Fixing admin user: ${email}...`);

    // 1. Check Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ User with email ${email} NOT FOUND in Auth. Please sign up first.`);
        return;
    }
    console.log(`✅ Auth User found: ${user.id}`);

    // 2. Check/Create Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        console.error('❌ Error checking profile:', profileError.message);
        return;
    }

    if (!profile) {
        console.log('⚠️ Profile not found. Creating admin profile...');
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: email,
                display_name: 'Admin User',
                role: 'admin',
                photo_url: `https://ui-avatars.com/api/?name=Admin+User&background=random`
            });

        if (insertError) {
            console.error('❌ Failed to create profile:', insertError.message);
        } else {
            console.log('🎉 Admin profile created successfully!');
        }
    } else {
        console.log(`ℹ️ Profile found. Current role: ${profile.role}`);
        if (profile.role !== 'admin') {
            console.log('Updating role to admin...');
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', user.id);

            if (updateError) {
                console.error('❌ Failed to update role:', updateError.message);
            } else {
                console.log('✅ Role updated to admin successfully.');
            }
        } else {
            console.log('✅ User is already an admin.');
        }
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx src/scripts/fix-admin.ts <email>');
    process.exit(1);
}

fixAdmin(email);
