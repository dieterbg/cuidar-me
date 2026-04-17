-- ============================================================
-- Migration: Sistema de logs — Fase 1 (fundação)
-- Data: 2026-04-17
-- Cria 4 tabelas de log com RLS estrita.
--   • audit_logs       — quem fez o quê (LGPD Art. 18/19)
--   • security_events  — tentativas suspeitas, RLS denials
--   • business_events  — funil, métricas (pseudonimizado)
--   • twilio_webhooks  — status callbacks de mensagens
-- Todas append-only via RLS; só service_role escreve; só admin lê.
-- ============================================================

-- ============================================================
-- 1. audit_logs — trilha de auditoria (retenção: 5 anos)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role   TEXT,                  -- 'admin' | 'equipe_saude' | 'assistente' | 'patient' | 'system'
    action       TEXT NOT NULL,         -- ex: 'view_patient', 'update_patient', 'send_whatsapp', 'reschedule_message'
    resource_type TEXT NOT NULL,        -- ex: 'patient', 'message', 'protocol', 'scheduled_message'
    resource_id  UUID,
    patient_id   UUID REFERENCES patients(id) ON DELETE SET NULL,
    ip           INET,
    user_agent   TEXT,
    metadata     JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id  ON audit_logs (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id    ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs (created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Somente admin lê
CREATE POLICY "admin_read_audit_logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Paciente pode ver o próprio histórico de acesso (LGPD Art. 19)
CREATE POLICY "patient_read_own_access_log"
  ON audit_logs FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Nenhum UPDATE/DELETE permitido via RLS (append-only)
-- service_role ignora RLS e pode inserir livremente.

-- ============================================================
-- 2. security_events — eventos de segurança (retenção: 1 ano)
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT NOT NULL,         -- 'invalid_token', 'rate_limit_hit', 'rls_denied', 'login_failed', 'csrf', 'suspicious_ip'
    severity    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip          INET,
    user_agent  TEXT,
    description TEXT,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_severity   ON security_events (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type       ON security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at DESC);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_security_events"
  ON security_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. business_events — funil/métricas (retenção: 2 anos)
--    Pseudonimizado: só patient_id (UUID), zero PII direta
-- ============================================================
CREATE TABLE IF NOT EXISTS business_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,          -- 'onboarding_started', 'protocol_enrolled', 'checkin_completed', 'badge_earned', 'opt_out'
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    metadata   JSONB DEFAULT '{}'::jsonb,  -- { protocolId, points, badgeId, day, etc. }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_type       ON business_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_patient    ON business_events (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_created_at ON business_events (created_at DESC);

ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_business_events"
  ON business_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- ============================================================
-- 4. twilio_webhooks — status callbacks de WhatsApp (retenção: 90 dias)
--    Essencial para debugar error 63049, delivery failures
-- ============================================================
CREATE TABLE IF NOT EXISTS twilio_webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_sid     TEXT NOT NULL,             -- Twilio SMxxxx / MMxxxx
    status          TEXT NOT NULL,             -- 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered'
    error_code      INTEGER,                   -- 63049, 63016, etc.
    error_message   TEXT,
    from_number     TEXT,                      -- masked on read via helper
    to_number       TEXT,                      -- masked on read via helper
    scheduled_message_id UUID REFERENCES scheduled_messages(id) ON DELETE SET NULL,
    patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
    raw             JSONB DEFAULT '{}'::jsonb, -- payload completo do Twilio para debug
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_sid        ON twilio_webhooks (message_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_status     ON twilio_webhooks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_patient    ON twilio_webhooks (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_error_code ON twilio_webhooks (error_code) WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_created_at ON twilio_webhooks (created_at DESC);

ALTER TABLE twilio_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_twilio_webhooks"
  ON twilio_webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'equipe_saude')
    )
  );

-- ============================================================
-- Comentários para documentação inline
-- ============================================================
COMMENT ON TABLE audit_logs IS 'Trilha de auditoria imutável — quem acessou/modificou o quê. Retenção: 5 anos (CFM).';
COMMENT ON TABLE security_events IS 'Eventos de segurança: tentativas inválidas, RLS denials. Retenção: 1 ano.';
COMMENT ON TABLE business_events IS 'Eventos de negócio pseudonimizados: funil, métricas. Retenção: 2 anos.';
COMMENT ON TABLE twilio_webhooks IS 'Status callbacks do Twilio para debug de entrega. Retenção: 90 dias.';
