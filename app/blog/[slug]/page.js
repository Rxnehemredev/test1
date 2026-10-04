import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { sanitizeBlogHtml } from '@/lib/sanitize-html';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

async function getBlog(slug) {
    const db = await getDb();
    const blog = await db.prepare(`
        SELECT b.*, s.slug as series_slug, s.title as series_title, s.type as series_type
        FROM blogs b
        LEFT JOIN series s ON b.series_id = s.id
        WHERE b.slug = ? AND b.status = 'published'
    `).get(slug);
    if (!blog) return null;
    // Etiketleri de çek
    try {
        const tags = await db.prepare(`
            SELECT t.name, t.slug FROM blog_tags t
            JOIN blog_tag_map m ON m.tag_id = t.id
            WHERE m.blog_id = ?
            ORDER BY t.name
        `).all(blog.id);
        blog.tags = tags || [];
    } catch { blog.tags = []; }
    return blog;
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const blog = await getBlog(slug);
    if (!blog) {
        return { title: 'Blog Yazısı Bulunamadı | Asteria Scans', robots: { index: false } };
    }

    const description = blog.meta_description || blog.excerpt || `${blog.title} — Asteria Scans blog`;
    const coverUrl = blog.cover_url
        ? (blog.cover_url.startsWith('http') ? blog.cover_url : `${BASE_URL}${blog.cover_url.startsWith('/') ? '' : '/'}${blog.cover_url}`)
        : `${BASE_URL}/icon-512.png`;
    const canonicalUrl = `${BASE_URL}/blog/${blog.slug}`;

    return {
        title: `${blog.title} | Asteria Scans Blog`,
        description,
        alternates: { canonical: canonicalUrl },
        openGraph: {
            title: blog.title,
            description,
            url: canonicalUrl,
            siteName: 'Asteria Scans',
            type: 'article',
            publishedTime: blog.created_at,
            images: [{ url: coverUrl, width: 1200, height: 630, alt: blog.title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: blog.title,
            description,
            images: [coverUrl],
        },
        robots: { index: true, follow: true },
    };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr);
    const normalized = raw.includes('T') ? (raw.endsWith('Z') ? raw : raw + 'Z') : raw.replace(' ', 'T') + 'Z';
    return new Date(normalized).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogDetailPage({ params }) {
    const { slug } = await params;
    const blog = await getBlog(slug);
    if (!blog) notFound();

    const db = await getDb();
    db.prepare('UPDATE blogs SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(blog.id).catch(() => {});

    const related = await db.prepare(`
        SELECT id, title, slug, cover_url, created_at
        FROM blogs
        WHERE status = 'published' AND id != ?
        ORDER BY created_at DESC
        LIMIT 4
    `).all(blog.id);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.title,
        description: blog.meta_description || blog.excerpt || '',
        image: blog.cover_url ? [blog.cover_url] : undefined,
        datePublished: blog.created_at,
        author: { '@type': 'Organization', name: 'Asteria Scans' },
        publisher: { '@type': 'Organization', name: 'Asteria Scans' },
    };

    return (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
            {/* eslint-disable-next-line react/no-danger */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            <Breadcrumb items={[
                { label: 'Ana Sayfa', href: '/' },
                { label: 'Bloglar', href: '/blog' },
                { label: blog.title },
            ]} />

            {blog.cover_url && (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', marginBottom: 24, background: 'var(--bg-tertiary)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blog.cover_url} alt={blog.title} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            )}

            {blog.series_title && (
                <Link href={`/seri/${blog.series_slug || blog.series_id}`} style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textDecoration: 'none' }}>
                    {blog.series_title} serisini incele →
                </Link>
            )}

            <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>{blog.title}</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>{formatDate(blog.created_at)}</div>

            <div
                className="policy-content"
                style={{ fontSize: '1rem', lineHeight: 1.75, color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(blog.content) }}
            />

            {/* Etiketler */}
            {blog.tags && blog.tags.length > 0 && (
                <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>Etiketler:</span>
                    {blog.tags.map(t => (
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

            {blog.series_id && (
                <div className="glass-panel" style={{ marginTop: 40, padding: 20, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.92rem' }}><strong>{blog.series_title}</strong> hakkında konuşuyorduk — hemen okumaya başla.</span>
                    <Link href={`/seri/${blog.series_slug || blog.series_id}`} className="btn btn-primary" style={{ marginLeft: 'auto' }}>Seriye Git</Link>
                </div>
            )}

            {related.length > 0 && (
                <div style={{ marginTop: 56 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 18 }}>Diğer Bloglar</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        {related.map(r => (
                            <Link key={r.id} href={`/blog/${r.slug}`} className="glass-panel" style={{ borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
                                    {r.cover_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.cover_url} alt={r.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                </div>
                                <div style={{ padding: 12, fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4 }}>{r.title}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
