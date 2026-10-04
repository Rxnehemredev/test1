import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { createRateLimiter } from '@/lib/ratelimit';
import { getProxiedImageUrl } from '@/lib/imageProxyToken';
import { getClientIp } from '@/lib/security/requestHelpers';
const routeLimiter = createRateLimiter(60, 60000);

function getViewerHash(request) {
    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent') || '';
    return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

export async function GET(request, { params }) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const { id } = await params;
        const db = await getDb();

        // ── Optimizasyon: chapter + series + pages + prev/next'i tek batch'te çek ──
        // Önceki sürümde 5-7 ayrı Turso ağ round-trip'i vardı (chapter, recentView,
        // UPDATE, series, pages, prevChapter, nextChapter). Her biri ~40-80ms latency
        // demek. db.batch() bunları TEK HTTP isteğine sıkıştırır.

        const viewerHash = getViewerHash(request);

        // Önce chapter'ı çek — varsa geri kalanını batch'le, yoksa erken çık.
        const chapter = await db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        // Zamanlı bölüm kontrolü
        if (chapter.publish_at) {
            const publishStr = String(chapter.publish_at).trim();
            const publishDate = new Date(publishStr.includes('T') ? publishStr : publishStr.replace(' ', 'T') + 'Z');
            if (!isNaN(publishDate.getTime()) && publishDate > new Date()) {
                return NextResponse.json({ error: 'Bu bölüm henüz yayınlanmadı', scheduled: true }, { status: 403 });
            }
        }

        // ── Tek batch: series + pages + prev + next + view log kontrolü ──────────
        const batchResults = await db.batch([
            // 0: series
            { sql: 'SELECT * FROM series WHERE id = ?', args: [chapter.series_id] },
            // 1: pages
            { sql: 'SELECT * FROM pages WHERE chapter_id = ? ORDER BY page_number ASC', args: [id] },
            // 2: prev chapter
            { sql: "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number < ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number DESC LIMIT 1", args: [chapter.series_id, chapter.chapter_number] },
            // 3: next chapter
            { sql: "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number > ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number ASC LIMIT 1", args: [chapter.series_id, chapter.chapter_number] },
            // 4: recentView kontrolü
            { sql: "SELECT id FROM chapter_views_log WHERE chapter_id = ? AND viewer_hash = ? AND created_at >= datetime('now', '-1 hour') LIMIT 1", args: [id, viewerHash] },
        ]);

        const series = batchResults[0].rows[0];
        if (!series) {
            return NextResponse.json({ error: 'Series not found' }, { status: 404 });
        }

        const pages = batchResults[1].rows;
        const prevChapter = batchResults[2].rows[0] || null;
        const nextChapter = batchResults[3].rows[0] || null;
        const recentView = batchResults[4].rows[0];

        // ── View kayıt: sadece gerekirse, arka planda (response'u bloklamaz) ────
        if (!recentView) {
            // fire-and-forget — await etmiyoruz, kullanıcı response'u beklemez
            db.batch([
                { sql: 'UPDATE chapters SET views = coalesce(views, 0) + 1 WHERE id = ?', args: [id] },
                { sql: 'INSERT INTO chapter_views_log (chapter_id, viewer_hash) VALUES (?, ?)', args: [id, viewerHash] },
            ]).catch((e) => console.error('view log batch error:', e));
        }

        const pagesWithDisplay = pages.map(p => ({
            ...p,
            display_image: getProxiedImageUrl(p.image_path),
        }));

        return NextResponse.json({
            chapter,
            series: { ...series, genres: JSON.parse(series.genres || '[]') },
            pages: pagesWithDisplay,
            prevChapter,
            nextChapter,
        });
    } catch (error) {
        console.error('GET /api/chapters/[id] error:', error);
        return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 });
    }
}
