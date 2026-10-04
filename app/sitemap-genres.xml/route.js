// /sitemap-genres.xml — Tür sayfaları (/tur/[slug])
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

import { getDb } from '@/lib/db';
import { listPublicGenres } from '@/lib/genreSlug';

export const dynamic = 'force-dynamic';

function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export async function GET() {
    try {
        const db = await getDb();
        const genres = await listPublicGenres(db);
        const now = new Date().toISOString().split('T')[0];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${genres.map(g => `  <url>
    <loc>${BASE_URL}/tur/${esc(g.slug)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('sitemap-genres error:', error);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    }
}
