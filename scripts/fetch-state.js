const fs = require('fs');

async function run() {
    // Read env vars
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(['"]?)(.*?)\\1`));
        return match ? match[2] : null;
    };

    const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Missing Supabase credentials');
    }

    const fetchSupabase = async (table, query) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        return res.json();
    };

    // 1. Get patient
    const patients = await fetchSupabase('patients', 'whatsapp_number=like.*0099&select=*&order=created_at.desc&limit=1');
    if (!patients || patients.length === 0) {
        console.log('Patient not found');
        return;
    }

    const patient = patients[0];
    console.log('=== PATIENT ===');
    console.log(`ID: ${patient.id}, Name: ${patient.full_name}, Phone: ${patient.whatsapp_number}`);

    // 2. Get Onboarding States
    const states = await fetchSupabase('onboarding_states', `patient_id=eq.${patient.id}&order=created_at.desc`);
    console.log('\n=== ONBOARDING STATES ===');
    console.log(JSON.stringify(states, null, 2));

    // 3. Get Messages
    const messages = await fetchSupabase('messages', `patient_id=eq.${patient.id}&order=created_at.desc&limit=10`);
    console.log('\n=== RECENT MESSAGES ===');
    messages?.forEach(m => {
        console.log(`[${m.created_at}] [${m.sender}] ${m.text.substring(0, 50).replace(/\n/g, ' ')}...`);
    });
}

run().catch(console.error);
