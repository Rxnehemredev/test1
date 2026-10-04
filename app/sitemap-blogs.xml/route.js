// /sitemap-blogs.xml — Blog yazıları
// Blog yazıları metin ağırlıklı, Google'ın "faydalı içerik" için değer
// verdiği sayfalar. image:image tag'i ile kapak görselleri de indexleniyor.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

import { getDb } from '@/lib/db';

// Bu route DB'den her istekte taze veri çekmeli. Bu export olmadan Next.js
// build sırasında sonucu bir kere üretip statik olarak donduruyor — yeni
// bloglar eklense bile sitemap hiç güncellenmiyordu.
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

        const blogs = await db.prepare(`
            SELECT b.slug, b.title, b.cover_url, b.created_at,
                   s.title as series_title
            FROM blogs b
            LEFT JOIN series s ON b.series_id = s.id
            WHERE b.status = 'published'
            ORDER BY b.created_at DESC
        `).all();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;
        for (const b of blogs) {
            const lastmod = toDate(b.updated_at, null) || toDate(b.created_at, now);
            const coverAbs = b.cover_url
                ? (b.cover_url.startsWith('http') ? b.cover_url : `${BASE_URL}${b.cover_url}`)
                : null;

            const imageTitle = b.series_title
                ? `${esc(b.title)} — ${esc(b.series_title)}`
                : esc(b.title);

            xml += `  <url>
    <loc>${BASE_URL}/blog/${esc(b.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`;

            if (coverAbs) {
                xml += `
    <image:image>
      <image:loc>${esc(coverAbs)}</image:loc>
      <image:title>${imageTitle}</image:title>
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
        console.error('sitemap-blogs error:', error);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }
}
