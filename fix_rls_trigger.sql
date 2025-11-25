-- GATILHO PARA CRIAR PERFIL AUTOMATICAMENTE
-- Isso resolve o erro de permissão (RLS) de uma vez por todas.

-- 1. Cria a função que será executada quando um usuário for criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'displayName',
    COALESCE(new.raw_user_meta_data->>'role', 'pendente'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cria o gatilho (Trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Garante permissões básicas (caso ainda não tenha)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permite que usuários vejam e editem seus próprios perfis
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
