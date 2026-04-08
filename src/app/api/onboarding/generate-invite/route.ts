import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = createServiceRoleClient();
        const { plan } = await req.json();

        // Verificar identidade do admin usando o JWT do header
        const accessToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        let createdBy: string | null = null;

        if (accessToken) {
            // Criar client temporário com o token do usuário para verificar identidade
            const userClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
            );
            const { data: { user } } = await userClient.auth.getUser();
            createdBy = user?.id || null;
        }

        const { data, error } = await supabase
            .from('invite_tokens')
            .insert({
                plan: plan || 'freemium',
                created_by: createdBy,
            })
            .select('token')
            .single();

        if (error) {
            console.error('Error generating invite token:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/paciente?invite=${data.token}`;
        return NextResponse.json({ token: data.token, inviteUrl });
    } catch (err: any) {
        console.error('Unexpected error in generate-invite:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
