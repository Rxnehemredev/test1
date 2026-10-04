import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const seriesReactionRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');
        const chapterId = searchParams.get('chapterId') || null;

        if (!seriesId) return NextResponse.json({ error: 'seriesId is required' }, { status: 400 });

        const db = await getDb();

        // Bölüm varsa o bölüme, yoksa seri düzeyine ait tepkileri getir
        const reactionsQuery = chapterId
            ? await db.prepare(`SELECT emoji, COUNT(*) as count FROM series_reactions WHERE series_id = ? AND chapter_id = ? GROUP BY emoji`).all(seriesId, chapterId)
            : await db.prepare(`SELECT emoji, COUNT(*) as count FROM series_reactions WHERE series_id = ? AND chapter_id IS NULL GROUP BY emoji`).all(seriesId);

        let userReacted = null;
        const user = getUserFromRequest(request);
        if (user) {
            const userReactionList = chapterId
                ? await db.prepare('SELECT emoji FROM series_reactions WHERE series_id = ? AND chapter_id = ? AND user_id = ?').all(seriesId, chapterId, user.id)
                : await db.prepare('SELECT emoji FROM series_reactions WHERE series_id = ? AND chapter_id IS NULL AND user_id = ?').all(seriesId, user.id);
            if (userReactionList.length > 0) {
                userReacted = userReactionList.map(r => r.emoji);
            }
        }

        const counts = {};
        reactionsQuery.forEach(r => counts[r.emoji] = r.count);

        return NextResponse.json({ success: true, counts, userReactions: userReacted || [] });
    } catch (error) {
        console.error('GET /api/series-reactions error:', error);
        const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        // Rate limit kontrolü
        const rl = await seriesReactionRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

        const { seriesId, chapterId, emoji } = await request.json();
        if (!seriesId || !emoji) return NextResponse.json({ error: 'seriesId and emoji are required' }, { status: 400 });

        // Emoji uzunluk kontrolü (Aşama 2)
        if (typeof emoji !== 'string' || emoji.length > 10) {
            return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
        }

        const db = await getDb();
        const chapId = chapterId || null;

        // Mevcut tepkileri bul (bölüm ya da seri kapsamında)
        const existingAll = chapId
            ? await db.prepare('SELECT id, emoji FROM series_reactions WHERE series_id = ? AND chapter_id = ? AND user_id = ?').all(seriesId, chapId, user.id)
            : await db.prepare('SELECT id, emoji FROM series_reactions WHERE series_id = ? AND chapter_id IS NULL AND user_id = ?').all(seriesId, user.id);

        const exactMatch = existingAll.find(r => r.emoji === emoji);

        // Mevcut tepkileri sil (tekil tepki kuralı)
        if (existingAll.length > 0) {
            chapId
                ? await db.prepare('DELETE FROM series_reactions WHERE series_id = ? AND chapter_id = ? AND user_id = ?').run(seriesId, chapId, user.id)
                : await db.prepare('DELETE FROM series_reactions WHERE series_id = ? AND chapter_id IS NULL AND user_id = ?').run(seriesId, user.id);
        }

        if (exactMatch) {
            return NextResponse.json({ success: true, toggledOff: true });
        } else {
            await db.prepare('INSERT INTO series_reactions (series_id, chapter_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(seriesId, chapId, user.id, emoji);
            return NextResponse.json({ success: true, toggledOn: true });
        }

    } catch (error) {
        console.error('POST /api/series-reactions error:', error);
        const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
