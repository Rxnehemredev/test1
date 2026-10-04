import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function GET(request, { params }) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const { id } = await params;
        const db = await getDb();
        const requestUser = getUserFromRequest(request);

        // Support both numeric ID and slug (e.g. /series/7 or /series/shadow-ronin)
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT * FROM series WHERE id = ?').get(id)
            : await db.prepare('SELECT * FROM series WHERE slug = ?').get(id);

        if (!series) {
            return NextResponse.json({ error: 'Series not found' }, { status: 404 });
        }

        // Block access to unpublished series for non-admin users
        if (!series.published && (!requestUser || requestUser.role !== 'admin')) {
            return NextResponse.json({ error: 'Series not found' }, { status: 404 });
        }

        const numericId = series.id; // always use the DB numeric ID for queries

        // Seri görüntülenme sayacı SSR page (app/series/[id]/page.js) tarafından yönetilir.
        // Bu API endpoint'i bölüm sayfaları tarafından chapter ID'sini çözmek için de
        // çağrıldığından burada sayaç artırmak çift sayıma yol açar.

        // Yalnızca yayınlanmış bölümleri getir (zamanlanmış/taslak bölümler gizli kalır)
        const chaptersRaw = await db.prepare(
            "SELECT id, series_id, chapter_number, title, created_at, external_url, COALESCE(views, 0) as chapter_views FROM chapters WHERE series_id = ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number ASC"
        ).all(numericId);

        const chapters = chaptersRaw.map(ch => ({
            ...ch,
            // chapter_views: tüm ziyaretçileri (misafir + üye) saatte 1 kez sayar — tek ve tutarlı metrik
            read_count: ch.chapter_views || 0,
        }));

        return NextResponse.json({
            series: { ...series, genres: JSON.parse(series.genres || '[]') },
            chapters: chapters,
        });
    } catch (error) {
        console.error('GET /api/series/[id] error:', error);
        return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
    }
}
