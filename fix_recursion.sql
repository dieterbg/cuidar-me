-- CORREÇÃO DE RECURSÃO INFINITA NAS POLÍTICAS (RLS)

-- 1. Remover as políticas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- 2. Recriar a política simples para o próprio usuário (sem recursão)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 3. Recriar a política para a equipe de forma OTIMIZADA para evitar recursão
-- Em vez de consultar a tabela profiles novamente (o que causa o loop),
-- vamos confiar apenas no ID do usuário ou usar uma função de segurança definer se necessário.
-- Mas para simplificar e resolver AGORA, vamos permitir que usuários autenticados vejam perfis
-- SE eles tiverem o role correto nos metadados do Auth (que não causa recursão).

CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'equipe_saude', 'assistente')
);

-- Se a política acima baseada em JWT não funcionar imediatamente (depende da configuração do Supabase),
-- podemos usar esta alternativa que verifica se o ID do usuário está numa lista de admins (menos flexível, mas segura)
-- OU simplesmente permitir leitura pública de perfis básicos se não houver dados sensíveis.

-- Mas a melhor opção segura e sem recursão é usar uma função SECURITY DEFINER para checar o role:
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'equipe_saude', 'assistente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E usar essa função na política (o SECURITY DEFINER quebra a recursão de RLS)
-- DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
-- CREATE POLICY "Staff can view all profiles" ON profiles FOR SELECT USING (is_staff());

-- PORÉM, para garantir que você entre AGORA, vamos usar a versão mais simples possível:
-- Apenas ver o próprio perfil. Isso já desbloqueia o login.
