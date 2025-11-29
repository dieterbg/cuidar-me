import { NextRequest, NextResponse } from 'next/server';
import { processMessageQueue } from '@/ai/handle-patient-reply';

/**
 * API Route para processar fila de mensagens agendadas
 * 
 * Roda a cada hora para enviar mensagens agendadas
 * 
 * Endpoint: /api/cron/process-message-queue
 * Método: GET ou POST
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
            console.error('[QUEUE API] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[QUEUE API] Processing message queue...');

        // Processar fila de mensagens
        const result = await processMessageQueue();

        // Processar check-ins perdidos (não bloqueia se falhar)
        let missedCheckinsProcessed = 0;
        try {
            const { processMissedCheckins } = await import('@/ai/handle-patient-reply');
            const missedResult = await processMissedCheckins();
            if (missedResult.success) {
                missedCheckinsProcessed = missedResult.processed;
                console.log(`[QUEUE API] Processed ${missedCheckinsProcessed} missed check-ins`);
            }
        } catch (missedError) {
            console.warn('[QUEUE API] Failed to process missed check-ins (non-blocking):', missedError);
        }

        if (result.success) {
            console.log(`[QUEUE API] Processed ${result.processed} messages`);
            return NextResponse.json({
                success: true,
                processed: result.processed,
                missedCheckinsProcessed,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('[QUEUE API] Failed:', result.error);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('[QUEUE API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
