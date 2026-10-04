import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';

const routeLimiter = createRateLimiter(60, 60 * 1000);

// GET /api/blogs?page=1 — yayınlanmış (published) blog yazılarını listeler.
// Herkese açık, "Bloglar" sayfası bunu kullanır.
export async function GET(request) {
    { const rl = await routeLimiter(request); if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 }); }

    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const pageSize = 12;
        const offset = (page - 1) * pageSize;

        const blogs = await db.prepare(`
            SELECT b.id, b.title, b.slug, b.excerpt, b.cover_url, b.created_at, b.views,
                   s.slug as series_slug, s.title as series_title, s.type as series_type
            FROM blogs b
            LEFT JOIN series s ON b.series_id = s.id
            WHERE b.status = 'published'
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `).all(pageSize, offset);

        const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM blogs WHERE status = 'published'`).get();
        const total = totalRow?.c || 0;

        return NextResponse.json({
            blogs,
            page,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            total,
        });
    } catch (error) {
        console.error('GET /api/blogs error:', error);
        return NextResponse.json({ error: 'Bloglar yüklenemedi' }, { status: 500 });
    }
}
