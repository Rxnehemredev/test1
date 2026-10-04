import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        // GÜVENLİK DÜZELTMESİ: limit üst sınırsızdı — ?limit=999999999 ile tüm
        // bölüm tablosu tek sorguda çekilebiliyordu (Resource Exhaustion / DoS).
        const limit = Math.min(parseInt(searchParams.get('limit')) || 12, 100);

        const chapters = await db.prepare(`
            SELECT ch.id, ch.chapter_number, ch.title, ch.created_at, ch.series_id,
                   s.title as series_title, s.cover_url
            FROM chapters ch
            JOIN series s ON ch.series_id = s.id
            WHERE s.published = 1
              AND (ch.publish_at IS NULL OR ch.publish_at <= datetime('now'))
            ORDER BY ch.created_at DESC
            LIMIT ?
        `).all(limit);

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}
