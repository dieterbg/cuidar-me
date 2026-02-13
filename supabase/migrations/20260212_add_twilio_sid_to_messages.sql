-- Add twilio_sid for idempotency and tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'twilio_sid') THEN
        ALTER TABLE messages ADD COLUMN twilio_sid TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_sid);
