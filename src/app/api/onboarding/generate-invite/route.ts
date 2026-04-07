import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = createServiceRoleClient();
        const { plan } = await req.json(); // 'freemium' | 'evolucao' | 'fundamentos' | 'performance'

        // Get the authenticated user (admin)
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            req.headers.get('Authorization')?.split('Bearer ')[1] || ''
        );

        const { data, error } = await supabase
            .from('invite_tokens')
            .insert({
                plan: plan || 'freemium',
                created_by: user?.id
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
