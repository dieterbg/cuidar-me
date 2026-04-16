-- Índice composto para acelerar a query principal do cron
-- Cobre: WHERE status = 'pending' AND send_at <= now ORDER BY send_at ASC
-- Com volume de 50-60 pacientes * 180 msgs = ~9.000 linhas, o planner
-- usará este índice em vez de seq-scan na tabela inteira.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_messages_queue
    ON scheduled_messages (status, send_at ASC)
    WHERE status = 'pending';
