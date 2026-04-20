import { NextRequest, NextResponse } from 'next/server';

// MEDIUM-4 fix: endpoint protegido por CRON_SECRET para evitar fingerprinting
// de variáveis de ambiente por usuários externos.
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
}

export async function POST(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    return NextResponse.json({
        status: 'received',
        timestamp: new Date().toISOString(),
    });
}
