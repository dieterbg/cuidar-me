
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnose() {
    console.log('🔍 Checking for recent AI errors...');

    // 1. Check attention requests
    const { data: attention, error: attError } = await supabase
        .from('attention_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (attention) {
        console.log('\n🚨 RECENT ATTENTION REQUESTS:');
        attention.forEach(a => {
            console.log(`[${a.created_at}] Reason: ${a.reason}`);
            console.log(`Trigger: ${a.trigger_message}`);
            console.log(`Summary: ${a.ai_summary}\n`);
        });
    }

    // 2. Check recent messages with fallback text
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .ilike('text', '%instabilidade%')
        .order('created_at', { ascending: false })
        .limit(5);

    if (messages) {
        console.log('\n💬 FALLBACK MESSAGES FOUND:');
        messages.forEach(m => {
            console.log(`[${m.created_at}] to patient ${m.patient_id}`);
        });
    }
}

diagnose();
