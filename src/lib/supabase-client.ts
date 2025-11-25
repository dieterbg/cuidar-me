// src/lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mantendo exportação default/const para compatibilidade se necessário, mas createClient é preferível
export const supabase = createClient();
