-- Tabela para armazenar estado do onboarding
CREATE TABLE IF NOT EXISTS onboarding_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('freemium', 'premium', 'vip')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(patient_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_onboarding_states_patient_id ON onboarding_states(patient_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_step ON onboarding_states(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_completed ON onboarding_states(completed_at) WHERE completed_at IS NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_states_updated_at
  BEFORE UPDATE ON onboarding_states
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- Comentários
COMMENT ON TABLE onboarding_states IS 'Armazena o estado do onboarding conversacional via WhatsApp';
COMMENT ON COLUMN onboarding_states.step IS 'Passo atual do onboarding (welcome, name, weight, etc)';
COMMENT ON COLUMN onboarding_states.plan IS 'Plano do paciente (freemium, premium, vip)';
COMMENT ON COLUMN onboarding_states.data IS 'Dados coletados durante o onboarding (JSON)';
COMMENT ON COLUMN onboarding_states.completed_at IS 'Data de conclusão do onboarding';
