import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function createMiddlewareClient(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    for (const { name, value } of cookiesToSet) {
                        request.cookies.set(name, value);
                    }
                    const nextResponse = NextResponse.next({ request });
                    for (const cookie of response.cookies.getAll()) {
                        nextResponse.cookies.set(cookie);
                    }
                    for (const { name, value, options } of cookiesToSet) {
                        nextResponse.cookies.set(name, value, options);
                    }
                    response = nextResponse;
                },
            },
        }
    );

    return { supabase, getResponse: () => response };
}
