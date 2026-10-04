import { getDb } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export async function generateMetadata({ params }) {
  const { id: seriesSlug, chapterNumber } = await params;
  try {
    const db = await getDb();
    const isNumeric = /^\d+$/.test(seriesSlug);
    const series = isNumeric
      ? await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE id = ? AND published = 1').get(seriesSlug)
      : await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE slug = ? AND published = 1').get(seriesSlug);

    if (!series) return { robots: { index: false } };

    const num = parseFloat(chapterNumber);
    const chapter = await db.prepare(
      'SELECT id, chapter_number, title FROM chapters WHERE series_id = ? AND chapter_number = ? LIMIT 1'
    ).get(series.id, num);

    if (!chapter) return { robots: { index: false } };

    const slug = series.slug || series.id;
    const canonicalUrl = `${BASE_URL}/seri/${slug}/bolum/${chapterNumber}`;

    // seo_title_chapter ayarını DB'den çek
    const settingsRows = await db.prepare(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ("site_name", "seo_title_chapter")'
    ).all();
    const settings = {};
    settingsRows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    const siteName = settings.site_name || 'Asteria Scans';

    // Başlık formatı: admin panelinden özelleştirilebilir
    const chapTitle = chapter.title && !isDefaultTitle(chapter.title, chapterNumber)
      ? chapter.title
      : '';

    let pageTitle;
    if (settings.seo_title_chapter) {
      pageTitle = settings.seo_title_chapter
        .replace(/\{series_name\}/g, series.title)
        .replace(/\{chapter_number\}/g, chapterNumber)
        .replace(/\{chapter_title\}/g, chapTitle || `Bölüm ${chapterNumber}`)
        .replace(/\{site_name\}/g, siteName);
    } else {
      pageTitle = chapTitle
        ? `${series.title} — ${chapTitle} | ${siteName}`
        : `${series.title} Bölüm ${chapterNumber} Oku | ${siteName}`;
    }

    const description = `${series.title} manga serisinin ${chapterNumber}. bölümünü ${siteName} üzerinde ücretsiz ve Türkçe oku.`;

    const coverUrl = series.cover_url
      ? (series.cover_url.startsWith('http') ? series.cover_url : `${BASE_URL}${series.cover_url}`)
      : `${BASE_URL}/icon-512.png`;

    // Bölüm JSON-LD structured data
    const chapterJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ComicIssue',
      name: pageTitle,
      issueNumber: String(chapterNumber),
      description,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'ComicSeries',
        name: series.title,
        url: `${BASE_URL}/series/${slug}`,
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: BASE_URL,
      },
      image: coverUrl,
    });

    const breadcrumbJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: series.title, item: `${BASE_URL}/series/${slug}` },
        { '@type': 'ListItem', position: 3, name: `Bölüm ${chapterNumber}`, item: canonicalUrl },
      ],
    });
    return {
      title: pageTitle,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: 'article',
        url: canonicalUrl,
        siteName,
        title: pageTitle,
        description,
        images: [{ url: coverUrl, width: 460, height: 650, alt: `${series.title} kapak` }],
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description,
        images: [coverUrl],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { robots: { index: true, follow: true } };
  }
}

function isDefaultTitle(title, chNum) {
  if (!title) return true;
  const clean = title.trim().toLowerCase();
  const num = String(chNum).trim();
  const defaults = [
    `chapter ${num}`, `ch. ${num}`, `ch.${num}`,
    `bölüm ${num}`, `böl. ${num}`, `böl.${num}`,
    `${num}. bölüm`, `bölüm: ${num}`, num,
  ];
  return defaults.includes(clean);
}

// JSON-LD'leri JSX içinde render et (metadata.other çalışmaz)
async function BolumJsonLd({ params }) {
  const { id: seriesSlug, chapterNumber } = await params;
  try {
    const db = await getDb();
    const isNumeric = /^\d+$/.test(seriesSlug);
    const series = isNumeric
      ? await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE id = ? AND published = 1').get(seriesSlug)
      : await db.prepare('SELECT id, title, slug, cover_url FROM series WHERE slug = ? AND published = 1').get(seriesSlug);

    if (!series) return null;

    const num = parseFloat(chapterNumber);
    const chapter = await db.prepare(
      'SELECT id, chapter_number, title FROM chapters WHERE series_id = ? AND chapter_number = ? LIMIT 1'
    ).get(series.id, num);

    if (!chapter) return null;

    const slug = series.slug || series.id;
    const canonicalUrl = `${BASE_URL}/seri/${slug}/bolum/${chapterNumber}`;

    const settingsRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'site_name'").get();
    const siteName = settingsRow?.setting_value || 'Asteria Scans';

    const coverUrl = series.cover_url
      ? (series.cover_url.startsWith('http') ? series.cover_url : `${BASE_URL}${series.cover_url}`)
      : `${BASE_URL}/icon-512.png`;

    const chapTitle = chapter.title && !isDefaultTitle(chapter.title, chapterNumber)
      ? chapter.title
      : `Bölüm ${chapterNumber}`;

    const chapterJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ComicIssue',
      name: `${series.title} — ${chapTitle}`,
      issueNumber: String(chapterNumber),
      description: `${series.title} manga serisinin ${chapterNumber}. bölümünü ${siteName} üzerinde ücretsiz ve Türkçe oku.`,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'ComicSeries',
        name: series.title,
        url: `${BASE_URL}/series/${slug}`,
      },
      publisher: { '@type': 'Organization', name: siteName, url: BASE_URL },
      image: coverUrl,
    };

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: series.title, item: `${BASE_URL}/series/${slug}` },
        { '@type': 'ListItem', position: 3, name: `Bölüm ${chapterNumber}`, item: canonicalUrl },
      ],
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(chapterJsonLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      </>
    );
  } catch {
    return null;
  }
}

export default async function BolumLayout({ children, params }) {
  return (
    <>
      <BolumJsonLd params={params} />
      {children}
    </>
  );
}