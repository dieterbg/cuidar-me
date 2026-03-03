
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignUp() {
    const email = `admin@gmail.com`;
    const password = 'Password123!';

    console.log(`Attempting to sign up with: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                displayName: 'Admin Test',
                role: 'pendente',
                phone: '11999999999'
            }
        }
    });

    if (error) {
        console.error('SIGN UP ERROR:', error.message, error.status);
        return;
    }

    console.log('SIGN UP SUCCESS:', data.user?.id);

    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

    if (profileError) {
        console.error('PROFILE FETCH ERROR (Trigger might have failed):', profileError.message);
    } else {
        console.log('PROFILE CREATED:', profile);
    }
}

testSignUp();
