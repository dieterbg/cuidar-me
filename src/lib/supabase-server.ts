// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';

export function createClient() {
    // Next 15 keeps synchronous cookie access for compatibility. Refactor this
    // helper to async before upgrading to Next 16.
    const cookieStore = cookies() as unknown as UnsafeUnwrappedCookies;

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // O middleware atualiza cookies para Server Components.
                    }
                },
            },
        }
    );
}
