import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { token, userId } = await req.json();
        const supabase = createServiceRoleClient();

        // 1. Verify token is valid (not used, not expired)
        const { data: invite, error: inviteError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', token)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (inviteError || !invite) {
            console.error('Invalid or expired invite token:', token, inviteError);
            return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 400 });
        }

        // 2. Mark token as used
        const { error: updateTokenError } = await supabase
            .from('invite_tokens')
            .update({
                used_by: userId,
                used_at: new Date().toISOString()
            })
            .eq('token', token);

        if (updateTokenError) {
            console.error('Error updating invite token status:', updateTokenError);
            return NextResponse.json({ error: 'Erro ao processar convite' }, { status: 500 });
        }

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
            console.warn('Could not update profile with invite data (columns may not exist):', profileError.message);

            // Fallback: atualizar auth user metadata
            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                    invite_plan: invite.plan,
                    invite_pre_approved: true,
                }
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
            console.log('[consume-invite] Patient record not found yet — invite_pre_approved saved in profile/metadata for later.');
        }

        return NextResponse.json({ success: true, plan: invite.plan });
    } catch (err: any) {
        console.error('Unexpected error in consume-invite:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
