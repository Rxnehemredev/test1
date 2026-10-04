import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/ratelimit';
const externalApiLimiter = createRateLimiter(20, 60000);


export async function POST(request) {
    { const __rl = await externalApiLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    return NextResponse.json({ error: 'Translation feature is disabled' }, { status: 410 });
}
