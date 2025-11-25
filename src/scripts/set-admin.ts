
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
      // Remove quotes if present
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
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.log('Found URL:', supabaseUrl ? 'Yes' : 'No');
  console.log('Found Key:', supabaseServiceKey ? 'Yes' : 'No');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setAdmin(email: string) {
  console.log(`Setting admin role for user with email: ${email}`);

  // 1. Get user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error listing users:', userError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // 2. Update profile role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    
    if (updateError.message.includes('invalid input syntax for type user_role')) {
        console.error('\nCRITICAL ERROR: The "admin" role does not exist in the database enum.');
        console.error('Please run the SQL command: ALTER TYPE user_role ADD VALUE IF NOT EXISTS \'admin\';');
    }
    return;
  }

  console.log(`Successfully updated role to 'admin' for user ${email}`);
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx src/scripts/set-admin.ts <email>');
  process.exit(1);
}

setAdmin(email);
