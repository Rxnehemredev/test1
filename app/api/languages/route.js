import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


// Dil seçme özelliği kaldırıldı — endpoint boş liste döndürür
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    return NextResponse.json({ languages: [] });
}
