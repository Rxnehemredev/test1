import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import SeriesDetailClient from '@/components/SeriesDetailClient';
import { getClientIp } from '@/lib/security/requestHelpers';

// Her istekte sunucu tarafında render et
export const dynamic = 'force-dynamic';

// Bot koruması: Yalnızca IP bazlı SHA-256 hash (PII saklanmaz)
// NOT: User-Agent hash'ten çıkarıldı — farklı UA ile view şişirme saldırısını önler
function getViewerHash(headersList) {
    const ip = getClientIp(headersList);
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export default async function SeriesDetailPage({ params }) {
    const { id } = await params;

    const db = await getDb();
    const isNumeric = /^\d+$/.test(id);

    const series = isNumeric
        ? await db.prepare('SELECT * FROM series WHERE id = ? AND published = 1').get(id)
        : await db.prepare('SELECT * FROM series WHERE slug = ? AND published = 1').get(id);

    if (!series) {
        notFound();
    }

    // Madde 7: Numeric ID → slug 301 redirect
    if (isNumeric && series.slug) {
        redirect(`/series/${series.slug}`);
    }

    // ─── Seri görüntülenme sayacı (bot korumalı, saatte 1 artış) ────────────
    try {
        const headersList = await headers();
        const viewerHash = getViewerHash(headersList);
        const recentView = await db.prepare(`
            SELECT id FROM series_views_log
            WHERE series_id = ? AND viewer_hash = ? AND created_at >= datetime('now', '-1 hour')
            LIMIT 1
        `).get(series.id, viewerHash);

        if (!recentView) {
            await db.prepare('UPDATE series SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(series.id);
            await db.prepare('INSERT INTO series_views_log (series_id, viewer_hash) VALUES (?, ?)').run(series.id, viewerHash);
            // Güncel views değerini seri objesine yansıt
            series.views = (series.views || 0) + 1;
        }
    } catch { /* görüntülenme takibi kritik değil, hata sayfa yüklenmesini engellemesin */ }

    // ─── Bölümleri çek (yalnızca yayınlanmış / zamanı gelmiş) ──────────────
    const chaptersRaw = await db.prepare(
        "SELECT *, COALESCE(views, 0) as chapter_views FROM chapters WHERE series_id = ? AND (publish_at IS NULL OR publish_at <= datetime('now')) ORDER BY chapter_number ASC"
    ).all(series.id);

    // read_count: chapter_views, tüm ziyaretçileri (misafir + üye) saatte 1 kez sayar.
    // Bu tek ve tutarlı metriktir; read_history yalnızca giriş yapmış ve %70'i geçmiş
    // kullanıcıları sayar (farklı popülasyon), Math.max karışıklığa yol açar.

    // ─── Yorum sayılarını çek ────────────────────────────────────────────────
    let commentCountMap = {};
    try {
        // Performans: tüm tabloyu taramak yerine yalnızca bu serinin bölümlerine filtrele
        const commentCounts = await db.prepare(
            "SELECT c.chapter_id, COUNT(*) as comment_count FROM comments c JOIN chapters ch ON ch.id = c.chapter_id WHERE c.chapter_id IS NOT NULL AND ch.series_id = ? GROUP BY c.chapter_id"
        ).all(series.id);
        for (const row of commentCounts) {
            commentCountMap[row.chapter_id] = row.comment_count;
        }
    } catch { /* yorum tablosu yoksa veya hata olursa yoksay */ }

    const chapters = chaptersRaw.map(ch => ({
        ...ch,
        read_count: ch.chapter_views || 0,
        comment_count: commentCountMap[ch.id] || 0,
    }));

    // Fetch related series (server-side) — SQL LIKE ile filtrele, JS'de 50 satır taramak yerine
    let relatedSeries = [];
    try {
        const seriesGenres = series.genres
            ? (Array.isArray(series.genres)
                ? series.genres
                : (() => { try { return JSON.parse(series.genres); } catch { return []; } })())
            : [];
        if (seriesGenres.length > 0) {
            // Her tür için LIKE koşulu oluştur — JSON array içinde arama
            const likeClauses = seriesGenres.map(() => `genres LIKE ?`).join(' OR ');
            const likeParams = seriesGenres.map(g => `%"${g}"%`);
            relatedSeries = await db.prepare(`
                SELECT id, title, slug, cover_url, genres, status, type, rating, views, is_adult,
                    (SELECT COUNT(*) FROM chapters c WHERE c.series_id = s.id) as chapter_count
                FROM series s
                WHERE published = 1 AND id != ? AND (${likeClauses})
                LIMIT 6
            `).all(series.id, ...likeParams);
        }
    } catch { }

    // Serialize safely for client component props
    const seriesData = JSON.parse(JSON.stringify(series));
    const chaptersData = JSON.parse(JSON.stringify(chapters));
    const relatedData = JSON.parse(JSON.stringify(relatedSeries));

    return (
        <SeriesDetailClient
            series={seriesData}
            chapters={chaptersData}
            relatedSeries={relatedData}
        />
    );
}
