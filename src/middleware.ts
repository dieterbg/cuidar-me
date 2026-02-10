import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || '';

    // 0. Redirect clinicadornelles.com.br root to /clinica landing page
    if (hostname.includes('clinicadornelles.com.br') && request.nextUrl.pathname === '/') {
        const clinicaUrl = request.nextUrl.clone();
        clinicaUrl.pathname = '/clinica';
        return NextResponse.redirect(clinicaUrl);
    }

    // 1. Update session (refresh tokens if needed)
    const { response, user } = await updateSession(request)

    // 2. Define protected routes
    // Any route starting with these prefixes requires authentication
    const protectedPrefixes = ['/dashboard', '/portal', '/admin']
    const isProtectedRoute = protectedPrefixes.some(prefix =>
        request.nextUrl.pathname.startsWith(prefix)
    )

    // 3. Define explicitly public routes (optional, but good for clarity)
    // These are routes that should NEVER be blocked by this middleware logic
    // Note: The matcher config already excludes static files, but we double check here for safety
    const isPublicApi = request.nextUrl.pathname.startsWith('/api/')

    // 4. Security Check
    if (isProtectedRoute && !user) {
        // Redirect to login page if trying to access protected route without user
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        // Add a query param to indicate why they were redirected (optional)
        redirectUrl.searchParams.set('redirected', 'true')
        return NextResponse.redirect(redirectUrl)
    }

    // 5. Return the response (which might have updated cookies)
    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets (svg, png, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
