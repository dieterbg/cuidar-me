
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

async function confirmEmail(email: string) {
    console.log(`Confirming email for: ${email}...`);

    // 1. Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ User with email ${email} NOT FOUND.`);
        return;
    }

    // 2. Confirm email
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (error) {
        console.error('❌ Failed to confirm email:', error.message);
    } else {
        console.log('🎉 Email confirmed successfully!');
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx src/scripts/confirm-email.ts <email>');
    process.exit(1);
}

confirmEmail(email);
