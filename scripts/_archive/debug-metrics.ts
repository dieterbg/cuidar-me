
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMetrics() {
    console.log('🔍 Debugging Health Metrics...');

    // 1. Find Ana Silva
    const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name')
        .ilike('full_name', '%Ana Silva%')
        .single();

    if (patientError || !patient) {
        console.error('❌ Ana Silva not found:', patientError?.message);
        return;
    }

    console.log(`✅ Found Patient: ${patient.full_name} (${patient.id})`);

    // 2. Check Metrics
    const { data: metrics, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patient_id', patient.id);

    if (metricsError) {
        console.error('❌ Error fetching metrics:', metricsError.message);
        return;
    }

    console.log(`📊 Found ${metrics.length} metrics for Ana Silva.`);
    if (metrics.length > 0) {
        console.log('Sample metric:', metrics[0]);
    } else {
        console.log('⚠️ No metrics found! Seed script might have failed or patient ID mismatch.');
    }

    // 3. Check Table Structure (Metadata) - Indirectly by checking keys of a record if exists
    // Or just trusting the select * result.
}

debugMetrics();
