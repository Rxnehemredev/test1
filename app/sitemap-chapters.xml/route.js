// /sitemap-chapters.xml?page=N — Bölüm sayfaları
// Sayfalı yapı: her sayfada max 2000 URL (50k limiti önlemek için).
// ?page yoksa ilk sayfayı döner.
// Çok sayfalı olunca sitemap.xml index'inde de sayfalı linkler verilmeli —
// ama şimdilik tek dosya yeterli (binlerce bölüme ulaşana kadar).
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';
const PAGE_SIZE = 2000;

import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toDate(val, fallback) {
    if (!val) return fallback;
    try { return new Date(val).toISOString().split('T')[0]; } catch { return fallback; }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const offset = (page - 1) * PAGE_SIZE;

        const db = await getDb();
        const now = new Date().toISOString().split('T')[0];

        const chapters = await db.prepare(`
            SELECT
                ch.chapter_number, ch.title as chapter_title, ch.created_at,
                s.slug as series_slug, s.title as series_title
            FROM chapters ch
            JOIN series s ON s.id = ch.series_id
            WHERE s.published = 1
            ORDER BY ch.created_at DESC
            LIMIT ? OFFSET ?
        `).all(PAGE_SIZE, offset);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
        for (const ch of chapters) {
            if (!ch.series_slug) continue;
            const lastmod = toDate(ch.created_at, now);
            xml += `  <url>
    <loc>${BASE_URL}/seri/${esc(ch.series_slug)}/bolum/${ch.chapter_number}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }

        xml += `</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('sitemap-chapters error:', error);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }
}
