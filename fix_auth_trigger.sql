
-- ============================================================================
-- AG - CORREÇÃO DO GATILHO DE CRIAÇÃO DE PERFIL
-- Data: 2026-02-25
-- Descrição: Recria a função e o gatilho para garantir que todo usuário criado 
--            no Auth tenha um perfil correspondente com a role correta.
-- ============================================================================

-- 1. Remover gatilho e função antigos para limpeza
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Criar função de tratamento robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_display_name TEXT;
  v_phone TEXT;
BEGIN
  -- Extrair metadados com fallbacks seguros
  v_display_name := COALESCE(new.raw_user_meta_data->>'displayName', new.raw_user_meta_data->>'full_name', '');
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
  
  -- Tentar converter a role do metadado para o enum user_role
  -- Se não vier nada ou for inválido, assume 'pendente'
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'pendente'::user_role;
  END;

  -- Inserir o perfil
  INSERT INTO public.profiles (id, email, display_name, role, phone)
  VALUES (
    new.id,
    new.email,
    v_display_name,
    v_role,
    v_phone
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Criar o gatilho novamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. LIMPEZA (Opcional): Remover o usuário de teste se ele estiver "preso" sem perfil
-- NOTA: Se você já rodou o script make_admin.sql para este usuário, 
--       talvez queira apagar apenas o do Auth para refazer o fluxo.
-- DELETE FROM auth.users WHERE email = 'admin@gmail.com';

-- 5. GARANTIR PERMISSÃO PARA O GATILHO INSERIR EM PROFILES
-- GRANT INSERT ON public.profiles TO authenticated;
-- GRANT INSERT ON public.profiles TO service_role;
-- GRANT ALL ON public.profiles TO postgres;
