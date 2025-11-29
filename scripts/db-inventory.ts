/**
 * Database Inventory Script
 * Lists status of all expected tables (Exists vs Missing)
 * Run with: npx tsx scripts/db-inventory.ts
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

async function checkDatabaseInventory() {
    console.log('📊 Verificando Inventário do Banco de Dados...\n');

    const tablesToCheck = [
        // Core
        'patients',
        'profiles',
        'messages',

        // Protocols
        'protocols',
        'patient_protocols',
        'scheduled_messages',

        // New Features (Expected to be missing)
        'daily_checkins',
        'daily_checkin_states',
        'onboarding_states',
        'weekly_progress',
        'attention_requests'
    ];

    console.log('Status das Tabelas:');
    console.log('-------------------');

    for (const table of tablesToCheck) {
        // Try to select count (head: true means no data download)
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            // Error usually means table doesn't exist (404) or permission denied
            if (error.message.includes('does not exist') || error.code === '42P01') {
                console.log(`❌ ${table.padEnd(25)} : NÃO EXISTE (Faltando)`);
            } else {
                console.log(`⚠️ ${table.padEnd(25)} : ERRO (${error.message})`);
            }
        } else {
            console.log(`✅ ${table.padEnd(25)} : OK (${count} registros)`);
        }
    }
    console.log('\n-------------------');
    console.log('Para corrigir as tabelas faltando, rode o script SQL consolidado no Supabase.');
}

checkDatabaseInventory().catch(console.error);
