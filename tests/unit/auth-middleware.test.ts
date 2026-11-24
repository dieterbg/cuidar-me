import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '@/middleware';

const mocks = vi.hoisted(() => ({
    createServerClient: vi.fn(),
    getUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));

const origin = 'https://cuidar.example';
const makeRequest = (path: string) => new NextRequest(new URL(path, origin));

function setProfile(role: string | null) {
    mocks.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', user_metadata: { role: 'admin' } } },
        error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: role ? { role } : null, error: null });
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.createServerClient.mockReturnValue({
        auth: { getUser: mocks.getUser, exchangeCodeForSession: mocks.exchangeCodeForSession },
        from: mocks.from,
    });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
});

describe('rotas protegidas com Supabase', () => {
    it.each([
        ['/dashboard', '/paciente'],
        ['/portal/welcome', '/paciente'],
        ['/portal/community/discussion', '/paciente'],
        ['/overview', '/profissional'],
        ['/admin/settings', '/profissional'],
        ['/patients', '/profissional'],
        ['/patient/id/access-log', '/profissional'],
        ['/patient/id.jpg', '/profissional'],
        ['/protocols', '/profissional'],
        ['/welcome', '/profissional'],
        ['/education', '/profissional'],
        ['/community/discussion', '/profissional'],
        ['/campaigns', '/profissional'],
        ['/plans', '/profissional'],
    ])('exige sessão em %s', async (path, login) => {
        expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(true);
        const response = await middleware(makeRequest(path));
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(`${origin}${login}?redirected=true`);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it.each(['/', '/paciente', '/profissional', '/privacidade', '/portal-publico', '/api/whatsapp', '/api/cron/unified'])(
        'mantém %s fora do middleware de sessão',
        async path => {
            expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(false);
            expect((await middleware(makeRequest(path))).headers.has('location')).toBe(false);
            expect(mocks.createServerClient).not.toHaveBeenCalled();
        },
    );

    it.each([
        ['paciente', '/dashboard', '/portal/welcome'],
        ['paciente', '/portal', '/portal/welcome'],
        ['paciente', '/portal/education', null],
        ['paciente', '/admin/logs', '/portal/welcome'],
        ['paciente', '/community/discussion', '/portal/welcome'],
        ['equipe_saude', '/portal/profile', '/overview'],
        ['assistente', '/campaigns', null],
        ['assistente', '/plans', '/overview'],
        ['assistente', '/patient/id/access-log', '/overview'],
        ['equipe_saude', '/admin/settings', '/overview'],
        ['admin', '/admin/settings', null],
        ['admin', '/patient/id/access-log', null],
        ['pendente', '/overview', '/dashboard'],
        ['pendente', '/portal/welcome', '/dashboard'],
        ['pendente', '/welcome', null],
        ['pendente', '/dashboard', null],
        [null, '/overview', '/dashboard'],
        [null, '/dashboard', null],
    ])('aplica a função %s do perfil em %s', async (role, path, redirect) => {
        setProfile(role);
        const response = await middleware(makeRequest(path));
        expect(response.headers.get('location')).toBe(redirect ? origin + redirect : null);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        expect(mocks.from).toHaveBeenCalledWith('profiles');
        expect(mocks.select).toHaveBeenCalledWith('role');
        expect(mocks.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('bloqueia a rota se a consulta da função falhar', async () => {
        setProfile('admin');
        mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
        const response = await middleware(makeRequest('/admin'));
        expect(response.headers.get('location')).toBe(origin + '/dashboard');
    });

    it('mantém os cookies atualizados após redirecionar para a área do perfil', async () => {
        setProfile('paciente');
        mocks.getUser.mockImplementation(async () => {
            const { cookies } = mocks.createServerClient.mock.calls[0][2];
            cookies.setAll([{ name: 'session', value: 'refreshed', options: { path: '/', sameSite: 'lax' } }]);
            return { data: { user: { id: 'user-1' } }, error: null };
        });
        const response = await middleware(makeRequest('/admin'));
        expect(response.headers.get('location')).toBe(origin + '/portal/welcome');
        expect(response.cookies.get('session')).toMatchObject({ value: 'refreshed', path: '/', sameSite: 'lax' });
    });

    it('troca o código OAuth antes da verificação da rota e envia os cookies da sessão', async () => {
        mocks.exchangeCodeForSession.mockImplementation(async () => {
            const { cookies } = mocks.createServerClient.mock.calls[0][2];
            cookies.setAll([{ name: 'verifier', value: '', options: { path: '/', maxAge: 0 } }]);
            cookies.setAll([{ name: 'session', value: 'new-session', options: { path: '/' } }]);
            return { error: null };
        });
        const response = await middleware(makeRequest('/dashboard?code=oauth-code'));
        expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
        expect(mocks.getUser).not.toHaveBeenCalled();
        expect(response.headers.get('location')).toBe(origin + '/dashboard');
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        expect(response.cookies.get('session')?.value).toBe('new-session');
        expect(response.cookies.get('verifier')?.maxAge).toBe(0);
    });

    it('retorna ao login quando o código OAuth é rejeitado', async () => {
        mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid code' } });
        const response = await middleware(makeRequest('/dashboard?code=invalid'));
        expect(response.headers.get('location')).toBe(origin + '/paciente?auth_error=1');
    });
});
