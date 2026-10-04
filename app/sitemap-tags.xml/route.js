// /sitemap-tags.xml — Etiket (tag) sayfaları
// /etiket/[slug] → Google'ın "manga oku", "türkçe webtoon" gibi aramaları indexlemesi için.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function toDate(val, fallback) {
    if (!val) return fallback;
    try { return new Date(val).toISOString().split('T')[0]; } catch { return fallback; }
}

export async function GET() {
    try {
        const db = await getDb();
        const now = new Date().toISOString().split('T')[0];

        // Her etiket için en son blog yazısı tarihi = lastmod
        const tags = await db.prepare(`
            SELECT t.slug, t.name,
                   MAX(b.created_at) as last_blog_at,
                   COUNT(m.blog_id) as blog_count
            FROM blog_tags t
            JOIN blog_tag_map m ON m.tag_id = t.id
            JOIN blogs b ON b.id = m.blog_id AND b.status = 'published'
            GROUP BY t.id
            ORDER BY last_blog_at DESC
        `).all();

        if (tags.length === 0) {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
                { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
        for (const t of tags) {
            const lastmod = toDate(t.last_blog_at, now);
            // Blog sayısına göre priority: çok yazılı etiketler daha değerli
            const priority = t.blog_count >= 5 ? '0.7' : t.blog_count >= 2 ? '0.6' : '0.5';
            xml += `  <url>
    <loc>${BASE_URL}/etiket/${esc(t.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
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
        console.error('sitemap-tags error:', error);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }
}
