import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const reactionRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function POST(request, { params }) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Rate limit kontrolü
        const rl = await reactionRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const { id } = await params;
        const { emoji } = await request.json();

        if (!emoji) {
            return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
        }

        // Emoji uzunluk kontrolü (Aşama 2)
        if (typeof emoji !== 'string' || emoji.length > 10) {
            return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
        }

        const db = await getDb();

        // Toggle reaction — enforce 1 reaction per user per comment
        const existingAll = await db.prepare(
            'SELECT id, emoji FROM reactions WHERE user_id = ? AND comment_id = ?'
        ).all(user.id, id);

        const exactMatch = existingAll.find(r => r.emoji === emoji);

        if (existingAll.length > 0) {
            await db.prepare('DELETE FROM reactions WHERE user_id = ? AND comment_id = ?').run(user.id, id);
        }

        if (!exactMatch) {
            await db.prepare(
                'INSERT INTO reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)'
            ).run(user.id, id, emoji);
        }

        // Return updated reactions
        const reactions = await db.prepare(`
      SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
      FROM reactions WHERE comment_id = ? GROUP BY emoji
    `).all(id);

        return NextResponse.json({ reactions });
    } catch (error) {
        console.error('POST /api/comments/[id]/reactions error:', error);
        const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
