-- =================================================================
-- CORREÇÃO MANUAL DE PERMISSÕES E ROLES
-- Rode este script no SQL Editor do seu painel Supabase
-- =================================================================

-- 1. Adicionar 'admin' ao enum de roles (se não existir)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Permitir que usuários criem seu próprio perfil (Corrige o erro de cadastro)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. Atualizar políticas existentes para usar 'admin' em vez de 'medico_dono'

-- Profiles
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON profiles;
CREATE POLICY "Admins podem atualizar qualquer perfil" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Patients
DROP POLICY IF EXISTS "Equipe pode ver todos os pacientes" ON patients;
CREATE POLICY "Equipe pode ver todos os pacientes" 
  ON patients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

DROP POLICY IF EXISTS "Equipe pode atualizar pacientes" ON patients;
CREATE POLICY "Equipe pode atualizar pacientes" 
  ON patients FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );

-- Protocols
DROP POLICY IF EXISTS "Apenas admins podem gerenciar protocolos" ON protocols;
CREATE POLICY "Apenas admins podem gerenciar protocolos" 
  ON protocols FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- System Config
DROP POLICY IF EXISTS "Apenas admins podem gerenciar configurações" ON system_config;
CREATE POLICY "Apenas admins podem gerenciar configurações" 
  ON system_config FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
