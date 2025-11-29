import { NextRequest, NextResponse } from 'next/server';
import { sendDailyCheckins } from '@/cron/send-daily-checkins';

/**
 * API Route para cron job de check-ins diários genéricos
 * 
 * Configurar no Vercel Cron Jobs (vercel.json)
 * Executar a cada hora para cobrir todos os turnos (8h, 14h, 20h)
 * 
 * Endpoint: /api/cron/send-daily-checkins
 * Autenticação: CRON_SECRET
 */
export async function GET(request: NextRequest) {
    return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
    return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
    try {
        // Verificar autenticação via secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.error('[DailyCheckin API] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[DailyCheckin API] Starting daily check-in processing...');

        // Executar envio
        const result = await sendDailyCheckins();

        if (result.error) {
            console.error('[DailyCheckin API] Failed:', result.error);
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        console.log('[DailyCheckin API] Success:', result);
        return NextResponse.json({
            success: true,
            processed: result.processed,
            skipped: result.skipped,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[DailyCheckin API] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
