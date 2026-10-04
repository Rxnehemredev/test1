// /etiket/[slug] — Etiket (tag) sayfası
// ragnarscans.net/tag/[...] ile aynı mantık:
// Her etiket ayrı bir URL → ayrı bir indexlenmiş sayfa → ek keyword hedefleme.
// "manga oku", "türkçe webtoon", "merlinscans" gibi aramaları yakalamak için.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const db = await getDb();
    const tag = await db.prepare('SELECT * FROM blog_tags WHERE slug = ?').get(slug);
    if (!tag) return { title: 'Etiket Bulunamadı | Asteria Scans' };

    const title = `${tag.name} — Asteria Scans Blog`;
    const description = `"${tag.name}" etiketiyle ilgili manga, manhwa ve webtoon yazıları. Asteria Scans'da ücretsiz oku.`;
    return {
        title,
        description,
        alternates: { canonical: `${BASE_URL}/etiket/${slug}` },
        openGraph: { title, description, url: `${BASE_URL}/etiket/${slug}`, siteName: 'Asteria Scans' },
        robots: { index: true, follow: true },
    };
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr);
    const normalized = raw.includes('T') ? (raw.endsWith('Z') ? raw : raw + 'Z') : raw.replace(' ', 'T') + 'Z';
    const diff = (Date.now() - new Date(normalized).getTime()) / 1000;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(normalized).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function TagPage({ params }) {
    const { slug } = await params;
    const db = await getDb();

    const tag = await db.prepare('SELECT * FROM blog_tags WHERE slug = ?').get(slug);
    if (!tag) notFound();

    const blogs = await db.prepare(`
        SELECT b.id, b.title, b.slug, b.excerpt, b.cover_url, b.created_at,
               s.title as series_title, s.slug as series_slug
        FROM blogs b
        JOIN blog_tag_map m ON m.blog_id = b.id
        LEFT JOIN series s ON b.series_id = s.id
        WHERE m.tag_id = ? AND b.status = 'published'
        ORDER BY b.created_at DESC
        LIMIT 50
    `).all(tag.id);

    // İlgili etiketler (aynı bloglarda geçen diğer etiketler)
    const relatedTags = blogs.length > 0 ? await db.prepare(`
        SELECT DISTINCT t.name, t.slug, COUNT(*) as c
        FROM blog_tags t
        JOIN blog_tag_map m ON m.tag_id = t.id
        WHERE m.blog_id IN (${blogs.map(() => '?').join(',')})
          AND t.slug != ?
        GROUP BY t.id
        ORDER BY c DESC
        LIMIT 12
    `).all(...blogs.map(b => b.id), slug) : [];

    return (
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 20px 80px' }}>
            <Breadcrumb items={[
                { label: 'Ana Sayfa', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: tag.name },
            ]} />

            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        padding: '4px 14px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                    }}>Etiket</span>
                    <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{tag.name}</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    {blogs.length} yazı bulundu
                </p>
            </div>

            {/* İlgili etiketler */}
            {relatedTags.length > 0 && (
                <div style={{ marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {relatedTags.map(t => (
                        <Link
                            key={t.slug}
                            href={`/etiket/${t.slug}`}
                            style={{
                                padding: '4px 12px',
                                borderRadius: 14,
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                border: '1px solid var(--border)',
                            }}
                        >
                            {t.name}
                        </Link>
                    ))}
                </div>
            )}

            {blogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                    Bu etikette henüz yazı yok.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {blogs.map(b => (
                        <Link
                            key={b.id}
                            href={`/blog/${b.slug}`}
                            className="glass-panel"
                            style={{
                                display: 'flex', flexDirection: 'column', textDecoration: 'none',
                                color: 'inherit', borderRadius: 14, overflow: 'hidden',
                            }}
                        >
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                {b.cover_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={b.cover_url} alt={b.title} loading="lazy" decoding="async"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(b.created_at)}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
