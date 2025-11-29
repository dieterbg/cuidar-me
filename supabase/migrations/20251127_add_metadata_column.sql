-- Migration: Add metadata column to scheduled_messages
-- Date: 2025-11-27
-- Purpose: Store gamification context (day, perspective, checkin title)

ALTER TABLE scheduled_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_metadata 
ON scheduled_messages USING gin(metadata);

-- Add comment for documentation
COMMENT ON COLUMN scheduled_messages.metadata IS 
'Stores context for scheduled messages: {isGamification, protocolDay, perspective, checkinTitle}';
