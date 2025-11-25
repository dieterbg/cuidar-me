
import { NextRequest, NextResponse } from 'next/server';
import { processMessageQueue, processMissedCheckins } from '@/ai/handle-patient-reply';
import { headers } from 'next/headers';

// Rota de API para ser chamada por um serviço de Cron Job (ex: Google Cloud Scheduler)
export async function GET(request: NextRequest) {
  // 1. Verificação de Segurança (usando um segredo compartilhado)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CRON] Erro: A variável de ambiente CRON_SECRET não está definida.');
    // Em produção, é crucial ter um segredo.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Internal Server Error: Cron secret not configured.', { status: 500 });
    }
  }

  // Em desenvolvimento, podemos pular a verificação se o segredo não estiver definido.
  // Em produção, a verificação é obrigatória.
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    console.warn(`[CRON] Tentativa de acesso não autorizado.`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Em desenvolvimento, avisa se o segredo não for usado, mas permite a execução.
  if (process.env.NODE_ENV === 'development' && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CRON] Aviso: Executando em modo de desenvolvimento sem segredo de cron. Não faça isso em produção.");
  }


  // 2. Execução das Tarefas Agendadas
  try {
    console.log('[CRON] Iniciando processamento da fila de mensagens...');
    const queueResult = await processMessageQueue();
    console.log(`[CRON] Fila de mensagens processada: ${queueResult.processed} enviadas.`);

    console.log('[CRON] Iniciando verificação de check-ins perdidos...');
    const checkinResult = await processMissedCheckins();
    console.log(`[CRON] Verificação de check-ins concluída.`);

    return NextResponse.json({
      success: true,
      processedMessages: queueResult.processed,
      processedMissedCheckins: 0 // checkinResult.processedCount
    });

  } catch (error: any) {
    console.error('[CRON] Erro fatal durante a execução das tarefas agendadas:', error);
    return new NextResponse(`Cron Job Error: ${error.message}`, { status: 500 });
  }
}
