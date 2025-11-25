-- CORREÇÃO DE PERMISSÕES (RLS) - VERSÃO SEGURA

-- 1. Habilitar RLS (garantir que está ligado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar erro de "já existe"
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- 3. Recriar as políticas corretamente

-- Permitir cadastro (INSERT)
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Permitir ver o próprio perfil (SELECT)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Permitir atualizar o próprio perfil (UPDATE)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- (Opcional) Permitir equipe ver tudo
CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'equipe_saude', 'assistente')
  )
);
