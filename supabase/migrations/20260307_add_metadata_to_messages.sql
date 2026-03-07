-- Migration: Add metadata column to messages table
-- Date: 2026-03-07
-- Purpose: Store AI context, diagnostic info, and structured data

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON messages USING gin(metadata);

-- Add comment for documentation
COMMENT ON COLUMN messages.metadata IS 
'Stores context for messages: {isDiagnostic, intent, confidence, aiDecision, errorStack, etc.}';
