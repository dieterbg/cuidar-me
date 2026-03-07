import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { handlePatientReply } from '@/ai/handle-patient-reply';

// This forces Next.js to not cache the response, ensuring it always processes the queue
export const dynamic = 'force-dynamic';
// Vercel Hobby allows up to 10s for Serverless Functions. 
// We process MAX 1 message per invocation to minimize timeout risk.
export const maxDuration = 10;

export async function POST(req: NextRequest) {
    // 1. Validate authorization
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'fallback-secret';

    if (authHeader !== `Bearer ${expectedToken}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();

    try {
        console.log('[PROCESS QUEUE] Fetching pending messages...');

        // 2. Safely get the FIRST pending message, locking it to prevent concurrent processing
        // Since Supabase limits strict row tracking on simple selects, we use a rapid update approach.
        const { data: pendingMessages, error: fetchError } = await supabase
            .from('message_queue')
            .select('id, whatsapp_number, message_text, profile_name, message_sid')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!pendingMessages || pendingMessages.length === 0) {
            console.log('[PROCESS QUEUE] No pending messages found.');
            return NextResponse.json({ success: true, message: 'No pending messages' });
        }

        const msg = pendingMessages[0];

        // 3. Mark as processing IMMEDIATELY
        const { error: lockError } = await supabase
            .from('message_queue')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', msg.id)
            .eq('status', 'pending'); // Ensure it wasn't picked up by another concurrent request

        if (lockError) throw lockError;

        console.log(`[PROCESS QUEUE] Processing msg ${msg.id} for ${msg.whatsapp_number}`);

        // 4. Delegate to the original AI handler
        const result = await handlePatientReply(
            msg.whatsapp_number,
            msg.message_text,
            msg.profile_name || 'Novo Contato',
            msg.message_sid
        );

        // 5. Update status based on result
        if (result.success) {
            await supabase
                .from('message_queue')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', msg.id);
            console.log(`[PROCESS QUEUE] Successfully completed msg ${msg.id}`);
        } else {
            // Technically handlePatientReply catches most errors, but if it signals failure:
            await supabase
                .from('message_queue')
                .update({
                    status: 'error',
                    error_log: result.error || 'Unknown AI error',
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);
            console.error(`[PROCESS QUEUE] AI processing failed for msg ${msg.id}:`, result.error);
        }

        return NextResponse.json({ success: true, processed_id: msg.id });

    } catch (error: any) {
        console.error('[PROCESS QUEUE] Catastrophic error:', error);
        return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }
}

// Support GET for manual triggering or simpler cron jobs
export async function GET(req: NextRequest) {
    return POST(req);
}
