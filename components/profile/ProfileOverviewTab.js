import React from 'react';

function QuestIcon({ icon, size = 18 }) {
    if (icon === 'sun') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    );
    if (icon === 'book') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
    );
    if (icon === 'chat') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    );
    if (icon === 'pen') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
    );
    if (icon === 'star') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    );
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    );
}

function CheckCircleIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    );
}

export default function ProfileOverviewTab({
    readingHistory,
    loadingHistory,
    quests,
    pointsName,
    claimQuest,
    claimingQuest,
}) {
    return (
        <div className="admin-grid">
            {/* Okuma Geçmişi Kartı */}
            <div className="admin-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Okuma Geçmişi
                    </span>
                    <a href="/gecmis" style={{ fontSize: '0.7rem', color: 'var(--accent-light)', fontWeight: 500 }}>Tümünü gör →</a>
                </h3>
                {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" /></div>
                ) : readingHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {readingHistory.slice(0, 5).map(item => (
                            <a key={item.chapter_id || item.series_id} href={`/read/${item.chapter_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}>
                                <img
                                    src={item.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='40'%3E%3Crect width='28' height='40' fill='%231a1a2e'/%3E%3C/svg%3E"}
                                    alt={item.series_title || ''}
                                    style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
                                    loading="lazy" decoding="async" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.series_title || item.title}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bölüm {item.chapter_number}</div>
                                </div>
                            </a>
                        ))}
                        {readingHistory.length > 5 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 4 }}>
                                +{readingHistory.length - 5} daha fazla
                            </div>
                        )}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        Henüz okuma geçmişiniz yok. Manga okumaya başlayın!
                    </p>
                )}
            </div>

            {/* Daily Quests Card */}
            <div className="admin-card glass-panel">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    Günlük Görevler
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4, marginBottom: 8 }}>
                    {pointsName} kazanmak için görevleri tamamlayın! Bölüm okuyarak, yorum yaparak ve sitede vakit geçirerek puan kazanabilirsiniz.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'rgba(94,114,228,0.08)', borderRadius: 10, border: '1px solid rgba(94,114,228,0.2)', lineHeight: 1.5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 4, verticalAlign: '-2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong style={{ color: 'var(--accent-light)' }}>İpucu:</strong> Sitede her geçirilen dakika için {pointsName} kazanabilirsiniz. Sitede kalın, puan kazanın!
                </div>
                <div className="quest-board">
                    {quests.map(q => (
                        <div key={q.id} className={`quest-card ${q.claimed ? 'completed' : ''}`}>
                            <div className="quest-icon" style={{ background: q.claimed ? undefined : 'var(--bg-tertiary)', color: q.claimed ? undefined : 'var(--text-muted)' }}>
                                {q.claimed ? <CheckCircleIcon /> : <QuestIcon icon={q.icon} />}
                            </div>
                            <div className="quest-info">
                                <div className="quest-title">{q.title}</div>
                                <div className="quest-desc">{q.desc}</div>
                                <div className="quest-progress">
                                    <div className="quest-progress-fill" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                                </div>
                                <div className="quest-progress-text">{q.progress}/{q.target}</div>
                            </div>
                            <div className="quest-reward-wrap">
                                <span className="quest-reward">+{q.reward} {pointsName}</span>
                                {q.completed && !q.claimed ? (
                                    <button className="quest-claim-btn" onClick={() => claimQuest(q.id)} disabled={claimingQuest === q.id}>
                                        {claimingQuest === q.id ? '...' : 'Ödülü Al'}
                                    </button>
                                ) : q.claimed ? (
                                    <span className="quest-claimed-text">Alındı</span>
                                ) : null}
                            </div>
                        </div>
                    ))}
                    {quests.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Görevler yükleniyor...</p>}
                </div>
            </div>
        </div>
    );
}
