-- ============================================================================
-- Migration: Proteção de colunas privilegiadas (auditoria 2026-09-25)
--
-- Problemas corrigidos:
--   1. A policy "Usuários podem atualizar seu próprio perfil" (profiles) não
--      restringe colunas: qualquer usuário logado podia fazer
--      UPDATE profiles SET role = 'admin' na própria linha → acesso total.
--   2. O cadastro envia `role` no metadata do signup; o trigger de criação de
--      perfil pode copiá-lo → alguém se cadastrava direto como admin.
--   3. Paciente podia alterar o próprio plan/status/risk_level em `patients`.
--
-- Abordagem: triggers BEFORE INSERT/UPDATE. Funcionam independentemente de
-- quais policies RLS existam no banco (as migrations do repo não refletem
-- 100% o banco de produção), e não afetam:
--   • chamadas com service-role (backend, webhooks, crons, scripts);
--   • SQL Editor / migrations (sessão postgres / supabase_admin);
--   • admin (para profiles) e equipe (para patients) logados.
--
-- Idempotente: pode ser executada mais de uma vez.
-- ============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- Requisição privilegiada = service-role via API, ou sessão de banco administrativa.
CREATE OR REPLACE FUNCTION public.app_request_is_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT
        coalesce(
            nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
            nullif(current_setting('request.jwt.claim.role', true), '')
        ) = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin');
$$;

-- SECURITY DEFINER para ler profiles sem depender de RLS (evita recursão).
CREATE OR REPLACE FUNCTION public.app_current_user_has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role::text = ANY (allowed_roles)
    );
$$;

REVOKE ALL ON FUNCTION public.app_current_user_has_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_user_has_role(text[]) TO authenticated, service_role;

-- ─── profiles: role e campos de convite ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.app_protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    staff_roles constant text[] := ARRAY['admin', 'equipe_saude', 'assistente'];
BEGIN
    IF public.app_request_is_privileged()
       OR public.app_current_user_has_role(ARRAY['admin']) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Ninguém se cadastra como equipe/admin: o acesso de equipe é sempre
        -- concedido depois, por um admin. Rebaixa para 'pendente' (aguardando
        -- aprovação) em vez de falhar, para não quebrar o cadastro.
        IF NEW.role::text = ANY (staff_roles) THEN
            NEW.role := 'pendente';
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE por usuário comum (inclui o próprio perfil)
    IF NEW.role IS DISTINCT FROM OLD.role
       AND (NEW.role::text = ANY (staff_roles) OR OLD.role::text = ANY (staff_roles)) THEN
        RAISE EXCEPTION 'Alteração de papel não permitida'
            USING ERRCODE = '42501';
    END IF;

    -- Campos de convite só podem ser gravados pelo backend (to_jsonb evita erro
    -- caso as colunas não existam neste banco).
    IF (to_jsonb(NEW) -> 'invite_plan') IS DISTINCT FROM (to_jsonb(OLD) -> 'invite_plan')
       OR (to_jsonb(NEW) -> 'invite_pre_approved') IS DISTINCT FROM (to_jsonb(OLD) -> 'invite_pre_approved') THEN
        RAISE EXCEPTION 'Alteração de convite não permitida'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER app_protect_profile_privileged_columns
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.app_protect_profile_privileged_columns();

-- ─── patients: plano, status e dados clínicos da equipe ────────────────────

CREATE OR REPLACE FUNCTION public.app_protect_patient_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    protected_cols constant text[] := ARRAY['plan', 'status', 'user_id', 'risk_level', 'weight_goal_kg'];
    col text;
BEGIN
    IF public.app_request_is_privileged()
       OR public.app_current_user_has_role(ARRAY['admin', 'equipe_saude', 'assistente']) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Paciente não cria o próprio registro já em plano pago.
        IF (to_jsonb(NEW) ->> 'plan') IN ('premium', 'vip') THEN
            RAISE EXCEPTION 'Plano não permitido no cadastro'
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    FOREACH col IN ARRAY protected_cols LOOP
        IF (to_jsonb(NEW) -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) THEN
            RAISE EXCEPTION 'Alteração do campo % não permitida', col
                USING ERRCODE = '42501';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_protect_patient_privileged_columns ON public.patients;
CREATE TRIGGER app_protect_patient_privileged_columns
    BEFORE INSERT OR UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.app_protect_patient_privileged_columns();

-- ─── Verificação (rode depois para conferir) ───────────────────────────────
-- SELECT tgname, tgrelid::regclass FROM pg_trigger
--  WHERE tgname LIKE 'app_protect_%';
