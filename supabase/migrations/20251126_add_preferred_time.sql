-- =====================================================
-- Migration: Add Preferred Message Time
-- =====================================================
-- Adiciona coluna para armazenar o horário preferido
-- do paciente para receber mensagens diárias

-- Adicionar coluna
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS preferred_message_time TEXT DEFAULT 'morning';

-- Adicionar constraint para validar valores
ALTER TABLE patients
ADD CONSTRAINT check_preferred_message_time 
CHECK (preferred_message_time IN ('morning', 'afternoon', 'night'));

-- Adicionar comentário
COMMENT ON COLUMN patients.preferred_message_time IS 
'Horário preferido para mensagens diárias: morning (8h), afternoon (14h), night (20h)';

-- Criar índice para queries de agendamento
CREATE INDEX IF NOT EXISTS idx_patients_preferred_time 
ON patients(preferred_message_time) 
WHERE status = 'active';
