
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('🚀 Starting migration: weight_goal_kg');

    // Check column
    const { error: checkError } = await supabase.from('patients').select('weight_goal_kg').limit(1);

    if (checkError) {
        console.log('⚠️ Column weight_goal_kg is missing.');
        console.log('Please run: ALTER TABLE patients ADD COLUMN weight_goal_kg DECIMAL(5,2);');
        return;
    }

    console.log('✅ Column exists. Migrating...');
    const { data: protocols } = await supabase
        .from('patient_protocols')
        .select('patient_id, weight_goal_kg')
        .eq('is_active', true)
        .not('weight_goal_kg', 'is', null);

    for (const p of (protocols || [])) {
        await supabase.from('patients').update({ weight_goal_kg: p.weight_goal_kg }).eq('id', p.patient_id);
        console.log(`✅ Migrated for ${p.patient_id}`);
    }
    console.log('🏁 Done.');
}

migrate();
