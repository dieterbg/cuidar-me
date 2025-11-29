import { NextRequest, NextResponse } from 'next/server';
import { scheduleProtocolMessages } from '@/cron/send-protocol-messages';

/**
 * API Route para cron job de agendamento de mensagens de protocolo
 * 
 * Configurar no Vercel:
 * - Vercel Cron Jobs (vercel.json) - 6h da manhã
 * - Ou usar serviço externo como cron-job.org
 * 
 * Endpoint: /api/cron/schedule-protocol-messages
 * Método: GET ou POST
 * 
 * Autenticação: Usar CRON_SECRET para segurança
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
            console.error('[CRON API] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[CRON API] Starting protocol message scheduling...');

        // Executar agendamento de mensagens
        const result = await scheduleProtocolMessages();

        if (result.success) {
            console.log('[CRON API] Success:', result);
            return NextResponse.json({
                success: true,
                messagesScheduled: result.messagesScheduled,
                protocolsCompleted: result.protocolsCompleted,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('[CRON API] Failed:', result.error);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('[CRON API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
