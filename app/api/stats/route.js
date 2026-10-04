import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);

// HomeClient bu endpoint'i ana sayfadaki HER ziyaretçi için 60 saniyede bir
// çağırıyor. Sorgu 3 ayrı COUNT(*) içeriyor (series/chapters/users) — yani
// her çağrı 3 tam tablo taraması demek. Basit bir modül-seviyesi cache ile
// aynı warm instance üzerindeki tekrarlanan çağrılar DB'ye gitmeden
// cevaplanıyor. Sayaçlar zaten "kabaca güncel" olması yeterli veriler.
const STATS_CACHE_TTL = 60_000; // 60 saniye — client poll aralığıyla eşleşiyor
let _statsCache = null;
let _statsCacheAt = 0;

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        if (_statsCache && Date.now() - _statsCacheAt < STATS_CACHE_TTL) {
            return NextResponse.json(_statsCache, {
                headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
            });
        }

        const db = await getDb();
        const row = await db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM series WHERE published = 1) as series,
                (SELECT COUNT(*) FROM chapters) as chapters,
                (SELECT COUNT(*) FROM users) as users
        `).get();

        const result = {
            series: row.series || 0,
            chapters: row.chapters || 0,
            users: row.users || 0,
        };
        _statsCache = result;
        _statsCacheAt = Date.now();

        return NextResponse.json(result, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        });
    } catch {
        return NextResponse.json({ series: 0, chapters: 0, users: 0 });
    }
}
