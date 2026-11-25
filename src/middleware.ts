import { NextResponse, type NextRequest } from 'next/server';
import { getProfileRole, STAFF_ROLES } from '@/lib/profile-role';
import { createMiddlewareClient } from '@/lib/supabase-middleware';

const routeRoles = new Map<string, readonly string[] | null>([
    ['dashboard', null],
    ['portal', ['paciente']],
    ['admin', ['admin']],
    ['overview', STAFF_ROLES],
    ['patients', STAFF_ROLES],
    ['patient', STAFF_ROLES],
    ['protocols', STAFF_ROLES],
    ['scheduler', STAFF_ROLES],
    ['welcome', [...STAFF_ROLES, 'pendente']],
    ['education', ['admin', 'equipe_saude']],
    ['community', ['admin', 'equipe_saude']],
    ['campaigns', ['admin', 'assistente']],
    ['plans', ['admin', 'equipe_saude']],
]);

function homeForRole(role: string | null) {
    if (role === 'paciente') return '/portal/welcome';
    if (STAFF_ROLES.some(staffRole => staffRole === role)) return '/overview';
    return '/dashboard';
}

export async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;
    const section = pathname.split('/')[1];
    const allowedRoles = routeRoles.get(section);
    if (allowedRoles === undefined) return NextResponse.next();

    const { supabase, getResponse } = createMiddlewareClient(request);

    function redirect(path: string) {
        const response = NextResponse.redirect(new URL(path, request.url), 303);
        for (const cookie of getResponse().cookies.getAll()) {
            response.cookies.set(cookie);
        }
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }

    // O Google já usa /dashboard como URL de retorno no Supabase.
    if (pathname === '/dashboard' && request.method === 'GET') {
        const code = searchParams.get('code');
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            return redirect(error ? '/paciente?auth_error=1' : '/dashboard');
        }
        if (searchParams.has('error') || searchParams.has('error_code')) {
            return redirect('/paciente?auth_error=1');
        }
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.is_anonymous) {
        const login = section === 'portal' || section === 'dashboard' ? '/paciente' : '/profissional';
        return redirect(`${login}?redirected=true`);
    }

    const role = await getProfileRole(supabase, user.id);
    const home = homeForRole(role);
    const roles = /^\/patient\/[^/]+\/access-log(?:\/|$)/.test(pathname) ? ['admin'] : allowedRoles;

    if ((roles && (!role || !roles.includes(role))) ||
        ((pathname === '/dashboard' || pathname === '/portal') && pathname !== home)) {
        return redirect(home);
    }

    const response = getResponse();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/portal/:path*',
        '/admin/:path*',
        '/overview/:path*',
        '/patients/:path*',
        '/patient/:path*',
        '/protocols/:path*',
        '/scheduler/:path*',
        '/welcome/:path*',
        '/education/:path*',
        '/community/:path*',
        '/campaigns/:path*',
        '/plans/:path*',
    ],
};
