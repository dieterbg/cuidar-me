import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data, error, count } = await supabase
        .from('scheduled_messages')
        .select('id, status, send_at, message_content', { count: 'exact' })
        .eq('status', 'pending')
        .lte('send_at', now)
        .limit(10);

    const { data: allPending } = await supabase
        .from('scheduled_messages')
        .select('id, status, send_at', { count: 'exact' })
        .eq('status', 'pending');

    return NextResponse.json({
        now,
        query_result: { count: data?.length ?? 0, error, first: data?.[0] ?? null },
        all_pending: { count: allPending?.length ?? 0, first: allPending?.[0] ?? null },
    });
}
