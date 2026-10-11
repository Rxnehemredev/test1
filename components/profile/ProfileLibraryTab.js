import React from 'react';
import Link from 'next/link';
import SeriesCard from '@/components/SeriesCard';

export default function ProfileLibraryTab({
    favoritesView,
    setFavoritesView,
    favorites,
    readingList,
    loadingFavs,
    loadingReadingList,
    removeFromReadingList,
}) {
    return (
        <div>
            {/* Library / Reading List Sub-tabs */}
            <div className="reading-list-tabs" style={{ marginBottom: 20 }}>
                <button
                    className={`reading-list-tab ${favoritesView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('favorites')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    Kütüphanem ({favorites.length})
                </button>
                <button
                    className={`reading-list-tab ${favoritesView === 'all' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('all')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Listem ({readingList.length})
                </button>
                <button
                    className={`reading-list-tab ${favoritesView === 'reading' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('reading')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    Okuyor ({readingList.filter(i => i.status === 'reading').length})
                </button>
                <button
                    className={`reading-list-tab ${favoritesView === 'completed' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('completed')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Tamamlandı ({readingList.filter(i => i.status === 'completed').length})
                </button>
                <button
                    className={`reading-list-tab ${favoritesView === 'plan' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('plan')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Okuyacak ({readingList.filter(i => i.status === 'plan').length})
                </button>
                <button
                    className={`reading-list-tab ${favoritesView === 'dropped' ? 'active' : ''}`}
                    onClick={() => setFavoritesView('dropped')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Bırakıldı ({readingList.filter(i => i.status === 'dropped').length})
                </button>
            </div>

            {favoritesView === 'favorites' && (
                loadingFavs ? (
                    <div className="series-grid">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/5' }} />)}</div>
                ) : favorites.length === 0 ? (
                    <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Kütüphaneniz boş</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>Herhangi bir manga sayfasındaki kalp simgesine tıklayarak kütüphanenize seriler ekleyebilirsiniz.</p>
                        <Link href="/seri" className="btn btn-primary btn-sm">Mangalara Göz At</Link>
                    </div>
                ) : (
                    <div className="series-grid">
                        {favorites.map(s => <SeriesCard key={s.id} series={s} />)}
                    </div>
                )
            )}

            {['all', 'reading', 'completed', 'plan', 'dropped'].includes(favoritesView) && (
                loadingReadingList ? (
                    <div className="series-grid">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/5' }} />)}</div>
                ) : (() => {
                    const filtered = favoritesView === 'all' ? readingList : readingList.filter(i => i.status === favoritesView);
                    if (filtered.length === 0) return (
                        <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Bu kategoride seri bulunmuyor</p>
                            <Link href="/seri" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Mangalara Göz At</Link>
                        </div>
                    );
                    return (
                        <div className="series-grid">
                            {filtered.map(item => (
                                <div key={item.id} style={{ position: 'relative' }}>
                                    <Link href={`/seri/${item.slug || item.series_id}`}>
                                        <div style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <img src={item.cover_image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%231a1a2e'/%3E%3Ctext x='150' y='210' text-anchor='middle' fill='%23555' font-size='48'%3EManga%3C/text%3E%3C/svg%3E"} alt={item.title} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} decoding="async" />
                                            <div style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                                {item.last_read_chapter && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Son okunan: Bölüm {item.last_read_chapter}</div>
                                                )}
                                                {item.latest_chapter && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Son bölüm: Bölüm {item.latest_chapter}</div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                    <button onClick={() => removeFromReadingList(item.series_id)}
                                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                                        title="Listeden kaldır">✕</button>
                                </div>
                            ))}
                        </div>
                    );
                })()
            )}
        </div>
    );
}
