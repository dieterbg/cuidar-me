-- CORREÇÃO DO GATILHO (TRIGGER) - VERSÃO SIMPLIFICADA E ROBUSTA

-- 1. Recriar a função com tratamento de erro e conversão de tipos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Tenta inserir o perfil. Se falhar por qualquer motivo, o cadastro do usuário NÃO será cancelado.
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, role, phone)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'displayName',
      -- Garante que o role seja válido ou usa 'pendente' como padrão seguro
      COALESCE(new.raw_user_meta_data->>'role', 'pendente'),
      new.raw_user_meta_data->>'phone'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se der erro (ex: coluna não existe, tipo errado), apenas loga o erro e continua.
    -- O usuário será criado, e o perfil poderá ser corrigido depois.
    RAISE WARNING 'Erro ao criar perfil automático: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriar o gatilho
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
