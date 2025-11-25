-- CORREÇÃO DE PERMISSÕES NA TABELA PATIENTS

-- Habilitar RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can view own patient record" ON patients;

-- Criar política permitindo que o usuário veja seu registro se o user_id bater
CREATE POLICY "Users can view own patient record"
ON patients FOR SELECT
USING (auth.uid() = user_id);

-- Permitir update também (para editar perfil)
DROP POLICY IF EXISTS "Users can update own patient record" ON patients;
CREATE POLICY "Users can update own patient record"
ON patients FOR UPDATE
USING (auth.uid() = user_id);
