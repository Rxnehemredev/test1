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
        const { searchParams } = new URL(request.url);
        const rawPeriod = searchParams.get('period');
        const period = ['daily', 'weekly', 'monthly', 'all'].includes(rawPeriod) ? rawPeriod : 'daily';

        // Top sıralaması saatte bir yenilenir — bu pencere içinde DB'ye
        // gitmeden bellekteki (cache) sonuç döndürülür.
        const withParsedGenres = await getCachedSeries(`top:${period}`, RANKING_CACHE_TTL, async () => {
            let dateFilter = "'-1 day'"; // default daily
            if (period === 'weekly') dateFilter = "'-7 days'";
            else if (period === 'monthly') dateFilter = "'-30 days'";

            const db = await getDb();
            let series = [];

            if (period === 'all') {
                // Chapter count via JOIN — eliminates N+1
                series = await db.prepare(`
                    SELECT s.*, COUNT(DISTINCT ch.id) as chapterCount
                    FROM series s
                    LEFT JOIN chapters ch ON s.id = ch.series_id
                    WHERE s.published = 1
                    GROUP BY s.id
                    ORDER BY s.views DESC
                    LIMIT 10
                `).all();
            } else {
                // Join with log table to count views in the given period + chapter count
                const query = `
                    SELECT s.*,
                        COUNT(DISTINCT l.id) as period_views,
                        COUNT(DISTINCT ch.id) as chapterCount
                    FROM series s
                    LEFT JOIN series_views_log l ON s.id = l.series_id AND l.created_at >= datetime('now', ${dateFilter})
                    LEFT JOIN chapters ch ON s.id = ch.series_id
                    WHERE s.published = 1
                    GROUP BY s.id
                    ORDER BY period_views DESC, s.views DESC
                    LIMIT 10
                `;
                series = await db.prepare(query).all();
            }

            return series.map(s => ({
                ...s,
                genres: JSON.parse(s.genres || '[]'),
            }));
        });

        return NextResponse.json({ series: withParsedGenres }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
            }
        });
    } catch (error) {
        console.error('Error fetching top series:', error);
        return NextResponse.json({ error: 'Failed to fetch top series' }, { status: 500 });
    }
}
