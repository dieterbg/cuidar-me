/**
 * Script to schedule ALL 20 test protocol messages at 5-min intervals from NOW
 * and then continuously process the queue (sending them via WhatsApp).
 * 
 * Usage: npx tsx scripts/schedule-and-send-test.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const params = new URLSearchParams();
        params.append('To', toFormatted);
        params.append('From', TWILIO_WHATSAPP_FROM);
        params.append('Body', body);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await res.json();
        if (data.sid) {
            console.log(`  ✅ Sent! SID: ${data.sid}`);
            return true;
        } else {
            console.error(`  ❌ Twilio error:`, data.message || data);
            return false;
        }
    } catch (e: any) {
        console.error(`  ❌ Send error:`, e.message);
        return false;
    }
}

async function scheduleAllMessages() {
    console.log('📋 Scheduling all 20 test protocol messages...\n');

    // Get test patient
    const { data: pp } = await supabase
        .from('patient_protocols')
        .select('*, patient:patients(id, full_name, whatsapp_number), protocol:protocols(id, name)')
        .eq('is_active', true)
        .single();

    if (!pp) {
        console.error('❌ No active protocol found!');
        return null;
    }

    console.log(`Patient: ${pp.patient.full_name}`);
    console.log(`WhatsApp: ${pp.patient.whatsapp_number}`);
    console.log(`Protocol: ${pp.protocol.name}\n`);

    // Get all protocol steps
    const { data: steps } = await supabase
        .from('protocol_steps')
        .select('*')
        .eq('protocol_id', pp.protocol.id)
        .order('day', { ascending: true });

    if (!steps || steps.length === 0) {
        console.error('❌ No protocol steps found!');
        return null;
    }

    // Clear any existing pending messages for this patient
    await supabase
        .from('scheduled_messages')
        .delete()
        .eq('patient_id', pp.patient.id)
        .eq('status', 'pending');

    const now = new Date();
    const INTERVAL_MINUTES = 5;

    console.log(`⏰ Scheduling ${steps.length} messages starting NOW, every ${INTERVAL_MINUTES} min:\n`);

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const sendAt = new Date(now.getTime() + i * INTERVAL_MINUTES * 60 * 1000);

        const { error } = await supabase.from('scheduled_messages').insert({
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

        const timeStr = sendAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (error) {
            console.log(`  ❌ #${i + 1} (Day ${step.day}): ${error.message}`);
        } else {
            const tag = step.is_gamification ? '🎮' : '📩';
            console.log(`  ${tag} #${i + 1} → ${timeStr} | ${step.title}`);
        }
    }

    return pp;
}

async function processQueue() {
    const now = new Date();
    const { data: pending } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', now.toISOString())
        .order('send_at', { ascending: true })
        .limit(5);

    if (!pending || pending.length === 0) return 0;

    let sent = 0;
    for (const msg of pending) {
        console.log(`\n📤 Sending: "${msg.metadata?.title || msg.message_content.substring(0, 40)}..."`);
        const ok = await sendWhatsApp(msg.patient_whatsapp_number, msg.message_content);

        if (ok) {
            // Primeiro marca como sent, depois tenta inserir no histórico
            await supabase.from('scheduled_messages')
                .update({ status: 'sent', sent_at: now.toISOString() })
                .eq('id', msg.id);

            // Inserir no histórico do paciente (com error handling para não perder o registro)
            try {
                const { error: msgError } = await supabase.from('messages').insert({
                    patient_id: msg.patient_id,
                    sender: 'system',
                    text: msg.message_content,
                    metadata: msg.metadata || null,
                });
                if (msgError) {
                    console.error('  ⚠️ Mensagem enviada mas erro ao salvar no histórico:', msgError.message);
                    // Não falha o fluxo, apenas registra o warning
                }
            } catch (insertError: any) {
                console.error('  ⚠️ Mensagem enviada mas exceção ao salvar no histórico:', insertError.message);
            }
            sent++;
        } else {
            await supabase.from('scheduled_messages')
                .update({ status: 'error', error_info: 'Send failed' })
                .eq('id', msg.id);
        }
    }
    return sent;
}

async function main() {
    const pp = await scheduleAllMessages();
    if (!pp) return;

    console.log('\n\n🚀 Starting queue processor (checking every 60 seconds)...');
    console.log('   Press Ctrl+C to stop.\n');

    // Process immediately in case some are already due
    let totalSent = 0;

    const check = async () => {
        const { count } = await supabase
            .from('scheduled_messages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const sent = await processQueue();
        totalSent += sent;

        if (sent > 0) {
            console.log(`   Total sent so far: ${totalSent} | Remaining: ${(count || 0) - sent}`);
        }

        if ((count || 0) - sent <= 0) {
            console.log('\n🎉 All messages sent! Protocol test complete.');
            process.exit(0);
        }
    };

    // Check immediately
    await check();

    // Then check every 60 seconds
    setInterval(check, 60_000);
}

main().catch(console.error);
