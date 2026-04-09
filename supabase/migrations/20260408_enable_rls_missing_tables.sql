-- ============================================================
-- Migration: Habilitar RLS nas tabelas sem proteção
-- Data: 2026-04-08
-- Motivo: Tabelas com dados sensíveis de saúde estavam sem RLS,
--         permitindo acesso via anon key por qualquer usuário autenticado.
-- NOTA: Todo código existente usa service_role/adminClient que
--       ignora RLS — estas políticas não afetam o funcionamento atual.
-- ============================================================

-- ============================================================
-- 1. daily_checkins — check-ins diários concluídos
--    (peso, glicemia, refeições, hidratação, sono, atividade)
-- ============================================================
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_daily_checkins"
  ON daily_checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

CREATE POLICY "patient_read_own_daily_checkins"
  ON daily_checkins FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. daily_checkin_states — estado ativo do check-in diário
--    (passo atual, dados parciais, pontos pendentes)
-- ============================================================
ALTER TABLE daily_checkin_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_daily_checkin_states"
  ON daily_checkin_states FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

CREATE POLICY "patient_read_own_daily_checkin_states"
  ON daily_checkin_states FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. onboarding_states — estado do onboarding WhatsApp
--    (passo atual, dados coletados via WhatsApp, plano)
-- ============================================================
ALTER TABLE onboarding_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_onboarding_states"
  ON onboarding_states FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

CREATE POLICY "patient_read_own_onboarding_state"
  ON onboarding_states FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. message_queue — fila interna de mensagens WhatsApp
--    (mensagens recebidas do paciente aguardando processamento)
--    Apenas staff acessa — não há acesso direto do paciente.
-- ============================================================
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_all_message_queue"
  ON message_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );
