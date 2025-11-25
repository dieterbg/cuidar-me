-- CORREÇÃO DE RLS PARA MENSAGENS

-- 1. Habilitar RLS na tabela messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Staff can insert messages" ON messages;

-- 3. Criar novas políticas

-- Pacientes podem ver apenas suas próprias mensagens
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (
  auth.uid() = patient_id
);

-- Staff (admin, equipe_saude, assistente) podem ver TODAS as mensagens
CREATE POLICY "Staff can view all messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'equipe_saude', 'assistente')
  )
);

-- Pacientes podem inserir mensagens para si mesmos
CREATE POLICY "Users can insert messages"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = patient_id
);

-- Staff pode inserir mensagens para qualquer paciente
CREATE POLICY "Staff can insert messages"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'equipe_saude', 'assistente')
  )
);
