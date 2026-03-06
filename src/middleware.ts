import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
    // 1. Skip session update for Public API routes (like WhatsApp Webhook)
    const isPublicApi = request.nextUrl.pathname.startsWith('/api/')
    if (isPublicApi) {
        return NextResponse.next()
    }

    // 2. Update session (refresh tokens if needed) for other routes
    const { response, user } = await updateSession(request)

    // 3. Define protected routes
    // Any route starting with these prefixes requires authentication
    const protectedPrefixes = ['/dashboard', '/portal', '/admin']
    const isProtectedRoute = protectedPrefixes.some(prefix =>
        request.nextUrl.pathname.startsWith(prefix)
    )

    // 4. Security Check
    if (isProtectedRoute && !user) {
        // Redirect to login page if trying to access protected route without user
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/paciente'
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
