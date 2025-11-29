-- Tabela para armazenar estado do check-in diário
CREATE TABLE IF NOT EXISTS daily_checkin_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  step TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  
  UNIQUE(patient_id, date)
);

-- Tabela para histórico de check-ins completados
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Hidratação
  hydration TEXT CHECK (hydration IN ('yes', 'almost', 'no')),
  water_liters DECIMAL(3,1),
  
  -- Alimentação
  breakfast TEXT CHECK (breakfast IN ('A', 'B', 'C')),
  lunch TEXT CHECK (lunch IN ('A', 'B', 'C')),
  dinner TEXT CHECK (dinner IN ('A', 'B', 'C')),
  snacks TEXT CHECK (snacks IN ('yes', 'no')),
  meal_photo_url TEXT,
  
  -- Atividade
  activity TEXT CHECK (activity IN ('yes', 'no')),
  activity_type TEXT,
  activity_minutes INTEGER,
  
  -- Bem-estar
  wellbeing INTEGER CHECK (wellbeing BETWEEN 1 AND 5),
  sleep TEXT CHECK (sleep IN ('bad', 'ok', 'good')),
  
  -- Peso (semanal)
  weight_kg DECIMAL(5,2),
  
  -- Pontos
  points_earned INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(patient_id, date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_checkin_states_patient_date ON daily_checkin_states(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_states_completed ON daily_checkin_states(completed_at) WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_date ON daily_checkins(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(date DESC);

-- Função para calcular streak
CREATE OR REPLACE FUNCTION calculate_streak(p_patient_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE;
BEGIN
  -- Começar de ontem e contar para trás
  check_date := CURRENT_DATE - INTERVAL '1 day';
  
  LOOP
    -- Verificar se existe check-in nesta data
    IF EXISTS (
      SELECT 1 FROM daily_checkins 
      WHERE patient_id = p_patient_id 
      AND date = check_date
    ) THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE daily_checkin_states IS 'Estado atual do check-in diário (em andamento)';
COMMENT ON TABLE daily_checkins IS 'Histórico de check-ins completados';
COMMENT ON FUNCTION calculate_streak IS 'Calcula streak de dias consecutivos com check-in';
