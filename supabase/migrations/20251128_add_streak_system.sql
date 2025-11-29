-- =====================================================
-- STREAK SYSTEM - Sistema de Sequências para Gamificação
-- =====================================================
-- Data: 28/11/2025
-- Objetivo: Adicionar coluna JSONB para rastrear streaks de pacientes

-- Adicionar coluna streak_data com valores padrão
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS streak_data JSONB DEFAULT '{
  "currentStreak": 0,
  "longestStreak": 0,
  "lastActivityDate": null,
  "streakFreezes": 2,
  "freezesUsedThisMonth": 0,
  "lastFreezeResetDate": null
}'::jsonb;

-- Criar índice para consultas eficientes de streak
-- Nota: DESC não pode estar dentro de parênteses funcionais
CREATE INDEX IF NOT EXISTS idx_patients_streak_current 
ON patients (((streak_data->>'currentStreak')::int) DESC);

-- Criar índice para última atividade (para cron jobs)
CREATE INDEX IF NOT EXISTS idx_patients_last_activity 
ON patients ((streak_data->>'lastActivityDate'));

-- =====================================================
-- FUNÇÃO: Atualizar streak após atividade
-- =====================================================
CREATE OR REPLACE FUNCTION update_patient_streak(
    p_patient_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_current_streak_data JSONB;
    v_last_activity_date DATE;
    v_current_streak INT;
    v_longest_streak INT;
    v_today DATE := CURRENT_DATE;
    v_new_streak_data JSONB;
BEGIN
    -- Buscar dados atuais de streak
    SELECT streak_data INTO v_current_streak_data
    FROM patients
    WHERE id = p_patient_id;
    
    -- Se não tiver dados, inicializar
    IF v_current_streak_data IS NULL THEN
        v_current_streak_data := '{
            "currentStreak": 0,
            "longestStreak": 0,
            "lastActivityDate": null,
            "streakFreezes": 2,
            "freezesUsedThisMonth": 0
        }'::jsonb;
    END IF;
    
    -- Extrair valores
    v_last_activity_date := (v_current_streak_data->>'lastActivityDate')::DATE;
    v_current_streak := COALESCE((v_current_streak_data->>'currentStreak')::INT, 0);
    v_longest_streak := COALESCE((v_current_streak_data->>'longestStreak')::INT, 0);
    
    -- Lógica de streak
    IF v_last_activity_date IS NULL THEN
        -- Primeira atividade
        v_current_streak := 1;
    ELSIF v_last_activity_date = v_today THEN
        -- Já teve atividade hoje, não incrementa
        v_current_streak := v_current_streak;
    ELSIF v_last_activity_date = v_today - INTERVAL '1 day' THEN
        -- Atividade dia consecutivo
        v_current_streak := v_current_streak + 1;
    ELSE
        -- Streak quebrado, resetar
        v_current_streak := 1;
    END IF;
    
    -- Atualizar recorde se necessário
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;
    
    -- Montar novo objeto de streak
    v_new_streak_data := jsonb_build_object(
        'currentStreak', v_current_streak,
        'longestStreak', v_longest_streak,
        'lastActivityDate', v_today::TEXT,
        'streakFreezes', COALESCE((v_current_streak_data->>'streakFreezes')::INT, 2),
        'freezesUsedThisMonth', COALESCE((v_current_streak_data->>'freezesUsedThisMonth')::INT, 0),
        'lastFreezeResetDate', v_current_streak_data->>'lastFreezeResetDate'
    );
    
    -- Atualizar no banco
    UPDATE patients
    SET streak_data = v_new_streak_data,
        updated_at = NOW()
    WHERE id = p_patient_id;
    
    RETURN v_new_streak_data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Usar freeze de streak
-- =====================================================
CREATE OR REPLACE FUNCTION use_streak_freeze(
    p_patient_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_streak_data JSONB;
    v_freezes_available INT;
    v_new_streak_data JSONB;
BEGIN
    -- Buscar dados atuais
    SELECT streak_data INTO v_streak_data
    FROM patients
    WHERE id = p_patient_id;
    
    v_freezes_available := COALESCE((v_streak_data->>'streakFreezes')::INT, 0);
    
    -- Verificar se tem freeze disponível
    IF v_freezes_available <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Usar freeze
    v_new_streak_data := jsonb_set(
        jsonb_set(
            v_streak_data,
            '{streakFreezes}',
            to_jsonb(v_freezes_available - 1)
        ),
        '{freezesUsedThisMonth}',
        to_jsonb(COALESCE((v_streak_data->>'freezesUsedThisMonth')::INT, 0) + 1)
    );
    
    -- Atualizar no banco
    UPDATE patients
    SET streak_data = v_new_streak_data,
        updated_at = NOW()
    WHERE id = p_patient_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON COLUMN patients.streak_data IS 'Dados de streak (sequência) do paciente em formato JSONB. Contém: currentStreak, longestStreak, lastActivityDate, streakFreezes, freezesUsedThisMonth';

COMMENT ON FUNCTION update_patient_streak(UUID) IS 'Atualiza o streak do paciente após uma atividade. Incrementa streak se atividade foi no dia consecutivo, reseta se quebrou.';

COMMENT ON FUNCTION use_streak_freeze(UUID) IS 'Usa um freeze de streak para proteger a sequência. Retorna TRUE se sucesso, FALSE se não tiver freeze disponível.';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
