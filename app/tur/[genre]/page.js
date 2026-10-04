import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { resolveGenreBySlug } from '@/lib/genreSlug';
import Breadcrumb from '@/components/Breadcrumb';
import SeriesCard from '@/components/SeriesCard';

// Tür/kategori SEO sayfaları: /tur/aksiyon, /tur/bilim-kurgu vb.
// Bkz. DEVAM-NOTU.md "Sırada ne var — 2". Amaç: Google'ın "aksiyon manga oku"
// gibi tür bazlı aramalar için indeksleyebileceği, ilk yanıtta dolu içerik
// içeren, gerçek linklerle bağlı statik-benzer sayfalar. Var olan
// `/series?genre=Action` filtresi tamamen client-side ve JS olmadan boş
// döndüğü için bu amaca hizmet etmiyordu — o sayfa interaktif filtreleme
// için olduğu gibi kalıyor, bu yeni route SEO girişi.
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';
const PAGE_SIZE = 24;

async function loadGenrePage(genreSlug, pageNum) {
    const db = await getDb();
    const genre = await resolveGenreBySlug(db, genreSlug);
    if (!genre) return { notFound: true };

    const offset = (pageNum - 1) * PAGE_SIZE;
    const likeParam = `%"${genre.name}"%`;

    const totalRow = await db.prepare(
        'SELECT COUNT(*) as cnt FROM series WHERE published = 1 AND genres LIKE ?'
    ).get(likeParam);
    const total = totalRow?.cnt || 0;

    const series = await db.prepare(`
        SELECT id, title, slug, cover_url, genres, status, type, rating, views, is_adult,
            (SELECT COUNT(*) FROM chapters c WHERE c.series_id = s.id) as chapter_count
        FROM series s
        WHERE published = 1 AND genres LIKE ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    `).all(likeParam, PAGE_SIZE, offset);

    return { genre, series, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function generateMetadata({ params, searchParams }) {
    const { genre: genreSlug } = await params;
    const sp = await searchParams;
    const pageNum = Math.max(1, parseInt(sp?.sayfa || '1', 10) || 1);

    const db = await getDb();
    const genre = await resolveGenreBySlug(db, genreSlug);

    if (!genre) {
        return { title: 'Tür Bulunamadı | Asteria Scans', robots: { index: false } };
    }

    // Sayfa 1: SEO'nun hedeflediği ana sayfa — normal title/description.
    // Sayfa 2+: Aynı title/description ile ayrı bir "sayfa" olarak indexlenmesin diye
    // hem başlığa sayfa numarası eklenir hem de noindex + canonical page-1'e işaret eder.
    // (bkz. app/series/layout.js — aynı pattern orada da uygulanıyor)
    const baseTitle = `${genre.name_tr} Manga ve Manhwa Oku | Asteria Scans`;
    const title = pageNum > 1 ? `${genre.name_tr} Manga ve Manhwa Oku — Sayfa ${pageNum} | Asteria Scans` : baseTitle;
    const description = pageNum > 1
        ? `${genre.name_tr} türündeki manga, manhwa ve manhua serileri — sayfa ${pageNum}. Asteria Scans'da Türkçe ve ücretsiz oku.`
        : `${genre.name_tr} türündeki manga, manhwa ve manhua serilerini Asteria Scans'da Türkçe ve ücretsiz oku. Güncel bölümler, günlük yenilenen liste.`;
    const canonicalUrl = `${BASE_URL}/tur/${genreSlug}`;

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        openGraph: { title, description, url: canonicalUrl, siteName: 'Asteria Scans', locale: 'tr_TR', type: 'website' },
        twitter: { card: 'summary', title, description },
        robots: pageNum > 1
            ? { index: false, follow: true }
            : { index: true, follow: true },
    };
}

export default async function GenrePage({ params, searchParams }) {
    const { genre: genreSlug } = await params;
    const sp = await searchParams;
    const pageNum = Math.max(1, parseInt(sp?.sayfa || '1', 10) || 1);

    const result = await loadGenrePage(genreSlug, pageNum);
    if (result.notFound) notFound();

    const { genre, series, total, totalPages } = result;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${genre.name_tr} Manga ve Manhwa`,
        url: `${BASE_URL}/tur/${genreSlug}`,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
                { '@type': 'ListItem', position: 2, name: 'Seriler', item: `${BASE_URL}/series` },
                { '@type': 'ListItem', position: 3, name: genre.name_tr, item: `${BASE_URL}/tur/${genreSlug}` },
            ],
        },
    };

    return (
        <div className="page-container page-section fade-in">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <Breadcrumb items={[
                { label: 'Ana Sayfa', href: '/' },
                { label: 'Seriler', href: '/series' },
                { label: genre.name_tr },
            ]} />

            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0 4px' }}>
                {genre.name_tr} Manga ve Manhwa
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                {total} seri bulundu — {genre.name_tr} türünde en yeni bölümler ve güncel liste.
            </p>

            {series.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <p>Bu türde henüz seri eklenmemiş.</p>
                </div>
            ) : (
                <div className="sc2-grid">
                    {series.map((s, i) => (
                        <SeriesCard key={s.id} series={s} priority={i < 3} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <nav aria-label="Sayfalar" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
                    {pageNum > 1 && (
                        <Link href={`/tur/${genreSlug}${pageNum - 1 > 1 ? `?sayfa=${pageNum - 1}` : ''}`} className="btn btn-secondary" style={{ minWidth: 40, textAlign: 'center' }}>
                            ‹
                        </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((n) => n === 1 || n === totalPages || Math.abs(n - pageNum) <= 2)
                        .reduce((acc, n, idx, arr) => {
                            if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                            acc.push(n);
                            return acc;
                        }, [])
                        .map((n, i) => n === '…' ? (
                            <span key={`gap-${i}`} style={{ padding: '6px 4px', color: 'var(--text-muted)' }}>…</span>
                        ) : (
                            <Link
                                key={n}
                                href={`/tur/${genreSlug}${n > 1 ? `?sayfa=${n}` : ''}`}
                                className={n === pageNum ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ minWidth: 40, textAlign: 'center' }}
                            >
                                {n}
                            </Link>
                        ))}
                    {pageNum < totalPages && (
                        <Link href={`/tur/${genreSlug}?sayfa=${pageNum + 1}`} className="btn btn-secondary" style={{ minWidth: 40, textAlign: 'center' }}>
                            ›
                        </Link>
                    )}
                </nav>
            )}
        </div>
    );
}
