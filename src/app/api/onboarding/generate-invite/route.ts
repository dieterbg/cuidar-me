import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { loggers } from '@/lib/logger';

const log = loggers.admin;

export async function POST(req: Request) {
    try {
        // ── Autenticação + autorização (CRITICAL-3 fix) ──────────────────────
        // Lê a sessão do cookie de autenticação, nunca do body.
        const supabaseUser = createClient();
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        // Verifica papel — apenas staff (admin, equipe_saude, assistente) pode gerar convites
        const { data: profile, error: profileError } = await supabaseUser
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 });
        }

        const STAFF_ROLES = ['admin', 'equipe_saude', 'assistente'];
        if (!STAFF_ROLES.includes(profile.role)) {
            log.warn('Tentativa de gerar convite sem permissão', {
                userId: user.id,
                role: profile.role,
            });
            return NextResponse.json({ error: 'Acesso negado — apenas equipe de saúde pode gerar convites' }, { status: 403 });
        }

        // ── Geração do token ─────────────────────────────────────────────────
        const { plan } = await req.json();

        const supabase = createServiceRoleClient();
        const { data, error } = await supabase
            .from('invite_tokens')
            .insert({
                plan: plan || 'freemium',
                created_by: user.id,  // sempre o usuário autenticado, nunca do body
            })
            .select('token')
            .single();

        if (error) {
            log.error('Erro ao gerar invite token', error, { userId: user.id });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await log.audit({
            actorId: user.id,
            actorRole: profile.role,
            action: 'generate_invite_token',
            resourceType: 'invite_token',
            resourceId: data.token,
            metadata: { plan: plan || 'freemium' },
        });

        // Construir URL absoluta — necessário para QR Codes funcionarem no celular
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
            || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
            || 'https://cuidar.me';

        const inviteUrl = `${baseUrl}/paciente?invite=${data.token}`;
        return NextResponse.json({ token: data.token, inviteUrl });
    } catch (err: any) {
        log.error('Erro inesperado em generate-invite', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
