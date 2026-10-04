import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, hasPermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function PUT(request, { params }) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }
        const db = await getDb();
        const builtinCanPin = user.role === 'admin' || user.role === 'manager';
        const customCanPin = await hasPermission(user, 'manage_comments', db);
        if (!builtinCanPin && !customCanPin) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        const { id } = await params;

        const comment = await db.prepare('SELECT is_pinned FROM comments WHERE id = ?').get(id);
        if (!comment) {
            return NextResponse.json({ error: 'Yorum bulunamadı.' }, { status: 404 });
        }

        const newPinState = comment.is_pinned ? 0 : 1;
        await db.prepare('UPDATE comments SET is_pinned = ? WHERE id = ?').run(newPinState, id);

        return NextResponse.json({ success: true, is_pinned: newPinState });
    } catch (error) {
        console.error('PUT /api/comments/[id]/pin error:', error);
        return NextResponse.json({ error: 'İşlem başarısız oldu.' }, { status: 500 });
    }
}
