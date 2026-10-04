import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { requireAuth } from '@/lib/auth';

const routeLimiter = createRateLimiter(60, 60 * 1000);

// GET /api/blogs/[slug] — tek bir blog yazısını getirir, görüntülenme sayısını artırır.
export async function GET(request, { params }) {
    { const rl = await routeLimiter(request); if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 }); }

    try {
        const { slug } = await params;
        const db = await getDb();

        const blog = await db.prepare(`
            SELECT b.*, s.slug as series_slug, s.title as series_title, s.type as series_type, s.status as series_status
            FROM blogs b
            LEFT JOIN series s ON b.series_id = s.id
            WHERE b.slug = ? AND b.status = 'published'
        `).get(slug);

        if (!blog) {
            return NextResponse.json({ error: 'Blog yazısı bulunamadı' }, { status: 404 });
        }

        db.prepare('UPDATE blogs SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(blog.id).catch(() => {});

        // Benzer bloglar (aynı seri hariç, en yeni 4 tanesi)
        const related = await db.prepare(`
            SELECT id, title, slug, excerpt, cover_url, created_at
            FROM blogs
            WHERE status = 'published' AND id != ?
            ORDER BY created_at DESC
            LIMIT 4
        `).all(blog.id);

        return NextResponse.json({ blog, related });
    } catch (error) {
        console.error('GET /api/blogs/[slug] error:', error);
        return NextResponse.json({ error: 'Blog yazısı yüklenemedi' }, { status: 500 });
    }
}

// DELETE /api/blogs/[slug] — sadece admin/manager, moderasyon amaçlı
export async function DELETE(request, { params }) {
    try {
        const user = await requireAuth(request);
        if (user.role !== 'admin' && user.role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { slug } = await params;
        const db = await getDb();
        const result = await db.prepare('DELETE FROM blogs WHERE slug = ?').run(slug);
        if (result.changes === 0) {
            return NextResponse.json({ error: 'Blog yazısı bulunamadı' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('DELETE /api/blogs/[slug] error:', error);
        return NextResponse.json({ error: 'Silinemedi' }, { status: 500 });
    }
}
