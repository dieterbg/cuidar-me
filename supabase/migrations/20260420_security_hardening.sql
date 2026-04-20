-- Migration: Security hardening — remediação de achados de auditoria 2026-04-20
-- Corrige CRITICAL-2 (policy enumerável em invite_tokens) e
--         CRITICAL-5 (lab_results sem RLS)

-- ─────────────────────────────────────────────────────────────
-- CRITICAL-2: Remover policy anon em invite_tokens
-- ─────────────────────────────────────────────────────────────
-- A policy "anyone_can_verify_valid_token" permitia que qualquer usuário
-- anônimo listasse tokens válidos sem conhecer o UUID — basta filtrar
-- expires_at > NOW() AND used_at IS NULL. Um atacante pode enumerar todos
-- os convites pendentes e fazer onboarding não autorizado.
-- A verificação já é feita via service_role no endpoint /api/onboarding/consume-invite
-- (que bypassa RLS), portanto esta policy é desnecessária e perigosa.
DROP POLICY IF EXISTS "anyone_can_verify_valid_token" ON invite_tokens;

-- ─────────────────────────────────────────────────────────────
-- CRITICAL-5: Habilitar RLS em lab_results
-- ─────────────────────────────────────────────────────────────
-- A tabela lab_results contém resultados de exames médicos (glicemia,
-- colesterol, HbA1c, etc.) — PII sensível protegida pelo LGPD Art. 11.
-- Sem RLS, qualquer usuário autenticado pode ler/alterar exames de
-- qualquer paciente.
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Pacientes só leem seus próprios exames
CREATE POLICY "patient_reads_own_lab_results" ON lab_results
    FOR SELECT TO authenticated
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE user_id = auth.uid()
        )
    );

-- Equipe de saúde e admin leem todos os exames
CREATE POLICY "staff_reads_all_lab_results" ON lab_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );

-- Apenas equipe de saúde e admin podem inserir exames
CREATE POLICY "staff_inserts_lab_results" ON lab_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );

-- Apenas equipe de saúde e admin podem atualizar exames
CREATE POLICY "staff_updates_lab_results" ON lab_results
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'equipe_saude', 'assistente')
        )
    );

-- Apenas admin pode deletar exames (CFM Art. 8 — prontuário 20 anos)
CREATE POLICY "admin_deletes_lab_results" ON lab_results
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );
