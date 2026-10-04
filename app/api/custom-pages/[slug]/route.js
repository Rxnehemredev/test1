import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function GET(request, { params }) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const { slug } = await params;
        const db = await getDb();
        const page = await db.prepare('SELECT * FROM custom_pages WHERE slug = ? AND is_active = 1').get(slug);
        if (!page) {
            return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, page });
    } catch (e) {
        console.error('API error:', e);
        return NextResponse.json({ success: false, error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}