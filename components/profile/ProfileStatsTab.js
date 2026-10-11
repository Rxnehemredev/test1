import React from 'react';
import Link from 'next/link';
import { GENRE_TR } from '@/lib/constants/genres';

function getGenreTranslation(genre) {
    if (!genre) return '';
    const keys = Object.keys(GENRE_TR);
    const matchedKey = keys.find(k => k.toLowerCase() === genre.toLowerCase());
    return matchedKey ? GENRE_TR[matchedKey] : genre;
}

export default function ProfileStatsTab({
    loadingStats,
    detailedStats,
    fetchDetailedStats,
}) {
    if (loadingStats) {
        return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>;
    }

    if (!detailedStats) {
        return (
            <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: 40 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>İstatistikler yüklenemedi. Lütfen tekrar deneyin.</p>
                <button className="btn btn-ghost btn-sm" onClick={fetchDetailedStats}>Tekrar Dene</button>
            </div>
        );
    }

    return (
        <div>
            {/* ── Stat Cards Grid ── */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>

                {/* Okunan Bölüm */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#c7d2fe' }}>{detailedStats.totalChapters}</div>
                    <div className="stat-card-label">Okunan Bölüm</div>
                </div>

                {/* Bu Hafta */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Haftalık</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#bbf7d0' }}>{detailedStats.thisWeek}</div>
                    <div className="stat-card-label">Bu Hafta</div>
                </div>

                {/* Bu Ay */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aylık</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#fde68a' }}>{detailedStats.thisMonth}</div>
                    <div className="stat-card-label">Bu Ay</div>
                </div>

                {/* Yorumlar */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))', border: '1px solid rgba(236,72,153,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#fbcfe8' }}>{detailedStats.totalComments}</div>
                    <div className="stat-card-label">Yorumlar</div>
                </div>

                {/* Tamamlandı */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))', border: '1px solid rgba(20,184,166,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(20,184,166,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liste</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#99f6e4' }}>{detailedStats.listStats.completed}</div>
                    <div className="stat-card-label">Tamamlandı</div>
                </div>

                {/* Okuyor */}
                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aktif</span>
                    </div>
                    <div className="stat-card-value" style={{ color: '#bfdbfe' }}>{detailedStats.listStats.reading}</div>
                    <div className="stat-card-label">Okuyor</div>
                </div>

                {/* En Çok Okunan Tür — tam genişlik, yeni tasarım */}
                {detailedStats.topGenre && (
                    <div style={{
                        gridColumn: '1 / -1',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 60%, rgba(139,92,246,0.06) 100%)',
                        border: '1px solid rgba(139,92,246,0.30)',
                        borderRadius: 14,
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        boxShadow: '0 4px 24px rgba(139,92,246,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Dekoratif arka plan efekti */}
                        <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        {/* İkon */}
                        <div style={{
                            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.30), rgba(99,102,241,0.20))',
                            border: '1px solid rgba(139,92,246,0.40)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#c4b5fd',
                            boxShadow: '0 4px 16px rgba(139,92,246,0.20)',
                        }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </div>

                        {/* Metin */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(196,181,253,0.7)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 6 }}>
                                En Çok Okunan Tür
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e9d5ff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                                {getGenreTranslation(detailedStats.topGenre)}
                            </div>
                            {detailedStats.topGenreCount != null && (
                                <div style={{ fontSize: '0.78rem', color: 'rgba(196,181,253,0.6)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                    {detailedStats.topGenreCount} bölüm okundu
                                </div>
                            )}
                        </div>

                        {/* Rozet */}
                        <div className="top-genre-badge" style={{
                            flexShrink: 0,
                            background: 'rgba(139,92,246,0.20)',
                            border: '1px solid rgba(139,92,246,0.35)',
                            borderRadius: 20, padding: '6px 14px',
                            fontSize: '0.72rem', fontWeight: 800,
                            color: '#c4b5fd', letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                        }}>
                            #1 Favori
                        </div>
                    </div>
                )}
            </div>

            {/* ── Aktivite Grafiği ── */}
            {detailedStats.dailyActivity.length > 0 && (
                <div style={{
                    marginBottom: 20,
                    padding: '22px 24px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.07) 100%)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Dekoratif orb */}
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Son 30 Günlük Aktivite</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(129,140,248,0.7)', marginTop: 2 }}>
                                    {detailedStats.dailyActivity.reduce((s, d) => s + d.count, 0)} bölüm okundu
                                </div>
                            </div>
                        </div>
                        {/* Aktif gün sayısı */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a5b4fc', lineHeight: 1 }}>
                                {detailedStats.dailyActivity.filter(d => d.count > 0).length}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(129,140,248,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Aktif Gün</div>
                        </div>
                    </div>

                    {/* Grafik */}
                    <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 2px' }}>
                        {(() => {
                            const max = Math.max(...detailedStats.dailyActivity.map(x => x.count), 1);
                            return detailedStats.dailyActivity.map((d, idx) => {
                                const pct = (d.count / max) * 100;
                                const isEmpty = d.count === 0;
                                const isToday = idx === detailedStats.dailyActivity.length - 1;
                                const isWeekBoundary = (detailedStats.dailyActivity.length - 1 - idx) % 7 === 0 && !isToday;
                                return (
                                    <div
                                        key={d.date}
                                        title={`${d.date}: ${d.count} bölüm`}
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            height: `${Math.max(pct, isEmpty ? 6 : 8)}%`,
                                            background: isEmpty
                                                ? 'rgba(99,102,241,0.10)'
                                                : isToday
                                                    ? 'linear-gradient(to top, #6366f1, #a5b4fc)'
                                                    : pct > 70
                                                        ? 'linear-gradient(to top, #6366f1, #8b5cf6)'
                                                        : pct > 40
                                                            ? 'rgba(99,102,241,0.65)'
                                                            : 'rgba(99,102,241,0.35)',
                                            borderRadius: '4px 4px 2px 2px',
                                            transition: 'all 0.25s ease',
                                            cursor: 'default',
                                            boxShadow: isToday ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                                            outline: isWeekBoundary ? '1px solid rgba(139,92,246,0.25)' : 'none',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isEmpty) e.currentTarget.style.opacity = '0.85';
                                            e.currentTarget.style.transform = 'scaleY(1.05)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.transform = '';
                                        }}
                                    />
                                );
                            });
                        })()}
                    </div>

                    {/* Hafta etiketleri */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.62rem', color: 'rgba(99,102,241,0.5)' }}>
                        <span>30 gün önce</span>
                        <span>3 hafta önce</span>
                        <span>2 hafta önce</span>
                        <span>1 hafta önce</span>
                        <span style={{ color: '#818cf8', fontWeight: 700 }}>Bugün</span>
                    </div>
                </div>
            )}

            {/* ── Son Aktiviteler ── */}
            {detailedStats.recentReads.length > 0 && (
                <div className="admin-card glass-panel" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Son Aktiviteler</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {detailedStats.recentReads.map((r, idx) => (
                            <Link key={r.id} href={`/read/${r.id}`} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px',
                                borderRadius: 8,
                                textDecoration: 'none',
                                background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                            >
                                <img
                                    src={r.cover_image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='48'%3E%3Crect width='36' height='48' fill='%231a1a2e'/%3E%3Ctext x='18' y='28' text-anchor='middle' fill='%23555' font-size='16'%3EIMG%3C/text%3E%3C/svg%3E"}
                                    alt={r.series_title}
                                    style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)', flexShrink: 0 }} decoding="async" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.series_title}</div>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                        Bölüm {r.chapter_number}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', flexShrink: 0, background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: 6 }}>
                                    {new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
