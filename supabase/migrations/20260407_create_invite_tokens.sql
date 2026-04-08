-- Migration: Create invite_tokens table for QR Code pre-approved onboarding
-- Allows admin/staff to generate time-limited invite links that bypass manual approval

CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    plan TEXT NOT NULL DEFAULT 'freemium',
    created_by UUID REFERENCES auth.users(id),
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Staff can create invite tokens
CREATE POLICY "staff_can_insert_invites" ON invite_tokens
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );

-- Staff can read all tokens
CREATE POLICY "staff_can_read_invites" ON invite_tokens
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );

-- Anyone can read valid (unused, unexpired) tokens by exact token match
-- This is needed for the consume-invite endpoint (service role bypasses RLS anyway)
CREATE POLICY "anyone_can_verify_valid_token" ON invite_tokens
    FOR SELECT TO anon
    USING (
        expires_at > NOW() AND used_at IS NULL
    );

-- Staff can update tokens (mark as used)
CREATE POLICY "staff_can_update_invites" ON invite_tokens
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );
