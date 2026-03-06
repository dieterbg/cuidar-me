import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env_public_url: process.env.NEXT_PUBLIC_APP_URL || 'not_set'
    });
}

export async function POST() {
    return NextResponse.json({
        status: 'received',
        timestamp: new Date().toISOString()
    });
}
