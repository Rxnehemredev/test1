import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function POST(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const response = NextResponse.json({ success: true });
    response.cookies.set('yomi_token', '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}