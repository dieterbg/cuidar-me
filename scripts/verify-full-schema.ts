/**
 * Full Schema Verification Script
 * Verifies if all required tables and columns exist
 * Run with: npx tsx scripts/verify-full-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable(tableName: string, columnsToCheck: string[]) {
    console.log(`\nChecking table: ${tableName}...`);

    // Try to select columns with limit 0 to check existence
    const { error } = await supabase
        .from(tableName)
        .select(columnsToCheck.join(','))
        .limit(0);

    if (error) {
        console.error(`❌ Error accessing ${tableName}:`, error.message);
        return false;
    }

    console.log(`✅ Table ${tableName} and columns [${columnsToCheck.join(', ')}] exist.`);
    return true;
}

async function runVerification() {
    console.log('🔍 Starting Full Schema Verification...\n');
    let allPassed = true;

    // 1. Patients
    if (!await verifyTable('patients', ['id', 'status', 'plan', 'preferred_message_time', 'whatsapp_number'])) {
        allPassed = false;
    }

    // 2. Onboarding States
    if (!await verifyTable('onboarding_states', ['id', 'step', 'plan', 'data', 'completed_at'])) {
        allPassed = false;
    }

    // 3. Daily Check-in States
    if (!await verifyTable('daily_checkin_states', ['id', 'step', 'date', 'data', 'completed_at'])) {
        allPassed = false;
    }

    // 4. Daily Checkins (History)
    if (!await verifyTable('daily_checkins', ['id', 'hydration', 'breakfast', 'lunch', 'dinner', 'activity', 'wellbeing', 'weight_kg'])) {
        allPassed = false;
    }

    // 5. Scheduled Messages
    if (!await verifyTable('scheduled_messages', ['id', 'metadata', 'status', 'send_at', 'message_content'])) {
        allPassed = false;
    }

    // 6. Messages
    if (!await verifyTable('messages', ['id', 'text', 'sender', 'patient_id'])) {
        allPassed = false;
    }

    // 7. Patient Protocols
    if (!await verifyTable('patient_protocols', ['id', 'current_day', 'is_active', 'patient_id', 'protocol_id'])) {
        allPassed = false;
    }

    console.log('\n-----------------------------------');
    if (allPassed) {
        console.log('🎉 SCHEMA VERIFICATION PASSED! Database is ready.');
    } else {
        console.error('❌ SCHEMA VERIFICATION FAILED. Check errors above.');
        process.exit(1);
    }
}

runVerification().catch(console.error);
