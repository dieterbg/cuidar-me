-- ============================================================================
-- FIX: Recriar tabela patient_protocols com FK correto
-- A tabela atual tem um FK que não aponta para patients(id) corretamente.
-- Como a tabela está VAZIA, é seguro dropar e recriar.
-- RODE ESTE SCRIPT NO SQL EDITOR DO SUPABASE.
-- ============================================================================

-- 1. Dropar tabela existente (está vazia, confirmado)
DROP TABLE IF EXISTS patient_protocols CASCADE;

-- 2. Recriar com FK correto apontando para patients(id)
CREATE TABLE patient_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  weight_goal_kg NUMERIC(5,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Recriar índices
CREATE INDEX idx_patient_protocols_patient ON patient_protocols(patient_id);
CREATE INDEX idx_patient_protocols_active ON patient_protocols(patient_id, is_active) 
  WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_unique_active_protocol ON patient_protocols(patient_id) 
  WHERE is_active = TRUE;

-- 4. RLS
ALTER TABLE patient_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe pode ver protocolos de pacientes" 
  ON patient_protocols FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- 5. Permitir service role inserir/atualizar/deletar (para scripts e cron jobs)
CREATE POLICY "Service role pode gerenciar protocolos de pacientes"
  ON patient_protocols FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Recriar trigger de updated_at
CREATE TRIGGER update_patient_protocols_updated_at 
  BEFORE UPDATE ON patient_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Recriar view dependente
CREATE OR REPLACE VIEW patients_with_active_protocol AS
SELECT 
  p.*,
  pp.protocol_id,
  pp.start_date AS protocol_start_date,
  pp.current_day AS protocol_current_day,
  pp.weight_goal_kg AS protocol_weight_goal_kg,
  pr.name AS protocol_name
FROM patients p
LEFT JOIN patient_protocols pp ON p.id = pp.patient_id AND pp.is_active = TRUE
LEFT JOIN protocols pr ON pp.protocol_id = pr.id;
