-- ============================================================================
-- AG - CORREÇÃO DE SEGURANÇA SUPABASE (RLS & VIEWS)
-- Data: 2026-02-25
-- Descrição: Este script corrige as falhas de segurança detectadas pelo Supabase Linter.
--           - Converte views de SECURITY DEFINER para SECURITY INVOKER.
--           - Habilita RLS em tabelas de produção com dados sensíveis (PHI).
--           - Define políticas de acesso baseadas no auth.uid() para pacientes.
-- ============================================================================

-- 1. RECRIAR VIEWS COM SECURITY INVOKER (Correção security_definer_view)
-- Nota: 'security_invoker = on' garante que a view respeite as políticas de RLS e permissões do usuário que consulta.

DROP VIEW IF EXISTS patients_with_active_protocol;
CREATE VIEW patients_with_active_protocol WITH (security_invoker = on) AS
SELECT 
  p.*,
  pp.protocol_id,
  pp.start_date AS protocol_start_date,
  pp.current_day AS protocol_current_day,
  pp.weight_goal_kg,
  pr.name AS protocol_name
FROM patients p
LEFT JOIN patient_protocols pp ON p.id = pp.patient_id AND pp.is_active = TRUE
LEFT JOIN protocols pr ON pp.protocol_id = pr.id;

DROP VIEW IF EXISTS unresolved_attention_requests;
CREATE VIEW unresolved_attention_requests WITH (security_invoker = on) AS
SELECT 
  ar.id,
  ar.patient_id,
  ar.reason,
  ar.trigger_message,
  ar.ai_summary,
  ar.ai_suggested_reply,
  ar.priority AS request_priority,
  ar.is_resolved,
  ar.resolved_by,
  ar.resolved_at,
  ar.created_at,
  p.full_name AS patient_name,
  p.whatsapp_number,
  p.plan,
  p.priority AS patient_priority
FROM attention_requests ar
JOIN patients p ON ar.patient_id = p.id
WHERE ar.is_resolved = FALSE
ORDER BY ar.priority DESC, ar.created_at ASC;

DROP VIEW IF EXISTS pending_scheduled_messages;
CREATE VIEW pending_scheduled_messages WITH (security_invoker = on) AS
SELECT *
FROM scheduled_messages
WHERE status = 'pending' 
  AND send_at <= NOW()
ORDER BY send_at ASC
LIMIT 50;

-- 2. HABILITAR RLS NAS TABELAS FALTANTES (Correção rls_disabled_in_public)

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkin_states ENABLE ROW LEVEL SECURITY;

-- 3. ADICIONAR POLÍTICAS DE ACESSO PARA PACIENTES (Correção sensitive_columns_exposed)
-- Estas políticas garantem que o paciente logado só veja seus próprios registros em tabelas sensíveis.

-- daily_checkins
DROP POLICY IF EXISTS "patient_own_daily_checkins" ON daily_checkins;
CREATE POLICY "patient_own_daily_checkins" ON daily_checkins
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- onboarding_states
DROP POLICY IF EXISTS "patient_own_onboarding_states" ON onboarding_states;
CREATE POLICY "patient_own_onboarding_states" ON onboarding_states
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- lab_results
DROP POLICY IF EXISTS "patient_own_lab_results" ON lab_results;
CREATE POLICY "patient_own_lab_results" ON lab_results
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- daily_checkin_states
DROP POLICY IF EXISTS "patient_own_daily_checkin_states" ON daily_checkin_states;
CREATE POLICY "patient_own_daily_checkin_states" ON daily_checkin_states
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 4. FIX SEARCH_PATH MUTABLE (Correção function_search_path_mutable)
-- Esta correção impede ataques de sequestro de caminho de busca em funções.

ALTER FUNCTION public.update_onboarding_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lab_results_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user SET search_path = public, pg_temp;
ALTER FUNCTION public.update_patient_streak SET search_path = public, pg_temp;
ALTER FUNCTION public.use_streak_freeze SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_streak SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column SET search_path = public, pg_temp;
ALTER FUNCTION public.update_topic_comment_count SET search_path = public, pg_temp;
ALTER FUNCTION public.get_or_create_weekly_progress SET search_path = public, pg_temp;
ALTER FUNCTION public.update_gamification_progress SET search_path = public, pg_temp;

-- ============================================================================
-- EXECUÇÃO CONCLUÍDA
-- ============================================================================
