import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// Rotas exclusivas de staff — pacientes não devem acessar
const STAFF_ROUTES = ['/overview', '/patients', '/patient/', '/protocols', '/scheduler']

// Rotas exclusivas de pacientes — staff não precisa acessar pelo portal
const PATIENT_ROUTES = ['/portal']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Rotas de API públicas — pular completamente (WhatsApp webhook, cron, etc.)
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // 2. Atualizar sessão (refresh tokens se necessário)
    const { response, user } = await updateSession(request)

    // 3. Rotas protegidas que exigem autenticação
    const protectedPrefixes = ['/dashboard', '/portal', '/admin', ...STAFF_ROUTES]
    const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

    // 4. Não autenticado tentando acessar rota protegida → login
    if (isProtectedRoute && !user) {
        const loginUrl = new URL('/paciente', request.url)
        loginUrl.searchParams.set('redirected', 'true')
        return NextResponse.redirect(loginUrl)
    }

    // 5. Role check — lê do user_metadata (sem query extra ao DB)
    //    Nota: user_metadata é definido no signup e é suficiente para o middleware.
    //    A autorização granular de dados fica nas RLS policies e server actions.
    if (user) {
        const role = user.user_metadata?.role as string | undefined

        // Paciente tentando acessar área de staff → redirecionar para o portal
        const isStaffRoute = STAFF_ROUTES.some(r => pathname.startsWith(r))
        if (isStaffRoute && role === 'paciente') {
            return NextResponse.redirect(new URL('/portal/welcome', request.url))
        }

        // Staff tentando acessar o portal do paciente → redirecionar para o painel
        const isPatientRoute = PATIENT_ROUTES.some(r => pathname.startsWith(r))
        if (isPatientRoute && role && !['paciente', 'pendente'].includes(role)) {
            return NextResponse.redirect(new URL('/overview', request.url))
        }
    }

    // 6. Retornar response (pode ter cookies atualizados)
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
