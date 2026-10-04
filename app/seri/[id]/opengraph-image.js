/**
 * /seri/[id]/opengraph-image.js
 *
 * /seri/[id] rotası için dinamik Open Graph görseli üretici.
 * Next.js runtime/contentType/size re-export ile tanımadığından
 * /series/[id]/opengraph-image.js içeriği burada doğrudan tanımlanmıştır.
 */
import { ImageResponse } from 'next/og';
import { getDb } from '@/lib/db';
import { fetchImageAsDataUri } from '@/lib/og-image-fetch';
import { readFile } from 'fs/promises';
import path from 'path';

let LOGO_DATA_URI = null;
async function getLogoDataUri() {
    if (LOGO_DATA_URI) return LOGO_DATA_URI;
    try {
        const buf = await readFile(path.join(process.cwd(), 'public', 'icon-512.png'));
        LOGO_DATA_URI = `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
        LOGO_DATA_URI = null;
    }
    return LOGO_DATA_URI;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function Image({ params }) {
    const { id } = await params;

    let title = 'Asteria Scans';
    let description = 'Read manga online with AI translation.';
    let coverUrl = null;
    let genres = [];
    let status = '';
    let type = '';

    try {
        const db = await getDb();
        const isNumeric = /^\d+$/.test(id);
        const series = isNumeric
            ? await db.prepare('SELECT title, description, cover_url, genres, status, type, rating FROM series WHERE id = ? AND published = 1').get(id)
            : await db.prepare('SELECT title, description, cover_url, genres, status, type, rating FROM series WHERE slug = ? AND published = 1').get(id);

        if (series) {
            title = series.title || title;
            description = series.description
                ? series.description.slice(0, 120) + (series.description.length > 120 ? '…' : '')
                : description;
            if (series.cover_url) {
                if (series.cover_url.startsWith('http')) {
                    coverUrl = series.cover_url;
                } else {
                    const rel = series.cover_url.startsWith('/') ? series.cover_url : `/${series.cover_url}`;
                    coverUrl = `${BASE_URL}${rel}`;
                }
            }
            genres = series.genres
                ? (() => { try { return JSON.parse(series.genres).slice(0, 3); } catch { return series.genres.split(',').slice(0, 3).map(g => g.trim()); } })()
                : [];
            status = series.status || '';
            type = series.type ? series.type.toUpperCase() : '';
        }
    } catch { }

    if (coverUrl) {
        const dataUri = await fetchImageAsDataUri(coverUrl);
        coverUrl = dataUri;
    }
    const logoDataUri = await getLogoDataUri();

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    width: '1200px',
                    height: '630px',
                    background: '#0f0f14',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Background gradient */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f14 50%, #1a0a0a 100%)',
                        display: 'flex',
                    }}
                />

                {/* Cover image background */}
                {coverUrl && (
                    <div
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: '420px',
                            height: '630px',
                            display: 'flex',
                        }}
                    >
                        <img
                            src={coverUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.35,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to right, #0f0f14 0%, transparent 60%)',
                                display: 'flex',
                            }}
                        />
                    </div>
                )}

                {/* Cover thumb */}
                {coverUrl && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 60,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '160px',
                            height: '225px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            border: '2px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                        }}
                    >
                        <img
                            src={coverUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                )}

                {/* Content */}
                <div
                    style={{
                        position: 'absolute',
                        left: coverUrl ? '260px' : '60px',
                        top: 0,
                        bottom: 0,
                        right: '60px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '40px 0',
                    }}
                >
                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        {logoDataUri && <img src={logoDataUri} width="28" height="28" style={{ objectFit: 'contain' }} />}
                        <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
                            ASTERIA SCANS
                        </span>
                    </div>

                    {/* Type + Status badges */}
                    {(type || status) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {type && (
                                <span style={{ background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.4)', borderRadius: '4px', padding: '3px 10px', fontSize: '12px', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.08em', display: 'flex' }}>
                                    {type}
                                </span>
                            )}
                            {status && (
                                <span style={{ background: status === 'ongoing' ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.15)', border: `1px solid ${status === 'ongoing' ? 'rgba(52,211,153,0.4)' : 'rgba(148,163,184,0.3)'}`, borderRadius: '4px', padding: '3px 10px', fontSize: '12px', color: status === 'ongoing' ? '#34d399' : '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', display: 'flex' }}>
                                    {status === 'ongoing' ? 'ONGOING' : 'COMPLETED'}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Title */}
                    <div style={{ fontSize: title.length > 30 ? '36px' : '48px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1, marginBottom: '16px', maxWidth: '700px' }}>
                        {title}
                    </div>

                    {/* Description */}
                    {description && (
                        <div style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.5, maxWidth: '650px', marginBottom: '20px' }}>
                            {description}
                        </div>
                    )}

                    {/* Genres */}
                    {genres.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {genres.map((g, i) => (
                                <span key={i} style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '4px', padding: '3px 10px', fontSize: '12px', color: '#fca5a5', display: 'flex' }}>
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom bar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(to right, #dc2626, #818cf8, #34d399)',
                        display: 'flex',
                    }}
                />
            </div>
        ),
        { ...size }
    );
}
