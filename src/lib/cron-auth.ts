import { NextRequest, NextResponse } from 'next/server';

export function validateCronAuth(request: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[CRON AUTH] CRON_SECRET is not configured. Refusing request.');
        return NextResponse.json(
            { error: 'Server misconfigured' },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const tokenParam = request.nextUrl.searchParams.get('token');

    const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        cronHeader === cronSecret ||
        tokenParam === cronSecret;

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null;
}

export function getCronSecretOrThrow(): string {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        throw new Error('CRON_SECRET is not configured');
    }
    return cronSecret;
}
