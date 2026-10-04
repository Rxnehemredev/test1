// /sitemap-series.xml — Seri detay sayfaları
// Google Image Search için image:image tag'leri dahil.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function toDate(val, fallback) {
    if (!val) return fallback;
    try { return new Date(val).toISOString().split('T')[0]; } catch { return fallback; }
}

export async function GET() {
    try {
        const db = await getDb();
        const now = new Date().toISOString().split('T')[0];

        // Her serinin en son bölüm tarihi ve kapak görseli
        const series = await db.prepare(`
            SELECT
                s.id, s.slug, s.title, s.cover_url, s.description, s.type,
                s.created_at, s.updated_at,
                MAX(ch.created_at) as latest_chapter_at,
                COUNT(ch.id) as chapter_count
            FROM series s
            LEFT JOIN chapters ch ON ch.series_id = s.id
            WHERE s.published = 1
            GROUP BY s.id
            ORDER BY COALESCE(MAX(ch.created_at), s.created_at) DESC
        `).all();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;
        for (const s of series) {
            const slug = s.slug || s.id;
            // lastmod = son bölüm tarihi > güncelleme tarihi > oluşturma tarihi
            const lastmod = toDate(s.latest_chapter_at, null)
                || toDate(s.updated_at, null)
                || toDate(s.created_at, now);

            // Seri türüne göre priority
            // Aktif (çok bölümlü) seriler daha yüksek
            const priority = s.chapter_count > 20 ? '0.9'
                : s.chapter_count > 5  ? '0.8'
                : '0.7';

            const coverAbs = s.cover_url
                ? (s.cover_url.startsWith('http') ? s.cover_url : `${BASE_URL}${s.cover_url}`)
                : null;

            const caption = s.description
                ? s.description.slice(0, 150).replace(/\s+$/, '') + (s.description.length > 150 ? '…' : '')
                : `${esc(s.title)} - Asteria Scans'da oku`;

            xml += `  <url>
    <loc>${BASE_URL}/seri/${esc(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${s.chapter_count > 0 ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>`;

            if (coverAbs) {
                xml += `
    <image:image>
      <image:loc>${esc(coverAbs)}</image:loc>
      <image:title>${esc(s.title)}</image:title>
      <image:caption>${esc(caption)}</image:caption>
    </image:image>`;
            }

            xml += `\n  </url>\n`;
        }

        xml += `</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('sitemap-series error:', error);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }
}
