import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const notificationsRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        // Rate limit kontrolü
        const rl = await notificationsRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const notifications = await db.prepare(`
            SELECT id, user_id, type, message, link, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 30
        `).all(user.id);

        const unreadCount = (await (db.prepare(
            'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(user.id)))?.cnt || 0;

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error('GET /api/notifications error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const body = await request.json().catch(() => ({}));
        if (body.id) {
            await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(body.id, user.id);
        } else {
            await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(user.id);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT /api/notifications error:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, user.id);
        } else {
            await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/notifications error:', error);
        return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
    }
}