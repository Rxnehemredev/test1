import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


// GET /api/favorites/list — returns all favorites for the logged-in user with series data
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const favorites = await db.prepare(`
            SELECT
                s.id,
                s.title,
                s.slug,
                s.cover_url,
                s.status,
                s.type,
                s.genres,
                s.rating,
                s.is_adult,
                (SELECT COUNT(*) FROM chapters WHERE series_id = s.id AND (publish_at IS NULL OR publish_at <= datetime('now'))) as chapter_count
            FROM favorites f
            JOIN series s ON s.id = f.series_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `).all(user.id);

        return NextResponse.json({ favorites });
    } catch (error) {
        console.error('GET /api/favorites/list error:', error);
        return NextResponse.json({ error: 'Favoriler alınamadı' }, { status: 500 });
    }
}