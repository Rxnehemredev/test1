import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


// GET /api/users/reading-history?limit=5   → son okunanlar (limit opsiyonel, default tümü)
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user } = result;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '0'); // 0 = tümü

        // Her seri için en son okunan bölümü al
        const baseQuery = `
            SELECT rh.chapter_id,
                   rh.updated_at,
                   rh.page_number,
                   c.chapter_number,
                   c.title          AS chapter_title,
                   s.id             AS series_id,
                   s.title          AS series_title,
                   s.cover_url,
                   s.slug,
                   (SELECT MAX(c2.chapter_number)
                    FROM chapters c2
                    WHERE c2.series_id = s.id) AS latest_chapter
            FROM reading_history rh
            JOIN chapters c ON rh.chapter_id = c.id
            JOIN series s   ON c.series_id   = s.id
            WHERE rh.user_id = ?
              AND rh.updated_at = (
                  SELECT MAX(rh2.updated_at)
                  FROM reading_history rh2
                  JOIN chapters c2 ON rh2.chapter_id = c2.id
                  WHERE rh2.user_id = rh.user_id
                    AND c2.series_id = s.id
              )
            ORDER BY rh.updated_at DESC
        `;

        const history = limit > 0
            ? await db.prepare(baseQuery + ' LIMIT ?').all(user.id, limit)
            : await db.prepare(baseQuery).all(user.id);

        return NextResponse.json({ success: true, history });
    } catch (error) {
        console.error('GET /api/users/reading-history error:', error);
        return NextResponse.json({ error: 'Failed to fetch reading history' }, { status: 500 });
    }
}

// DELETE /api/users/reading-history?seriesId=X  → bir seriyi sil
// DELETE /api/users/reading-history              → tüm geçmişi sil
export async function DELETE(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user } = result;
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');

        if (seriesId) {
            // Belirli bir seriye ait geçmişi sil
            await db.prepare(`
                DELETE FROM reading_history
                WHERE user_id = ?
                  AND chapter_id IN (
                      SELECT id FROM chapters WHERE series_id = ?
                  )
            `).run(user.id, seriesId);
            return NextResponse.json({ success: true, deleted: 'series' });
        } else {
            // Tüm geçmişi sil
            await db.prepare('DELETE FROM reading_history WHERE user_id = ?').run(user.id);
            return NextResponse.json({ success: true, deleted: 'all' });
        }
    } catch (error) {
        console.error('DELETE /api/users/reading-history error:', error);
        return NextResponse.json({ error: 'Failed to delete reading history' }, { status: 500 });
    }
}