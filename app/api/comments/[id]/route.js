import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { findDisallowedImageUrl, ALLOWED_HOSTS_LABEL } from '@/lib/commentImages';

const rateLimiter = createRateLimiter(20, 60 * 1000); // 20 req/min

export async function PATCH(request, { params }) {
    const rl = await rateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
            status: 429, headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const { id } = await params;
        const { content } = await request.json();

        if (!content || !String(content).trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const trimmed = String(content).trim();
        if (trimmed.length > 2000) {
            return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
        }

        const comment = await db.prepare(
            'SELECT id, user_id, is_deleted, chapter_id FROM comments WHERE id = ?'
        ).get(id);
        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }
        if (comment.is_deleted) {
            return NextResponse.json({ error: 'Comment has been deleted' }, { status: 410 });
        }
        if (comment.user_id !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // GIF/görsel yalnızca BÖLÜM yorumlarında serbest — düzenleme yoluyla seri yorumuna eklenemez.
        if (!comment.chapter_id && /!\[[^\]]*\]\(/.test(trimmed)) {
            return NextResponse.json({ error: 'GIF yalnızca bölüm yorumlarında kullanılabilir' }, { status: 400 });
        }

        // GİZLİLİK: düzenleme yoluyla da izin listesi dışı görsel eklenemez.
        if (findDisallowedImageUrl(trimmed)) {
            return NextResponse.json({ error: `Yalnızca ${ALLOWED_HOSTS_LABEL} görselleri eklenebilir.` }, { status: 400 });
        }

        await db.prepare('UPDATE comments SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?').run(trimmed, id);

        return NextResponse.json({ message: 'Comment updated', content: trimmed });
    } catch (error) {
        console.error('PATCH /api/comments/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const rl = await rateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
            status: 429, headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const { id } = await params;
        const comment = await db.prepare('SELECT id, user_id, is_deleted FROM comments WHERE id = ?').get(id);
        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }
        if (comment.is_deleted) {
            return NextResponse.json({ message: 'Comment already deleted' });
        }
        if (comment.user_id !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Hard delete: remove comment and let CASCADE handle replies
        await db.prepare("DELETE FROM comments WHERE id = ?").run(id);

        return NextResponse.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('DELETE /api/comments/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
}