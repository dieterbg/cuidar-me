import { NextRequest, NextResponse } from 'next/server';
import { sendFreemiumTips } from '@/cron/send-freemium-tips';
import { validateCronAuth } from '@/lib/cron-auth';

/**
 * API Route para cron job de dicas diárias (BLOCOS FREEMIUM)
 * 
 * Configurar no Vercel Cron Jobs (vercel.json)
 * Executar diarimente às 08:00 BRT
 * 
 * Endpoint: /api/cron/send-freemium-tips
 */
export async function GET(request: NextRequest) {
    return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
    return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
    try {
        const authError = validateCronAuth(request);
        if (authError) return authError;

        const result = await sendFreemiumTips();

        return NextResponse.json({
            success: true,
            processed: result.processed,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[FreemiumTips API] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
