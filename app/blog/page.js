import Link from 'next/link';
import { getDb } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';
const PAGE_SIZE = 12;

export async function generateMetadata({ searchParams }) {
    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1);
    const title = page > 1 ? `Bloglar — Sayfa ${page} | Asteria Scans` : 'Bloglar | Asteria Scans';
    const baseDescription = 'Asteria Scans\'da yayınlanan yeni manga, manhwa, manhua ve romanlar hakkında tanıtım yazıları, öneriler ve haberler.';
    // Sayfa 2+ aynı description ile indexlenirse Google/Ahrefs bunu duplicate content
    // olarak işaretler (bkz. series/layout.js ve tur/[genre]/page.js — aynı pattern).
    const description = page > 1 ? `${baseDescription} (Sayfa ${page})` : baseDescription;
    return {
        title,
        description,
        alternates: { canonical: `${BASE_URL}/blog${page > 1 ? `?page=${page}` : ''}` },
        openGraph: { title, description, url: `${BASE_URL}/blog`, siteName: 'Asteria Scans', type: 'website' },
        robots: page > 1
            ? { index: false, follow: true }
            : { index: true, follow: true },
    };
}

function timeAgoStatic(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr);
    const normalized = raw.includes('T') ? (raw.endsWith('Z') ? raw : raw + 'Z') : raw.replace(' ', 'T') + 'Z';
    const diff = (Date.now() - new Date(normalized).getTime()) / 1000;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(normalized).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BlogListPage({ searchParams }) {
    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = await getDb();
    const blogs = await db.prepare(`
        SELECT b.id, b.title, b.slug, b.excerpt, b.cover_url, b.created_at,
               s.slug as series_slug, s.title as series_title, s.type as series_type
        FROM blogs b
        LEFT JOIN series s ON b.series_id = s.id
        WHERE b.status = 'published'
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
    `).all(PAGE_SIZE, offset);

    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM blogs WHERE status = 'published'`).get();
    const totalPages = Math.max(1, Math.ceil((totalRow?.c || 0) / PAGE_SIZE));

    return (
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 20px 80px' }}>
            <Breadcrumb items={[
                { label: 'Ana Sayfa', href: '/' },
                { label: 'Bloglar' },
            ]} />
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: 8 }}>Bloglar</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Sitemize eklenen serilerle ilgili tanıtım yazıları, öneriler ve haberler.
                </p>
            </div>

            {blogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                    Henüz blog yazısı yok.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {blogs.map(b => (
                        <Link
                            key={b.id}
                            href={`/blog/${b.slug}`}
                            className="glass-panel"
                            style={{
                                display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit',
                                borderRadius: 14, overflow: 'hidden', transition: 'transform 0.15s ease',
                            }}
                        >
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                {b.cover_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={b.cover_url} alt={b.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Görsel yok</div>
                                )}
                            </div>
                            <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                {b.series_title && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                                        {b.series_title}
                                    </span>
                                )}
                                <h2 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>{b.title}</h2>
                                {b.excerpt && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>
                                        {b.excerpt.length > 120 ? b.excerpt.slice(0, 120) + '…' : b.excerpt}
                                    </p>
                                )}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgoStatic(b.created_at)}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                    {page > 1 && (
                        <Link href={`/blog?page=${page - 1}`} className="btn btn-secondary" style={{ padding: '8px 18px' }}>‹ Önceki</Link>
                    )}
                    <span style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{page} / {totalPages}</span>
                    {page < totalPages && (
                        <Link href={`/blog?page=${page + 1}`} className="btn btn-secondary" style={{ padding: '8px 18px' }}>Sonraki ›</Link>
                    )}
                </div>
            )}
        </div>
    );
}
