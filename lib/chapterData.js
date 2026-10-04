import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { getProxiedImageUrl } from '@/lib/imageProxyToken';
import { getClientIp } from '@/lib/security/requestHelpers';

function getViewerHashFromHeaders(h) {
    const ip = getClientIp(h);
    const ua = h.get('user-agent') || '';
    return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

async function resolveSeriesBySlug(db, seriesSlug) {
    const isNumeric = /^\d+$/.test(seriesSlug);
    return isNumeric
        ? db.prepare('SELECT * FROM series WHERE id = ? AND published = 1').get(seriesSlug)
        : db.prepare('SELECT * FROM series WHERE slug = ? AND published = 1').get(seriesSlug);
}

// SSR (Server Component) için bölüm verisi. app/api/chapters/[id]/route.js
// ile AYNI batch sorgu mantığı — canonical TR URL'inin
// (app/seri/[id]/bolum/[chapterNumber]/page.js) ilk HTML'inde gerçek içerik
// (metin/görsel) olması için kullanılıyor; önceden bu sayfa tamamen
// client-side render ediliyordu (bkz. DEVAM-NOTU.md "ÖNEMLİ BULGU").
//
// DB YÜKÜ NOTU: Bu fonksiyon çağrıldığında görüntülenme sayacı BURADA
// artırılır. ReaderContent bu veriyi initialData olarak aldığında kendi
// ilk /api/chapters/{id} çağrısını ATLAR (bkz. app/read/[chapterId]/page.js) —
// yani sayfa başına toplam DB sorgu sayısı öncekiyle aynı kalır, artmaz.
export async function getChapterDataForSSR(seriesSlug, chapterNumber) {
    try {
        const db = await getDb();
        const series = await resolveSeriesBySlug(db, seriesSlug);
        if (!series) return { error: 'series_not_found' };

        const num = parseFloat(chapterNumber);
        const chapter = await db.prepare(
            'SELECT * FROM chapters WHERE series_id = ? AND chapter_number = ? LIMIT 1'
        ).get(series.id, num);
        if (!chapter) return { error: 'chapter_not_found' };

        if (chapter.publish_at) {
            const publishStr = String(chapter.publish_at).trim();
            const publishDate = new Date(publishStr.includes('T') ? publishStr : publishStr.replace(' ', 'T') + 'Z');
            if (!isNaN(publishDate.getTime()) && publishDate > new Date()) {
                return { error: 'chapter_not_found' };
            }
        }

        const h = await headers();
        const viewerHash = getViewerHashFromHeaders(h);

        const batchResults = await db.batch([
            // 0: pages
            { sql: 'SELECT * FROM pages WHERE chapter_id = ? ORDER BY page_number ASC', args: [chapter.id] },
            // 1: prev chapter
            { sql: "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number < ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number DESC LIMIT 1", args: [series.id, chapter.chapter_number] },
            // 2: next chapter
            { sql: "SELECT id, chapter_number FROM chapters WHERE series_id = ? AND chapter_number > ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number ASC LIMIT 1", args: [series.id, chapter.chapter_number] },
            // 3: recentView kontrolü
            { sql: "SELECT id FROM chapter_views_log WHERE chapter_id = ? AND viewer_hash = ? AND created_at >= datetime('now', '-1 hour') LIMIT 1", args: [chapter.id, viewerHash] },
        ]);

        const pages = batchResults[0].rows;
        const prevChapter = batchResults[1].rows[0] || null;
        const nextChapter = batchResults[2].rows[0] || null;
        const recentView = batchResults[3].rows[0];

        if (!recentView) {
            // fire-and-forget — SSR response'unu bloklamaz
            db.batch([
                { sql: 'UPDATE chapters SET views = coalesce(views, 0) + 1 WHERE id = ?', args: [chapter.id] },
                { sql: 'INSERT INTO chapter_views_log (chapter_id, viewer_hash) VALUES (?, ?)', args: [chapter.id, viewerHash] },
            ]).catch((e) => console.error('view log batch error (SSR):', e));
        }

        const pagesWithDisplay = pages.map(p => ({
            ...p,
            display_image: getProxiedImageUrl(p.image_path),
        }));

        return {
            chapter,
            series: { ...series, genres: JSON.parse(series.genres || '[]') },
            pages: pagesWithDisplay,
            prevChapter,
            nextChapter,
        };
    } catch (error) {
        console.error('getChapterDataForSSR error:', error);
        return { error: 'chapter_not_found' };
    }
}
