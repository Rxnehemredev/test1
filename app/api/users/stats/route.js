import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


function getUser(request) {
    return getUserFromRequest(request);
}

// GET /api/users/stats — detailed reading stats for profile page
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const user = getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    try {
        // Total chapters read
        const totalChapters = (await (db.prepare('SELECT COUNT(*) as c FROM read_history WHERE user_id = ?').get(user.id)))?.c || 0;

        // Total comments
        const totalComments = (await (db.prepare('SELECT COUNT(*) as c FROM comments WHERE user_id = ?').get(user.id)))?.c || 0;

        // Total favorites
        const totalFavorites = (await (db.prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ?').get(user.id)))?.c || 0;

        // Reading list counts by status
        const listCounts = await db.prepare(`
            SELECT status, COUNT(*) as count
            FROM reading_lists WHERE user_id = ?
            GROUP BY status
        `).all(user.id);
        const listStats = { reading: 0, completed: 0, plan: 0, dropped: 0 };
        for (const row of listCounts) listStats[row.status] = row.count;

        // Chapters read this week
        const thisWeek = (await (db.prepare(`
            SELECT COUNT(*) as c FROM read_history
            WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
        `).get(user.id)))?.c || 0;

        // Chapters read this month
        const thisMonth = (await (db.prepare(`
            SELECT COUNT(*) as c FROM read_history
            WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
        `).get(user.id)))?.c || 0;

        // Most read genre (from read history -> chapters -> series -> genres)
        const genreRows = await db.prepare(`
            SELECT s.genres FROM read_history rh
            JOIN chapters ch ON ch.id = rh.chapter_id
            JOIN series s ON s.id = ch.series_id
            WHERE rh.user_id = ? AND s.genres IS NOT NULL AND s.genres != ''
        `).all(user.id);

        const genreCount = {};
        for (const row of genreRows) {
            const gs = (row.genres || '').split(',').map(g => g.trim()).filter(Boolean);
            for (const g of gs) genreCount[g] = (genreCount[g] || 0) + 1;
        }
        const topGenreSorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
        const topGenre = topGenreSorted[0]?.[0] || null;
        const topGenreCount = topGenreSorted[0]?.[1] || null;

        // Daily read activity for last 30 days (for chart) — tüm 30 gün doldurulur
        const rawActivity = await db.prepare(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM read_history
            WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `).all(user.id);

        // Son 30 günün tüm günlerini doldur (okuma olmayan günler 0 olarak gösterilir)
        const activityMap = {};
        for (const row of rawActivity) activityMap[row.date] = row.count;
        const dailyActivity = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyActivity.push({ date: dateStr, count: activityMap[dateStr] || 0 });
        }

        // Recent reading history (last 10 chapters)
        const recentReads = await db.prepare(`
            SELECT ch.id, ch.chapter_number, ch.title, rh.created_at,
                   s.id as series_id, s.title as series_title, s.slug as series_slug, s.cover_url as cover_image
            FROM read_history rh
            JOIN chapters ch ON ch.id = rh.chapter_id
            JOIN series s ON s.id = ch.series_id
            WHERE rh.user_id = ?
            ORDER BY rh.created_at DESC
            LIMIT 10
        `).all(user.id);

        return NextResponse.json({
            totalChapters,
            totalComments,
            totalFavorites,
            thisWeek,
            thisMonth,
            topGenre,
            topGenreCount,
            listStats,
            dailyActivity,
            recentReads,
        });
    } catch (err) {
        console.error('API error:', err);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}