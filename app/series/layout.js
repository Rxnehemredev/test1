import { getDb } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

async function getSiteName() {
    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'site_name'").get();
        return row?.setting_value || 'Asteria Scans';
    } catch { return 'Asteria Scans'; }
}

export async function generateMetadata({ searchParams }) {
    const params = await searchParams;
    const page = parseInt(params?.page || params?.p || '1', 10);
    const canonicalUrl = `${BASE_URL}/series`;
    const siteName = await getSiteName();

    return {
        title: `Manga Keşfet — Tüm Seriler | ${siteName}`,
        description: 'Binlerce manga, manhwa ve manhua serisine göz atın. Tür, durum ve tipe göre filtreleyin. Yapay zeka destekli anında çeviri ile Türkçe manga okuma deneyimini ücretsiz yaşayın.',
        keywords: 'manga keşfet, manga listesi, manga oku, ücretsiz manga oku, manhwa, manhua, aksiyon mangası, romantik manga, fantastik manga',
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            type: 'website',
            url: canonicalUrl,
            siteName,
            title: `Manga Keşfet — Tüm Seriler | ${siteName}`,
            description: 'Binlerce manga, manhwa ve manhua serisine göz atın. Yapay zeka destekli Türkçe çeviri ile ücretsiz manga okuyun.',
            images: [{
                url: `${BASE_URL}/icon-512.png`,
                width: 512,
                height: 512,
                alt: `${siteName} — Manga Keşfet`,
            }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Manga Keşfet | ${siteName}`,
            description: 'Binlerce manga, manhwa ve manhua serisine göz atın. Yapay zeka destekli Türkçe çeviri ile ücretsiz manga okuyun.',
            images: [`${BASE_URL}/icon-512.png`],
        },
        robots: page > 1
            ? { index: false, follow: true }
            : { index: true, follow: true },
    };
};

export default async function SeriesListLayout({ children }) {
    const siteName = await getSiteName();
    const collectionPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${BASE_URL}/series#collection`,
        name: `Manga Keşfet - Tüm Seriler`,
        description: 'Yapay zeka destekli anında çeviri ile binlerce manga, manhwa ve manhua serisini ücretsiz okuyun.',
        url: `${BASE_URL}/series`,
        isPartOf: {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            name: siteName,
            url: BASE_URL,
        },
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
                { '@type': 'ListItem', position: 2, name: 'Manga Keşfet', item: `${BASE_URL}/series` },
            ],
        },
    };
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema).replace(/</g, '\\u003c') }}
            />
            {children}
        </>
    );
}
