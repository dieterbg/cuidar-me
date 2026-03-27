import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    // 1. Clear ALL error/old scheduled messages
    console.log('🧹 Clearing old scheduled messages...');
    await s.from('scheduled_messages').delete().eq('status', 'error');
    await s.from('scheduled_messages').delete().eq('status', 'pending').eq('source', 'protocol');

    // 2. Get active protocol assignment
    const { data: pp } = await s
        .from('patient_protocols')
        .select('*, patient:patients(id, full_name, whatsapp_number)')
        .eq('is_active', true)
        .single();

    if (!pp) {
        console.log('❌ No active protocol found!');
        return;
    }

    console.log(`📋 Patient: ${pp.patient.full_name}`);
    console.log(`📱 WhatsApp: ${pp.patient.whatsapp_number}`);

    // 3. Get protocol steps
    const { data: steps } = await s
        .from('protocol_steps')
        .select('*')
        .eq('protocol_id', pp.protocol_id)
        .order('day', { ascending: true });

    if (!steps || steps.length === 0) {
        console.log('❌ No protocol steps found!');
        return;
    }

    // 4. Schedule at 5-minute intervals starting NOW
    const now = new Date();
    const INTERVAL_MIN = 5;

    console.log(`\n⏰ Scheduling ${steps.length} messages (every ${INTERVAL_MIN} min from now):\n`);

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const sendAt = new Date(now.getTime() + i * INTERVAL_MIN * 60 * 1000);
        const timeStr = sendAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const { error } = await s.from('scheduled_messages').insert({
            patient_id: pp.patient.id,
            patient_whatsapp_number: pp.patient.whatsapp_number,
            message_content: step.message,
            send_at: sendAt.toISOString(),
            source: 'protocol',
            status: 'pending',
            metadata: {
                protocolDay: step.day,
                title: step.title,
                isGamification: step.is_gamification || false,
                perspective: step.perspective || null
            }
        });

        const tag = step.is_gamification ? '🎮' : '📩';
        if (error) {
            console.log(`  ❌ #${i + 1}: ${error.message}`);
        } else {
            console.log(`  ${tag} #${i + 1} → ${timeStr} | Day ${step.day}: ${step.title}`);
        }
    }

    // 5. Update current_day to 1 (reset for fresh test)
    await s.from('patient_protocols').update({ current_day: 1 }).eq('id', pp.id);

    console.log('\n✅ All messages scheduled! The cron-job.org will process them every 5 minutes.');
    console.log('   First message should arrive within 5 minutes.');
}

run().catch(console.error);
