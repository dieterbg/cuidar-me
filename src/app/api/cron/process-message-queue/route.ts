import { NextRequest, NextResponse } from 'next/server';
import { processMessageQueue } from '@/ai/handle-patient-reply';
import { loggers } from '@/lib/logger';

const logger = loggers.cron;

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
            logger.error('Unauthorized cron request attempt', { 
                ip: request.ip, 
                ua: request.headers.get('user-agent') 
            });
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        logger.info('Processing message queue via API');

        // Processar fila de mensagens
        const result = await processMessageQueue();

        // Processar check-ins perdidos (não bloqueia se falhar)
        let missedCheckinsProcessed = 0;
        try {
            const { processMissedCheckins } = await import('@/ai/handle-patient-reply');
            const missedResult = await processMissedCheckins();
            if (missedResult.success) {
                missedCheckinsProcessed = missedResult.processed;
                logger.info('Processed missed check-ins', { count: missedCheckinsProcessed });
            }
        } catch (missedError) {
            logger.warn('Failed to process missed check-ins (non-blocking)', { error: missedError });
        }

        if (result.success) {
            logger.info('Queue processing completed', { processed: result.processed, missedCheckinsProcessed });
            return NextResponse.json({
                success: true,
                processed: result.processed,
                missedCheckinsProcessed,
                timestamp: new Date().toISOString()
            });
        } else {
            logger.error('Queue processing failed', { error: result.error });
            return NextResponse.json(
                {
                    success: false,
                    error: result.error
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        logger.error('Unexpected error in queue API', { error: error.message });
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
