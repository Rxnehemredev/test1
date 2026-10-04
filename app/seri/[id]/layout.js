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

// Canonical URL'yi /series/[slug] olarak işaret et — /seri/[id] duplicate content sorununu önler
// Ayrıca tam Open Graph/Twitter metadata'sı üretir (link önizlemeleri için)
export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT * FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT * FROM series WHERE slug = ? AND published = 1').get(id);

        if (!series) return {};

        const slug = series.slug || series.id;
        // NOT: /series/{slug} next.config.mjs'de 301 ile /seri/{slug}'e yönlendiriliyor.
        // Yani gerçek, ulaşılabilir sayfa BURASI (/seri/{slug}) — canonical kendi
        // adresine işaret etmeli, yoksa Google canonical'ı takip edip tekrar
        // buraya 301 ile geri döner (döngü / kafa karıştırıcı sinyal).
        const canonicalUrl = `${BASE_URL}/seri/${slug}`;

        // Kapak görseli — yoksa site ikonuna geri dön
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
                siteName,
                title: pageTitle,
                description,
                images: [{
                    url: coverUrl,
                    width: 460,
                    height: 650,
                    alt: `${series.title} kapak`,
                }],
            },
            twitter: {
                card: 'summary_large_image',
                title: pageTitle,
                description,
                images: [coverUrl],
            },
        };
    } catch {
        return {};
    }
}

export default function SeriLayout({ children }) {
    return children;
}