import { getDb } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim', 'Ecchi': 'Ecchi', 'Harem': 'Harem',
    'Josei': 'Josei', 'Mature': 'Yetişkin', 'Mecha': 'Mecha', 'Psychological': 'Psikolojik',
    'Seinen': 'Seinen', 'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua'
};

// Server component: generates per-series metadata for SEO
export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT * FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT * FROM series WHERE slug = ? AND published = 1').get(id);

        if (!series) {
            return {
                title: 'Seri Bulunamadı | Asteria Scans',
                robots: { index: false },
            };
        }

        const slug = series.slug || series.id;
        const canonicalUrl = `${BASE_URL}/series/${slug}`;
        const coverUrl = series.cover_url
            ? (series.cover_url.startsWith('http')
                ? series.cover_url
                : `${BASE_URL}${series.cover_url.startsWith('/') ? '' : '/'}${series.cover_url}`)
            : `${BASE_URL}/icon-512.png`;

        const genres = series.genres
            ? (() => { try { return JSON.parse(series.genres); } catch { return series.genres.split(',').map(g => g.trim()).filter(Boolean); } })()
            : [];
        const genresTr = genres.map(g => GENRE_TR[g] || g);

        const altNames = series.alt_names
            ? series.alt_names.split(',').map(n => n.trim()).filter(Boolean)
            : [];

        const baseDescription = series.description
            ? series.description.slice(0, 130).replace(/\s+$/, '') + (series.description.length > 130 ? '…' : '')
            : `${series.title} mangasını Asteria Scans üzerinde ücretsiz ve Türkçe oku.`;

        const description = altNames.length > 0
            ? `${baseDescription} Diğer adlar: ${altNames.slice(0, 2).join(', ')}.`
            : baseDescription;

        const keywords = [
            series.title,
            `${series.title} manga`,
            `${series.title} oku`,
            `${series.title} türkçe`,
            `${series.title} bölümleri`,
            ...altNames,
            ...genres,
            ...genresTr,
            'manga', 'manga oku', 'türkçe manga', 'asteria scans',
            series.type ? `${series.type} oku` : '',
            series.type || '',
        ].filter(Boolean).join(', ');

        const settingsRows = await db.prepare('SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ("site_name", "seo_title_series")').all();
        const settings = {};
        settingsRows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        const siteName = settings.site_name || 'Asteria Scans';

        let pageTitle = `${series.title} — Oku | ${siteName}`;
        if (settings.seo_title_series) {
            pageTitle = settings.seo_title_series.replace(/\{series_name\}/g, series.title).replace(/\{site_name\}/g, siteName);
        }

        // Tam URL oluştur (og:image ve twitter:image için mutlak URL gerekli)
        const absoluteCoverUrl = coverUrl.startsWith('http')
            ? coverUrl
            : `${BASE_URL}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;

        return {
            title: pageTitle,
            description,
            keywords,
            alternates: {
                canonical: canonicalUrl,
            },
            robots: { index: true, follow: true },
            openGraph: {
                type: 'book',
                url: canonicalUrl,
                siteName: siteName,
                title: series.title,
                description,
                images: [
                    {
                        url: absoluteCoverUrl,
                        width: 1200,
                        height: 630,
                        alt: series.title,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: series.title,
                description,
                images: [absoluteCoverUrl],
            },
        };
    } catch {
        return {
            title: 'Asteria Scans — Türkçe Manga Oku',
            robots: { index: true, follow: true },
        };
    }
}

async function SeriesJsonLd({ id }) {
    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT * FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT * FROM series WHERE slug = ? AND published = 1').get(id);

        if (!series) return null;

        const slug = series.slug || series.id;
        const canonicalUrl = `${BASE_URL}/series/${slug}`;
        const coverUrl = series.cover_url
            ? (series.cover_url.startsWith('http')
                ? series.cover_url
                : `${BASE_URL}${series.cover_url.startsWith('/') ? '' : '/'}${series.cover_url}`)
            : `${BASE_URL}/icon-512.png`;

        const genres = series.genres
            ? (() => { try { return JSON.parse(series.genres); } catch { return series.genres.split(',').map(g => g.trim()).filter(Boolean); } })()
            : [];

        const description = series.description
            ? series.description.slice(0, 155).replace(/\s+$/, '') + (series.description.length > 155 ? '…' : '')
            : `${series.title} mangasını Asteria Scans üzerinde ücretsiz ve Türkçe oku.`;

        const altNames = series.alt_names
            ? series.alt_names.split(',').map(n => n.trim()).filter(Boolean)
            : [];

        const chapterCount = (await (db.prepare(
            'SELECT COUNT(*) as cnt FROM chapters WHERE series_id = ?'
        ).get(series.id)))?.cnt ?? 0;

        const datePublished = series.created_at
            ? new Date(series.created_at).toISOString().split('T')[0]
            : undefined;

        const latestChapter = await db.prepare(
            'SELECT created_at FROM chapters WHERE series_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(series.id);
        const dateModified = latestChapter?.created_at
            ? new Date(latestChapter.created_at).toISOString().split('T')[0]
            : datePublished;

        const comicSeriesSchema = {
            '@context': 'https://schema.org',
            '@type': 'ComicSeries',
            '@id': `${canonicalUrl}#series`,
            name: series.title,
            ...(altNames.length > 0 ? { alternateName: altNames } : {}),
            description,
            url: canonicalUrl,
            inLanguage: 'tr',
            image: {
                '@type': 'ImageObject',
                url: coverUrl,
                width: 460,
                height: 650,
            },
            genre: genres,
            numberOfEpisodes: chapterCount,
            ...(datePublished ? { datePublished } : {}),
            ...(dateModified ? { dateModified } : {}),
            ...(series.author ? { author: { '@type': 'Person', name: series.author } } : {}),
            publisher: {
                '@type': 'Organization',
                name: 'Asteria Scans',
                url: BASE_URL,
                logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
            },
            ...(series.status ? { creativeWorkStatus: series.status } : {}),
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
                    name: 'Göz At',
                    item: `${BASE_URL}/series`,
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: series.title,
                    item: canonicalUrl,
                },
            ],
        };

        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(comicSeriesSchema).replace(/</g, '\\u003c') }}
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

export default async function SeriesLayout({ children, params }) {
    const { id } = await params;
    return (
        <>
            <SeriesJsonLd id={id} />
            {children}
        </>
    );
}