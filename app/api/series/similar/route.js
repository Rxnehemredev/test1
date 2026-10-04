import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


function parseGenres(field) {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
}

// GET /api/series/similar?id=X&limit=6
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 12);

    if (!seriesId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = await getDb();
    try {
        // Get the target series genres and type
        const target = await db.prepare('SELECT genres, type FROM series WHERE id = ? AND published = 1').get(seriesId);
        if (!target) return NextResponse.json({ similar: [] });

        const genres = parseGenres(target.genres);

        let similar = [];

        if (genres.length > 0) {
            // Find series that share at least one genre, same type preferred
            // Score by number of shared genres
            const allSeries = await db.prepare(`
                SELECT id, title, slug, cover_url, genres, type, status, rating, views, is_adult,
                    (SELECT COUNT(*) FROM chapters c WHERE c.series_id = s.id) as chapter_count
                FROM series s
                WHERE id != ? AND published = 1
            `).all(seriesId);

            const scored = allSeries.map(s => {
                const sGenres = parseGenres(s.genres);
                const shared = genres.filter(g => sGenres.includes(g)).length;
                const typeBonus = s.type === target.type ? 1 : 0;
                return { ...s, score: shared * 2 + typeBonus };
            }).filter(s => s.score > 0);

            scored.sort((a, b) => b.score - a.score);
            similar = scored.slice(0, limit);
        }

        // If not enough, fill with recent same-type series
        if (similar.length < limit) {
            const existingIds = new Set(similar.map(s => s.id));
            existingIds.add(parseInt(seriesId));
            const fill = await db.prepare(`
                SELECT id, title, slug, cover_url, genres, type, status, rating, views, is_adult,
                    (SELECT COUNT(*) FROM chapters c WHERE c.series_id = s.id) as chapter_count
                FROM series s
                WHERE id != ? AND published = 1 AND type = ?
                ORDER BY id DESC
                LIMIT ?
            `).all(seriesId, target.type || 'manga', limit * 2);

            for (const s of fill) {
                if (!existingIds.has(s.id) && similar.length < limit) {
                    similar.push(s);
                    existingIds.add(s.id);
                }
            }
        }

        return NextResponse.json({ similar: similar.slice(0, limit) });
    } catch (err) {
        console.error('API error:', err);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}