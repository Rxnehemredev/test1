import { getDb } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export async function generateMetadata({ params }) {
    const { id, chapterNumber } = await params;
    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT id, title, slug, cover_url, genres FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT id, title, slug, cover_url, genres FROM series WHERE slug = ? AND published = 1').get(id);

        if (!series) return { title: 'Asteria Scans', robots: { index: false } };

        const chapter = await db.prepare(
            'SELECT id, title, chapter_number FROM chapters WHERE series_id = ? AND chapter_number = ?'
        ).get(series.id, parseFloat(chapterNumber));

        const slug = series.slug || series.id;
        const chNum = chapter?.chapter_number ?? chapterNumber;
        const chTitle = chapter?.title ? ` — ${chapter.title}` : '';
        // Bu rota (/series/.../chapter/...) sitemap'teki GERÇEK adresle (/seri/.../bolum/...)
        // aynı içeriğin bir kopyası — Google'da "duplicate content" yaratmaması için
        // canonical'ı gerçek adrese işaret ediyor ve kendisi noindex.
        const canonicalUrl = `${BASE_URL}/seri/${slug}/bolum/${chNum}`;
        const coverUrl = series.cover_url
            ? (series.cover_url.startsWith('http')
                ? series.cover_url
                : `${BASE_URL}${series.cover_url.startsWith('/') ? '' : '/'}${series.cover_url}`)
            : `${BASE_URL}/icon-512.png`;

        // Tam URL oluştur (og:image ve twitter:image için mutlak URL gerekli)
        const absoluteCoverUrl = coverUrl.startsWith('http')
            ? coverUrl
            : `${BASE_URL}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;

        const settingsRows = await db.prepare('SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ("site_name", "seo_title_chapter")').all();
        const settings = {};
        settingsRows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        const siteName = settings.site_name || 'Asteria Scans';

        let pageTitle = `${series.title} Bölüm ${chNum}${chTitle} | ${siteName}`;
        if (settings.seo_title_chapter) {
            pageTitle = settings.seo_title_chapter
                .replace(/\{series_name\}/g, series.title)
                .replace(/\{chapter_number\}/g, chNum)
                .replace(/\{chapter_title\}/g, chapter?.title || '')
                .replace(/\{site_name\}/g, siteName);
        }
        const description = `${series.title} Bölüm ${chNum}${chTitle} online oku. Yapay zeka destekli Türkçe çeviri ile ücretsiz ve reklamsız okuyun.`;
        const keywords = [
            `${series.title} ${chNum}`,
            `${series.title} Bölüm ${chNum}`,
            `${series.title} ${chNum} Oku`,
            `${series.title} Bölüm ${chNum} Oku`,
            `${series.title} Türkçe Oku`,
            `Manga Oku`,
            `Türkçe Manga Oku`,
            `Asteria Scans`
        ].filter(Boolean).join(', ');

        return {
            title: pageTitle,
            description,
            keywords,
            alternates: { canonical: canonicalUrl },
            robots: { index: false, follow: true },
            openGraph: {
                type: 'article',
                url: canonicalUrl,
                siteName: siteName,
                title: pageTitle,
                description,
                images: [
                    {
                        url: absoluteCoverUrl,
                        width: 1200,
                        height: 630,
                        alt: `${series.title} kapak`,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: pageTitle,
                description,
                images: [absoluteCoverUrl],
            },
        };
    } catch {
        return { title: 'Asteria Scans — Türkçe Manga Oku', robots: { index: false, follow: true } };
    }
}

// Madde 2+3: JSON-LD doğrudan script tag + BreadcrumbList for chapters
async function ChapterJsonLd({ id, chapterNumber }) {
    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE slug = ? AND published = 1').get(id);

        if (!series) return null;

        const chapter = await db.prepare(
            'SELECT id, title, chapter_number FROM chapters WHERE series_id = ? AND chapter_number = ?'
        ).get(series.id, parseFloat(chapterNumber));

        const slug = series.slug || series.id;
        const chNum = chapter?.chapter_number ?? chapterNumber;
        const chTitle = chapter?.title ? ` — ${chapter.title}` : '';
        const seriesUrl = `${BASE_URL}/seri/${slug}`;
        const canonicalUrl = `${seriesUrl}/bolum/${chNum}`;
        const coverUrl = series.cover_url
            ? (series.cover_url.startsWith('http') ? series.cover_url : `${BASE_URL}${series.cover_url}`)
            : `${BASE_URL}/icon-512.png`;

        const comicIssueSchema = {
            '@context': 'https://schema.org',
            '@type': 'ComicIssue',
            '@id': `${canonicalUrl}#chapter`,
            name: `${series.title} Bölüm ${chNum}${chTitle}`,
            issueNumber: String(chNum),
            url: canonicalUrl,
            image: {
                '@type': 'ImageObject',
                url: coverUrl,
            },
            isPartOf: {
                '@type': 'ComicSeries',
                '@id': `${seriesUrl}#series`,
                name: series.title,
                url: seriesUrl,
            },
            publisher: {
                '@type': 'Organization',
                name: 'Asteria Scans',
                url: BASE_URL,
                logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
            },
        };

        const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Ana Sayfa',
                    item: BASE_URL,
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Manga Keşfet',
                    item: `${BASE_URL}/seri`,
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: series.title,
                    item: seriesUrl,
                },
                {
                    '@type': 'ListItem',
                    position: 4,
                    name: `Bölüm ${chNum}`,
                    item: canonicalUrl,
                },
            ],
        };

        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(comicIssueSchema).replace(/</g, '\\u003c') }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }}
                />
            </>
        );
    } catch {
        return null;
    }
}

export default async function ChapterLayout({ children, params }) {
    const { id, chapterNumber } = await params;
    return (
        <>
            <ChapterJsonLd id={id} chapterNumber={chapterNumber} />
            {children}
        </>
    );
}