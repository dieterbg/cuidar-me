-- ============================================================================
-- AG - ELEVAÇÃO PARA ADMIN
-- Instruções: Substitua 'seu-email@exemplo.com' pelo email que você usou no cadastro.
-- ============================================================================

UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';

-- Caso queira verificar se funcionou:
SELECT id, email, display_name, role 
FROM public.profiles 
WHERE email = 'seu-email@exemplo.com';
