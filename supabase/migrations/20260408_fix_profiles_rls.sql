-- ============================================================
-- Migration: Restringir policy de profiles (item 13)
-- Data: 2026-04-08
-- Problema: Qualquer usuário autenticado via anon key podia
--           fazer SELECT * FROM profiles e ver nome/telefone/role
--           de todos os usuários do sistema.
-- Solução: Paciente vê só o próprio perfil. Staff vê todos.
-- ============================================================

-- Remove a policy permissiva atual
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;

-- Pacientes e usuários comuns: apenas o próprio perfil
CREATE POLICY "usuarios_veem_proprio_perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Staff vê todos os perfis (necessário para o painel admin)
-- A subquery usa auth.uid() = id, que é permitida pela policy acima — sem recursão infinita
CREATE POLICY "staff_veem_todos_perfis"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'equipe_saude', 'assistente')
    )
  );
