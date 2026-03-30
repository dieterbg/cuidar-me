import { NextRequest, NextResponse } from 'next/server';
import { processMessageQueue } from '@/ai/handle-patient-reply';
import { scheduleProtocolMessages } from '@/cron/send-protocol-messages';
import { sendDailyCheckins } from '@/cron/send-daily-checkins';
import { sendFreemiumTips } from '@/cron/send-freemium-tips';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { getHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Prevent Next.js from caching Supabase query results in the Data Cache
export const dynamic = 'force-dynamic';

/**
 * Unified Cron Orchestrator
 * Consolidates all periodic tasks into a single endpoint to bypass Vercel Hobby limits.
 *
 * Frequency: Hourly (0 * * * *)
 */
export async function GET(request: NextRequest) {
    return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
    return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
    const startTime = Date.now();
    const results: any = {
        messageQueue: null,
        protocolScheduling: null,
        dailyCheckins: null,
        freemiumTips: null
    };

    try {
        // 1. Authentication (supports both Bearer header and ?token= query param)
        const authHeader = request.headers.get('authorization');
        const tokenParam = request.nextUrl.searchParams.get('token');
        const cronSecret = process.env.CRON_SECRET;

        const isAuthorized = !cronSecret ||
            authHeader === `Bearer ${cronSecret}` ||
            tokenParam === cronSecret;

        if (!isAuthorized) {
            console.error('[UNIFIED CRON] Unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const brazilTime = toZonedTime(new Date(), 'America/Sao_Paulo');
        const currentHour = getHours(brazilTime);

        console.log(`[UNIFIED CRON] Starting execution at ${brazilTime.toISOString()} (${currentHour}h BRT)`);

        // TASK 1: Pulse Protocol Scheduling (Runs every time to handle fast-track protocols like "Protocolo Teste")
        if (currentHour !== 6) {
            try {
                results.protocolSchedulingPulse = await scheduleProtocolMessages(true);
                console.log(`[UNIFIED CRON] Protocol pulse results:`, results.protocolSchedulingPulse);
            } catch (e: any) {
                console.error('[UNIFIED CRON] Protocol pulse error:', e);
                results.protocolSchedulingPulse = { success: false, error: e.message };
            }
        }

        // TASK 2: Process Message Queue (Always runs to send any pending protocol/system messages)
        try {
            const queueSupabase = createServiceRoleClient();
            results.messageQueue = await processMessageQueue(queueSupabase);
            console.log(`[UNIFIED CRON] Queue results:`, results.messageQueue);
        } catch (e: any) {
            console.error('[UNIFIED CRON] Queue error:', e);
            results.messageQueue = { success: false, error: e.message };
        }

        // TASK 3: Regular Protocol Scheduling (Runs at 6 AM BRT)
        if (currentHour === 6) {
            try {
                results.protocolScheduling = await scheduleProtocolMessages(false);
                console.log(`[UNIFIED CRON] Protocol scheduling results:`, results.protocolScheduling);
            } catch (e: any) {
                console.error('[UNIFIED CRON] Protocol scheduling error:', e);
                results.protocolScheduling = { success: false, error: e.message };
            }
        }

        // TASK 3: Daily Check-ins (Logic inside sendDailyCheckins already checks for hours 8, 14, 19)
        try {
            results.dailyCheckins = await sendDailyCheckins();
            console.log(`[UNIFIED CRON] Daily check-in results:`, results.dailyCheckins);
        } catch (e: any) {
            console.error('[UNIFIED CRON] Daily check-in error:', e);
            results.dailyCheckins = { success: false, error: e.message };
        }

        // TASK 4: Freemium Tips (Logic inside sendFreemiumTips checks for 8 AM)
        try {
            results.freemiumTips = await sendFreemiumTips();
            console.log(`[UNIFIED CRON] Freemium tips results:`, results.freemiumTips);
        } catch (e: any) {
            console.error('[UNIFIED CRON] Freemium tips error:', e);
            results.freemiumTips = { success: false, error: e.message };
        }

        const duration = Date.now() - startTime;
        return NextResponse.json({
            success: true,
            durationMs: duration,
            results,
            timestamp: brazilTime.toISOString()
        });

    } catch (error: any) {
        console.error('[UNIFIED CRON] Fatal error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
