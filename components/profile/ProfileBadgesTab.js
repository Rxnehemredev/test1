import React from 'react';
import BadgeIcon from '@/components/BadgeIcon';

const iconSvg = {
    book:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    chat:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    heart: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    sun:   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    star:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    crown: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 19h20l-2-10-5 5-3-8-3 8-5-5L2 19z"/><rect x="2" y="20" width="20" height="2" rx="1"/></svg>,
    check: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    moon:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    coin:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1M9.07 9.07A3 3 0 0 1 12 8a3 3 0 0 1 3 3c0 1.5-1 2.5-3 3s-3 1.5-3 3a3 3 0 0 0 3 3 3 3 0 0 0 2.93-2"/></svg>,
};

export default function ProfileBadgesTab({
    customBadges,
    badges,
    loadingBadges,
}) {
    return (
        <div>
            {/* ── Admin-assigned / Custom Badges Section ── */}
            {customBadges.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Özel Rozetler
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>— Yönetici tarafından verildi</span>
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {customBadges.map(b => (
                            <div key={b.id} style={{
                                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                padding: '14px 18px', borderRadius: 12,
                                background: `${b.color}14`,
                                border: `1px solid ${b.color}44`,
                                minWidth: 90, textAlign: 'center',
                                position: 'relative',
                            }}>
                                {b.is_new && <div className="badge-new-dot" />}
                                <span style={{ fontSize: '2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: b.color }}><BadgeIcon name={b.icon} size={32} color={b.color} /></span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: b.color }}>{b.label}</span>
                                {b.earned_at && (
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                        {new Date(b.earned_at).toLocaleDateString('tr-TR')}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Achievement Badges Section ── */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                Başarı Rozetleri
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                Bölümleri okuyarak, yorum yazarak ve serileri tamamlayarak rozetler kazanın.
            </p>
            {loadingBadges ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : (
                <div className="badges-grid">
                    {badges.map(b => {
                        return (
                            <div key={b.id} className={`badge-card glass-panel ${b.earned ? 'earned' : 'locked'}`} title={b.description}>
                                {b.is_new && <div className="badge-new-dot" />}
                                <div className="badge-card-icon" style={{ color: b.earned ? b.color : 'var(--text-muted)', filter: b.earned ? 'none' : 'grayscale(1)', opacity: b.earned ? 1 : 0.4 }}>
                                    {iconSvg[b.icon] || <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>}
                                </div>
                                <div className="badge-card-name" style={{ color: b.earned ? b.color : 'var(--text-muted)' }}>{b.name}</div>
                                <div className="badge-card-desc">{b.description}</div>
                                {b.earned && b.earned_at && (
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {new Date(b.earned_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
