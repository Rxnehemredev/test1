import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSettingsCache, setSettingsCache, SETTINGS_CACHE_TTL } from '@/lib/settings-cache';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export const dynamic = 'force-dynamic';

// updates_per_page için settings cache'ini paylaş — her request'te DB sorgusu yapma
async function getUpdatesPerPage(db) {
    const now = Date.now();
    const { cache, cacheAt } = getSettingsCache();
    const cacheValid = cache && now - cacheAt < SETTINGS_CACHE_TTL;
    if (cacheValid && cache._updates_per_page !== undefined) {
        return cache._updates_per_page;
    }
    const setting = await db.prepare(`SELECT setting_value FROM app_settings WHERE setting_key = 'updates_per_page'`).get();
    const value = setting ? (parseInt(setting.setting_value) || 16) : 16;
    // Yalnızca geçerli bir cache varsa piggyback yap — boşken yazmak getSiteSettings()'i bozar
    if (cacheValid) {
        setSettingsCache({ ...cache, _updates_per_page: value });
    }
    return value;
}

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        // adult: '1' = yetişkin içerik göster, '0' veya yoksa normal içerik
        const showAdult = searchParams.get('adult') === '1';

        // per_page: önce query param, yoksa admin ayarı (cache'li), yoksa varsayılan 16
        // GÜVENLİK DÜZELTMESİ: limit üst sınırsızdı — ?limit=999999999 ile tüm
        // katalog + tüm bölümler tek sorguda çekilebiliyordu (Resource Exhaustion / DoS).
        let perPage = Math.min(parseInt(searchParams.get('limit')) || 0, 100);
        if (!perPage) {
            perPage = await getUpdatesPerPage(db);
        }
        const offset = (page - 1) * perPage;

        // Toplam seri sayısı — adult filtresine göre (sayfalama için)
        const adultFilter = showAdult ? 's.is_adult = 1' : 's.is_adult = 0 OR s.is_adult IS NULL';
        const totalRow = await db.prepare(`
            SELECT COUNT(DISTINCT s.id) as total
            FROM series s
            JOIN chapters ch ON s.id = ch.series_id
            WHERE s.published = 1 AND (${adultFilter})
              AND (ch.publish_at IS NULL OR ch.publish_at <= datetime('now'))
        `).get();
        const total = totalRow?.total || 0;

        // Get distinct series IDs ordered by their most recent chapter upload
        const recentSeries = await db.prepare(`
            SELECT s.id, s.title, s.slug, s.cover_url, s.status, s.type, s.views, s.is_adult, MAX(COALESCE(ch.publish_at, ch.created_at)) as last_update
            FROM series s
            JOIN chapters ch ON s.id = ch.series_id
            WHERE s.published = 1 AND (${adultFilter})
              AND (ch.publish_at IS NULL OR ch.publish_at <= datetime('now'))
            GROUP BY s.id
            ORDER BY last_update DESC
            LIMIT ? OFFSET ?
        `).all(perPage, offset);

        if (recentSeries.length === 0) {
            return NextResponse.json(
                { updates: [], hasMore: false, total, page, perPage },
                {
                    headers: {
                        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30'
                    }
                }
            );
        }

        // Fetch the latest 4 chapters per series in a single query — eliminates N+1
        const seriesIds = recentSeries.map(s => s.id);
        const placeholders = seriesIds.map(() => '?').join(', ');
        const allChapters = await db.prepare(`
            SELECT id, series_id, chapter_number, title, created_at,
                   CASE WHEN created_at >= datetime('now', '-1 day')
             OR created_at >= datetime('now', 'localtime', '-1 day')
         THEN 1 ELSE 0 END as is_new
            FROM (
                SELECT id, series_id, chapter_number, title, created_at,
                       ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY chapter_number DESC) as rn
                FROM chapters
                WHERE series_id IN (${placeholders})
                  AND (publish_at IS NULL OR publish_at <= datetime('now'))
            ) ranked
            WHERE rn <= 4
            ORDER BY series_id, chapter_number DESC
        `).all(...seriesIds);

        // Group chapters by series_id
        const chaptersBySeries = {};
        for (const ch of allChapters) {
            if (!chaptersBySeries[ch.series_id]) chaptersBySeries[ch.series_id] = [];
            chaptersBySeries[ch.series_id].push(ch);
        }

        const updates = recentSeries.map(s => ({
            ...s,
            chapters: chaptersBySeries[s.id] || [],
        }));

        const totalPages = Math.ceil(total / perPage);
        const hasMore = page < totalPages;

        // Performans: Cache header eklendi - 60 saniye fresh, 120 saniye stale-while-revalidate
        return NextResponse.json(
            { updates, hasMore, total, page, perPage, totalPages },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30'
                }
            }
        );
    } catch (error) {
        console.error('GET /api/series/latest-updates error:', error);
        return NextResponse.json({ error: 'Failed to fetch latest updates' }, { status: 500 });
    }
}
