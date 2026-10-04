// /sitemap-static.xml — Ana sayfalar, sabit URL'ler
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

const STATIC_PAGES = [
    { url: '/',         changefreq: 'daily',   priority: '1.0' },
    { url: '/series',   changefreq: 'daily',   priority: '0.9' },
    { url: '/ranking',  changefreq: 'daily',   priority: '0.8' },
    { url: '/blog',     changefreq: 'daily',   priority: '0.8' },
    { url: '/requests', changefreq: 'weekly',  priority: '0.5' },
    { url: '/privacy',  changefreq: 'monthly', priority: '0.3' },
    { url: '/terms',    changefreq: 'monthly', priority: '0.3' },
];

export async function GET() {
    const now = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
