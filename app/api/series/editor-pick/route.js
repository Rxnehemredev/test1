import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { getCachedSeries } from '@/lib/seriesCache';
import { RANKING_CACHE_TTL } from '@/lib/apiCache';
const routeLimiter = createRateLimiter(60, 60000);

// Build sırasında statik cache'lenmesin — liste her istekte (content_version'a göre) taze olmalı
export const dynamic = 'force-dynamic';

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        // Editör seçkisi saatte bir yenilenir.
        const finalSeriesList = await getCachedSeries('editor-pick', RANKING_CACHE_TTL, async () => {
            const db = await getDb();

            // Get up to 5 published series (ordered by rating and views)
            const seriesList = await db.prepare(`
                SELECT s.*, COUNT(ch.id) as chapterCount
                FROM series s
                LEFT JOIN chapters ch ON s.id = ch.series_id
                WHERE s.published = 1
                GROUP BY s.id
                ORDER BY s.rating DESC, s.views DESC
                LIMIT 5
            `).all();

            return seriesList.map(s => ({
                ...s,
                genres: JSON.parse(s.genres || '[]'),
            }));
        });

        return NextResponse.json({ series: finalSeriesList }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
            }
        });
    } catch (error) {
        console.error('Error fetching editor pick:', error);
        return NextResponse.json({ error: 'Failed to fetch editor pick' }, { status: 500 });
    }
}
