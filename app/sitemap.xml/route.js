// /sitemap.xml — Sitemap Index
// Alt sitemaplar:
//   /sitemap-static.xml   → ana sayfalar
//   /sitemap-genres.xml   → tür sayfaları
//   /sitemap-series.xml   → seri detay sayfaları  (image sitemap dahil)
//   /sitemap-chapters.xml → bölüm okuma sayfaları (sayfalı, 2000/dosya)
//   /sitemap-blogs.xml    → blog yazıları
//
// Neden index yapısı?
// - Google tek sitemaptan 50k URL + 50MB ile sınırlı; bölüm sayısı hızla büyür.
// - Index yapısıyla Google hangi alt sitemapın değiştiğini görür, sadece onu çeker.
// - Farklı içerik türleri için farklı lastmod göstermek mümkün olur.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDb();

        // Her alt sitemap için lastmod = o kategorideki en son değişiklik tarihi
        const latestSeries = await db.prepare(
            `SELECT MAX(COALESCE(
                (SELECT MAX(ch.created_at) FROM chapters ch WHERE ch.series_id = s.id),
                s.created_at
            )) as d FROM series s WHERE s.published = 1`
        ).get();

        const latestChapter = await db.prepare(
            `SELECT MAX(ch.created_at) as d FROM chapters ch
             JOIN series s ON s.id = ch.series_id WHERE s.published = 1`
        ).get();

        const latestBlog = await db.prepare(
            `SELECT MAX(created_at) as d FROM blogs WHERE status = 'published'`
        ).get();

        const now = new Date().toISOString().split('T')[0];

        function toDate(val) {
            if (!val) return now;
            try { return new Date(val).toISOString().split('T')[0]; } catch { return now; }
        }

        const latestTag = await db.prepare(
            `SELECT MAX(b.created_at) as d FROM blog_tags t
             JOIN blog_tag_map m ON m.tag_id = t.id
             JOIN blogs b ON b.id = m.blog_id AND b.status = 'published'`
        ).get();

        const sitemaps = [
            { loc: `${BASE_URL}/sitemap-static.xml`,   lastmod: now },
            { loc: `${BASE_URL}/sitemap-genres.xml`,   lastmod: now },
            { loc: `${BASE_URL}/sitemap-series.xml`,   lastmod: toDate(latestSeries?.d) },
            { loc: `${BASE_URL}/sitemap-chapters.xml`, lastmod: toDate(latestChapter?.d) },
            { loc: `${BASE_URL}/sitemap-blogs.xml`,    lastmod: toDate(latestBlog?.d) },
            { loc: `${BASE_URL}/sitemap-tags.xml`,     lastmod: toDate(latestTag?.d) },
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Sitemap index error:', error);
        // Fallback: sadece static sitemap'i göster
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${BASE_URL}/sitemap-static.xml</loc></sitemap>
</sitemapindex>`, { headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            // Hata durumunda kısa cache: sorun düzelince (bir sonraki DB
            // sorgusu başarılı olunca) CDN eski/bozuk hâli uzun süre
            // saklamasın — normal 3600sn yerine sadece 60sn.
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        } });
    }
}
