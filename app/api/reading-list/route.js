import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


// Valid statuses
const VALID_STATUSES = ['reading', 'completed', 'plan', 'dropped'];

function getUser(request) {
    return getUserFromRequest(request);
}

// GET /api/reading-list — get user's reading list
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const user = getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // optional filter

    try {
        let query = `
            SELECT rl.id, rl.series_id, rl.status, rl.updated_at,
                   s.title, s.cover_url as cover_image, s.slug, s.type, s.genres,
                   (SELECT COUNT(*) FROM chapters c WHERE c.series_id = s.id) as chapter_count,
                   (SELECT MAX(chapter_number) FROM chapters c WHERE c.series_id = s.id) as latest_chapter,
                   (SELECT chapter_number FROM chapters c2
                    JOIN reading_history rh ON rh.chapter_id = c2.id
                    WHERE c2.series_id = s.id AND rh.user_id = ?
                    ORDER BY c2.chapter_number DESC LIMIT 1) as last_read_chapter
            FROM reading_lists rl
            JOIN series s ON s.id = rl.series_id AND s.published = 1
            WHERE rl.user_id = ?
        `;
        const params = [user.id, user.id];

        if (status && VALID_STATUSES.includes(status)) {
            query += ' AND rl.status = ?';
            params.push(status);
        }

        query += ' ORDER BY rl.updated_at DESC';

        const rows = await db.prepare(query).all(...params);
        return NextResponse.json({ list: rows });
    } catch (err) {
        console.error('API error:', err);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}

// POST /api/reading-list — add/update a series in reading list
export async function POST(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const user = getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { seriesId, status } = await request.json();
    if (!seriesId || !VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid seriesId or status' }, { status: 400 });
    }

    const db = await getDb();
    try {
        await db.prepare(`
            INSERT INTO reading_lists (user_id, series_id, status, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, series_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
        `).run(user.id, seriesId, status);

        return NextResponse.json({ success: true, status });
    } catch (err) {
        console.error('API error:', err);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}

// DELETE /api/reading-list — remove a series from reading list
export async function DELETE(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const user = getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('seriesId');
    if (!seriesId) return NextResponse.json({ error: 'seriesId required' }, { status: 400 });

    const db = await getDb();
    try {
        await db.prepare('DELETE FROM reading_lists WHERE user_id = ? AND series_id = ?').run(user.id, seriesId);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('API error:', err);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}