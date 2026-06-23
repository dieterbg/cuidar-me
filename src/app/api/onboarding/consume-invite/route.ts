import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { loggers } from '@/lib/logger';

const log = loggers.onboarding;

export async function POST(req: Request) {
    try {
        // ── Autenticação (CRITICAL-4 fix) ────────────────────────────────────
        // userId é sempre derivado da sessão autenticada — nunca aceito do body.
        // Isso impede IDOR: um atacante não pode passar userId de outro paciente
        // para elevar o plano de uma conta arbitrária.
        const supabaseUser = createClient();
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const userId = user.id; // fonte única e confiável do userId

        // Lê apenas o token do body — userId é ignorado mesmo se enviado
        const body = await req.json();
        const token = body?.token;

        if (!token) {
            return NextResponse.json({ error: 'Token de convite ausente' }, { status: 400 });
        }

        const supabase = createServiceRoleClient();

        // Atomically consume the invite. The update conditions prevent two
        // requests from using the same token and bind it to the session user.
        const nowIso = new Date().toISOString();
        const { data: invite, error: inviteError } = await supabase
            .from('invite_tokens')
            .update({
                used_by: userId,
                used_at: nowIso,
            })
            .eq('token', token)
            .is('used_at', null)
            .gt('expires_at', nowIso)
            .select('*')
            .single();

        if (inviteError || !invite) {
            log.warn('Token de convite inválido ou expirado', { userId });
            await log.security({
                eventType: 'invalid_invite_token',
                severity: 'warning',
                actorId: userId,
                description: 'Tentativa de consumo de convite inválido ou expirado',
            });
            return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 400 });
        }

        // 2. Marcar token como usado — com o userId da sessão
        // 3. Salvar no profile que este usuário tem um convite pré-aprovado
        // O portal/layout.tsx vai ler isso ao criar o registro de paciente
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                invite_plan: invite.plan,
                invite_pre_approved: true,
            })
            .eq('id', userId);

        if (profileError) {
            // Se as colunas não existem, tenta via auth metadata (fallback seguro)
            log.warn('Não foi possível atualizar profile com dados do convite (colunas podem não existir)', { userId });

            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                    invite_plan: invite.plan,
                    invite_pre_approved: true,
                },
            });
        }

        // 4. Tentar atualizar paciente se já existir (raro neste timing, mas seguro)
        const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({
                status: 'active',
                plan: invite.plan,
            })
            .eq('user_id', userId);

        if (patientUpdateError) {
            log.info('Registro de paciente ainda não existe — invite_pre_approved salvo no profile para uso posterior');
        }

        await log.audit({
            actorId: userId,
            actorRole: 'patient',
            action: 'consume_invite_token',
            resourceType: 'invite_token',
            resourceId: invite.id,
            metadata: { plan: invite.plan },
        });

        return NextResponse.json({ success: true, plan: invite.plan });
    } catch (err: any) {
        log.error('Erro inesperado em consume-invite', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
