// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';

export function createClient() {
    // Next 15 keeps synchronous cookie access for compatibility. Refactor this
    // helper to async before upgrading to Next 16.
    const cookieStore = cookies() as unknown as UnsafeUnwrappedCookies;

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Cookies can only be set in Server Actions or Route Handlers
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // Cookies can only be removed in Server Actions or Route Handlers
                    }
                },
            },
        }
    );
}
