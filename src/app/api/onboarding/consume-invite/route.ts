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

        // 3. Update patient record to 'active'
        // If the record doesn't exist yet, it's okay because the patient 
        // will link it during their first login. But usually, 
        // we want to pre-approve it here if it exists.
        const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({ 
                status: 'active',
                plan: invite.plan // Ensure plan is applied
            })
            .eq('user_id', userId);

        if (patientUpdateError) {
            console.log('Patient record not found for user_id yet, will be activated on login.');
        }

        return NextResponse.json({ success: true, plan: invite.plan });
    } catch (err: any) {
        console.error('Unexpected error in consume-invite:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
