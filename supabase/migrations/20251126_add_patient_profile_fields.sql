-- =====================================================
-- Migration: Add Patient Profile Fields
-- =====================================================
-- Adiciona campos de objetivo, meta, cintura e medicamentos
-- à tabela patients

-- Adicionar coluna de objetivo
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS goal TEXT;

-- Adicionar constraint para validar valores
ALTER TABLE patients
ADD CONSTRAINT check_goal 
CHECK (goal IN ('lose_weight', 'gain_muscle', 'maintain') OR goal IS NULL);

COMMENT ON COLUMN patients.goal IS 
'Objetivo do paciente: lose_weight (emagrecer), gain_muscle (ganhar massa), maintain (manter peso)';

-- Adicionar meta de peso
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2);

COMMENT ON COLUMN patients.target_weight_kg IS 
'Meta de peso do paciente em kg';

-- Adicionar circunferência da cintura
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS waist_circumference_cm NUMERIC(5,2);

COMMENT ON COLUMN patients.waist_circumference_cm IS 
'Circunferência da cintura em cm (medida na altura do umbigo)';

-- Adicionar medicamentos
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS medications TEXT;

COMMENT ON COLUMN patients.medications IS 
'Medicamentos em uso pelo paciente';

-- Criar índice para queries por objetivo
CREATE INDEX IF NOT EXISTS idx_patients_goal 
ON patients(goal) 
WHERE goal IS NOT NULL;
