-- Migration: Create message queue for decoupled AI processing
-- Date: 2026-03-07
-- Purpose: Store incoming Twilio webhooks to process AI responses asynchronously, preventing Vercel timeouts

CREATE TABLE IF NOT EXISTS public.message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number TEXT NOT NULL,
    message_text TEXT NOT NULL,
    profile_name TEXT,
    message_sid TEXT UNIQUE, -- Ensures idempotency at the queue level
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for fast queue processing
CREATE INDEX IF NOT EXISTS idx_message_queue_status_pending 
ON public.message_queue (status, created_at ASC) 
WHERE status = 'pending';

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_message_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_message_queue_updated_at ON public.message_queue;
CREATE TRIGGER trg_message_queue_updated_at
BEFORE UPDATE ON public.message_queue
FOR EACH ROW
EXECUTE FUNCTION update_message_queue_updated_at();

-- Comment for table
COMMENT ON TABLE public.message_queue IS 'Queue for decoupling AI heavy-lifting from fast Twilio webhooks.';
