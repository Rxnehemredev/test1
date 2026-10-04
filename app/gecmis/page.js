'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

function timeAgo(d) {
    if (!d) return '';
    const utcStr = typeof d === 'string' && !d.endsWith('Z') ? d + 'Z' : d;
    const m = Math.floor((Date.now() - new Date(utcStr).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} sa önce`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days} gün önce`;
    return `${Math.floor(days / 30)} ay önce`;
}

export default function ReadingHistoryPage() {
    const { user, loading, authFetch } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [clearingAll, setClearingAll] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        fetchHistory();
    }, [user]);

    async function fetchHistory() {
        setFetching(true);
        try {
            const res = await authFetch('/api/users/reading-history');
            const data = await res.json();
            setHistory(data.history || []);
        } catch {}
        setFetching(false);
    }

    async function deleteSeries(seriesId) {
        if (!confirm('Bu seriyi okuma geçmişinden kaldırmak istiyor musunuz?')) return;
        setDeletingId(seriesId);
        try {
            await authFetch(`/api/users/reading-history?seriesId=${seriesId}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.series_id !== seriesId));
        } catch {}
        setDeletingId(null);
    }

    async function clearAll() {
        if (!confirm('Tüm okuma geçmişinizi silmek istediğinize emin misiniz?')) return;
        setClearingAll(true);
        try {
            await authFetch('/api/users/reading-history', { method: 'DELETE' });
            setHistory([]);
        } catch {}
        setClearingAll(false);
    }

    if (loading || (!user && !loading)) return null;

    return (
        <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 48px' }}>
            <style>{`
                .gh-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 16px;
                    border-radius: 14px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    transition: border-color 0.22s ease, background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
                    overflow: hidden;
                }
                .gh-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 20% 50%, rgba(var(--accent-rgb,94,114,228),0.06) 0%, transparent 60%);
                    pointer-events: none;
                    border-radius: inherit;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                .gh-card:hover {
                    border-color: rgba(var(--accent-rgb,94,114,228),0.25);
                    background: rgba(255,255,255,0.07);
                    transform: translateX(3px);
                    box-shadow: 0 6px 24px rgba(0,0,0,0.2);
                }
                .gh-card:hover::before { opacity: 1; }
                .gh-cover-link {
                    flex-shrink: 0;
                    display: block;
                    position: relative;
                    border-radius: 9px;
                    overflow: hidden;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                }
                .gh-cover-link img {
                    width: 54px;
                    height: 76px;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.3s ease;
                }
                .gh-card:hover .gh-cover-link img { transform: scale(1.06); }
                .gh-new-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--accent);
                    color: #fff;
                    border-radius: 10px;
                    font-size: 0.55rem;
                    font-weight: 900;
                    padding: 2px 5px;
                    line-height: 1.2;
                    letter-spacing: 0.02em;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    border: 1.5px solid rgba(0,0,0,0.2);
                }
                .gh-info { flex: 1; min-width: 0; }
                .gh-title {
                    font-weight: 700;
                    font-size: 0.93rem;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 4px;
                    text-decoration: none;
                    display: block;
                    transition: color 0.15s;
                }
                .gh-title:hover { color: var(--accent); }
                .gh-chapter {
                    font-size: 0.76rem;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .gh-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .gh-btn-new {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: rgba(var(--accent-rgb,94,114,228),0.1);
                    color: var(--accent);
                    border: 1px solid rgba(var(--accent-rgb,94,114,228),0.22);
                    border-radius: 6px;
                    padding: 3px 9px;
                    font-size: 0.71rem;
                    font-weight: 700;
                    text-decoration: none;
                    transition: background 0.15s, border-color 0.15s;
                }
                .gh-btn-new:hover {
                    background: rgba(var(--accent-rgb,94,114,228),0.18);
                    border-color: rgba(var(--accent-rgb,94,114,228),0.4);
                }
                .gh-btn-continue {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: var(--accent);
                    color: #fff;
                    border-radius: 6px;
                    padding: 4px 12px;
                    font-size: 0.73rem;
                    font-weight: 700;
                    text-decoration: none;
                    transition: opacity 0.15s, transform 0.15s;
                    box-shadow: 0 3px 10px rgba(var(--accent-rgb,94,114,228),0.3);
                }
                .gh-btn-continue:hover { opacity: 0.88; transform: translateY(-1px); }
                .gh-time {
                    font-size: 0.68rem;
                    color: var(--text-muted);
                    opacity: 0.75;
                }
                .gh-del-btn {
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 7px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    transition: color 0.15s, background 0.15s;
                    opacity: 0.6;
                }
                .gh-del-btn:hover {
                    color: var(--danger, #ef4444);
                    background: rgba(239,68,68,0.1);
                    opacity: 1;
                }
                .gh-del-btn:disabled { cursor: not-allowed; opacity: 0.3; }
                /* Skeleton */
                .gh-skel {
                    height: 92px;
                    border-radius: 14px;
                    background: linear-gradient(90deg, var(--bg-card) 25%, rgba(255,255,255,0.04) 50%, var(--bg-card) 75%);
                    background-size: 200% 100%;
                    animation: ghSkelShimmer 1.4s infinite linear;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                @keyframes ghSkelShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @media (max-width: 480px) {
                    .gh-card { padding: 10px 12px; gap: 10px; border-radius: 12px; }
                    .gh-card:hover { transform: none; box-shadow: none; }
                    .gh-cover-link img { width: 46px; height: 65px; }
                    .gh-title { font-size: 0.86rem; }
                    .gh-chapter { font-size: 0.72rem; }
                    .gh-actions { gap: 6px; }
                    .gh-btn-continue { padding: 4px 10px; font-size: 0.7rem; }
                }
            `}</style>

            {/* Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.15s' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        Profil
                    </Link>
                    <span style={{ color: 'var(--border-color)' }}>/</span>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Okuma Geçmişi
                    </h1>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={clearAll}
                        disabled={clearingAll}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: clearingAll ? 'not-allowed' : 'pointer', opacity: clearingAll ? 0.6 : 1, transition: 'all 0.2s', backdropFilter: 'blur(6px)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        {clearingAll ? 'Siliniyor...' : 'Tümünü Sil'}
                    </button>
                )}
            </div>

            {/* İçerik */}
            {fetching ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="gh-skel" />
                    ))}
                </div>
            ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', backdropFilter: 'blur(8px)' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Henüz okuma geçmişi yok</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>Manga okumaya başladığınızda burada görünecek.</p>
                    <Link href="/seri" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: 9, textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(var(--accent-rgb,94,114,228),0.35)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Serilere Göz At
                    </Link>
                </div>
            ) : (
                <>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {history.length} seri takip ediliyor
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {history.map(item => {
                            const hasNew = item.latest_chapter && item.chapter_number < item.latest_chapter;
                            const newCount = hasNew ? Math.floor(item.latest_chapter - item.chapter_number) : 0;
                            return (
                                <div key={item.series_id} className="gh-card">
                                    {/* Kapak */}
                                    <Link href={`/seri/${item.slug || item.series_id}`} className="gh-cover-link">
                                        <img
                                            src={item.cover_url || '/demo/cover1.jpg'}
                                            alt={item.series_title} decoding="async" />
                                        {hasNew && (
                                            <span className="gh-new-badge">+{newCount}</span>
                                        )}
                                    </Link>

                                    {/* Bilgi */}
                                    <div className="gh-info">
                                        <Link href={`/seri/${item.slug || item.series_id}`} className="gh-title">
                                            {item.series_title}
                                        </Link>
                                        <div className="gh-chapter">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                            Bölüm {item.chapter_number}
                                            {item.chapter_title && ` — ${item.chapter_title}`}
                                        </div>
                                        <div className="gh-actions">
                                            {hasNew && (
                                                <Link href={`/seri/${item.slug || item.series_id}`} className="gh-btn-new">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                                    {newCount} yeni
                                                </Link>
                                            )}
                                            <Link href={`/read/${item.chapter_id}`} className="gh-btn-continue">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                Devam Et
                                            </Link>
                                            <span className="gh-time">{timeAgo(item.updated_at)}</span>
                                        </div>
                                    </div>

                                    {/* Sil butonu */}
                                    <button
                                        onClick={() => deleteSeries(item.series_id)}
                                        disabled={deletingId === item.series_id}
                                        title="Geçmişten kaldır"
                                        className="gh-del-btn"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}