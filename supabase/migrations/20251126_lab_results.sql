-- Tabela para armazenar resultados de exames laboratoriais
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Metadados
  exam_date DATE NOT NULL,
  laboratory TEXT,
  image_url TEXT,
  extracted_by_ai BOOLEAN DEFAULT false,
  
  -- Glicemia e Diabetes
  glucose_fasting DECIMAL(5,2), -- mg/dL
  hba1c DECIMAL(4,2), -- %
  
  -- Lipídios
  total_cholesterol DECIMAL(5,2), -- mg/dL
  ldl DECIMAL(5,2), -- mg/dL
  hdl DECIMAL(5,2), -- mg/dL
  triglycerides DECIMAL(5,2), -- mg/dL
  
  -- Função Renal
  creatinine DECIMAL(4,2), -- mg/dL
  urea DECIMAL(5,2), -- mg/dL
  
  -- Função Hepática
  alt DECIMAL(6,2), -- U/L (TGP)
  ast DECIMAL(6,2), -- U/L (TGO)
  
  -- Tireoide
  tsh DECIMAL(6,3), -- μUI/mL
  t4 DECIMAL(4,2), -- ng/dL
  
  -- Vitaminas
  vitamin_d DECIMAL(5,2), -- ng/mL
  vitamin_b12 DECIMAL(6,2), -- pg/mL
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_exam_date ON lab_results(exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_created_at ON lab_results(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lab_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_results_updated_at();

-- Adicionar coluna em attention_requests para relacionar com exame
ALTER TABLE attention_requests 
ADD COLUMN IF NOT EXISTS related_lab_result_id UUID REFERENCES lab_results(id);

-- Comentários
COMMENT ON TABLE lab_results IS 'Armazena resultados de exames laboratoriais dos pacientes';
COMMENT ON COLUMN lab_results.extracted_by_ai IS 'Indica se os dados foram extraídos automaticamente por IA';
COMMENT ON COLUMN lab_results.glucose_fasting IS 'Glicemia de jejum em mg/dL';
COMMENT ON COLUMN lab_results.hba1c IS 'Hemoglobina glicada em %';
COMMENT ON COLUMN lab_results.total_cholesterol IS 'Colesterol total em mg/dL';
COMMENT ON COLUMN lab_results.ldl IS 'LDL colesterol em mg/dL';
COMMENT ON COLUMN lab_results.hdl IS 'HDL colesterol em mg/dL';
COMMENT ON COLUMN lab_results.triglycerides IS 'Triglicerídeos em mg/dL';
COMMENT ON COLUMN lab_results.creatinine IS 'Creatinina em mg/dL';
COMMENT ON COLUMN lab_results.urea IS 'Ureia em mg/dL';
COMMENT ON COLUMN lab_results.alt IS 'ALT/TGP em U/L';
COMMENT ON COLUMN lab_results.ast IS 'AST/TGO em U/L';
COMMENT ON COLUMN lab_results.tsh IS 'TSH em μUI/mL';
COMMENT ON COLUMN lab_results.t4 IS 'T4 livre em ng/dL';
COMMENT ON COLUMN lab_results.vitamin_d IS 'Vitamina D em ng/mL';
COMMENT ON COLUMN lab_results.vitamin_b12 IS 'Vitamina B12 em pg/mL';
