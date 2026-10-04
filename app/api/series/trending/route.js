import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { getCachedSeries } from '@/lib/seriesCache';
import { TRENDING_CACHE_TTL } from '@/lib/apiCache';
const routeLimiter = createRateLimiter(60, 60000);

// Cache süresi kısa; seri eklenince/silinince content_version değişir ve cache anında geçersiz olur.
export const dynamic = 'force-dynamic';

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const withParsedGenres = await getCachedSeries('trending', TRENDING_CACHE_TTL, async () => {
            const db = await getDb();

            // Chapter count included via subquery — eliminates N+1
            // N+1 ve JOIN çarpımı yok: korelasyonlu alt sorgular.
            // Yeni eklenen (son 7 gün) ve bölümü olan seriler görüntülenme 0 olsa bile
            // trend listesine girebilsin diye "yenilik bonusu" var — aksi halde yeni
            // seri hiç görüntülenmediği için listeye asla giremiyordu.
            const query = `
                SELECT * FROM (
                    SELECT s.*,
                        (SELECT COUNT(*) FROM series_views_log l
                            WHERE l.series_id = s.id AND l.created_at >= datetime('now', '-3 days')) AS recent_views,
                        (SELECT COUNT(*) FROM chapters ch WHERE ch.series_id = s.id) AS chapterCount
                    FROM series s
                    WHERE s.published = 1
                ) t
                ORDER BY (t.recent_views + CASE WHEN t.chapterCount > 0 AND t.created_at >= datetime('now', '-7 days') THEN 25 ELSE 0 END) DESC,
                         t.views DESC
                LIMIT 10
            `;
            const series = await db.prepare(query).all();

            return series.map(s => ({
                ...s,
                genres: JSON.parse(s.genres || '[]'),
            }));
        });

        // Performans: Cache header eklendi — 1 saat
        return NextResponse.json(
            { series: withParsedGenres },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
                }
            }
        );
    } catch (error) {
        console.error('Error fetching trending series:', error);
        return NextResponse.json({ error: 'Failed to fetch trending series' }, { status: 500 });
    }
}
