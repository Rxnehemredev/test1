'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const STATUS_COLORS = {
    pending:   '#f59e0b',
    reviewing: '#6366f1',
    approved:  '#22c55e',
    rejected:  '#ef4444',
    added:     '#14b8a6',
};
const STATUS_ICONS = {
    pending:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    reviewing: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    approved:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    rejected:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>,
    added:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

export default function RequestsPage() {
    const { user, authFetch } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState('all');
    const [votedIds, setVotedIds] = useState(new Set());
    const [expandedId, setExpandedId] = useState(null);

    // Simple form — only title + optional link + optional reason
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchRequests();
        fetch('/api/settings').then(r => r.json()).then(d => setAppSettings(d.settings || {})).catch(() => {});
        // Kullanıcının kendi isteklerini de yükle
        if (user) {
            fetchUserRequests();
        }
    }, [user]);

    async function fetchRequests() {
        try {
            setLoading(true);
            const res = await fetch('/api/series-requests');
            const data = await res.json();
            setRequests(data.requests || []);
        } catch {
            setError(appSettings.lang_failed_load_requests || 'İstekler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }

    // Kullanıcının kendi isteklerini yükle (tüm durumlar dahil)
    const [myRequests, setMyRequests] = useState([]);
    async function fetchUserRequests() {
        if (!user) return;
        try {
            const res = await authFetch('/api/series-requests?mine=1');
            const data = await res.json();
            if (data.requests) {
                setMyRequests(data.requests);
            }
        } catch {}
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) { setError(appSettings.lang_series_title_required || 'Seri başlığı zorunludur.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await authFetch('/api/series-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ series_title: title.trim(), source_url: link.trim(), reason: reason.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || (appSettings.lang_failed_submit || 'Gönderilemedi.')); return; }
            setSuccess(appSettings.lang_request_submitted || 'İsteğiniz gönderildi! Ekibimiz en kısa sürede inceleyecek.');
            setShowForm(false);
            setTitle(''); setLink(''); setReason('');
            fetchRequests();
            fetchUserRequests(); // Taleplerim bölümünü de güncelle
        } catch {
            setError(appSettings.lang_failed_submit_request || 'İstek gönderilemedi.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpvote(id) {
        if (!user) { setError(appSettings.lang_login_to_upvote || 'Oy vermek için giriş yapınız.'); setTimeout(() => setError(''), 3000); return; }
        try {
            const res = await authFetch('/api/series-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upvote', id }),
            });
            const data = await res.json();
            if (res.ok) {
                setVotedIds(prev => {
                    const next = new Set(prev);
                    data.voted ? next.add(id) : next.delete(id);
                    return next;
                });
                setRequests(prev => prev.map(r =>
                    r.id === id ? { ...r, upvotes: data.voted ? r.upvotes + 1 : r.upvotes - 1 } : r
                ));
            }
        } catch {}
    }

    const filtered = requests.filter(r => filter === 'all' || r.status === filter);
    const counts = requests.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

    const STATUS_CONFIG = {
        pending:   { label: appSettings.lang_status_pending   || 'Bekliyor',   color: STATUS_COLORS.pending,   icon: STATUS_ICONS.pending   },
        reviewing: { label: appSettings.lang_status_reviewing || 'İnceleniyor', color: STATUS_COLORS.reviewing, icon: STATUS_ICONS.reviewing },
        approved:  { label: appSettings.lang_status_approved  || 'Onaylandı',  color: STATUS_COLORS.approved,  icon: STATUS_ICONS.approved  },
        rejected:  { label: appSettings.lang_status_rejected  || 'Reddedildi', color: STATUS_COLORS.rejected,  icon: STATUS_ICONS.rejected  },
        added:     { label: appSettings.lang_status_added     || 'Eklendi',    color: STATUS_COLORS.added,     icon: STATUS_ICONS.added     },
    };

    const FILTER_TABS = [
        { key: 'all',       label: appSettings.lang_filter_all       || 'Tümü' },
        { key: 'reviewing', label: appSettings.lang_status_reviewing || 'İnceleniyor' },
        { key: 'approved',  label: appSettings.lang_status_approved  || 'Onaylandı' },
        { key: 'added',     label: appSettings.lang_status_added     || 'Eklendi' },
        { key: 'rejected',  label: appSettings.lang_status_rejected  || 'Reddedildi' },
    ];

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 860, padding: '24px 16px' }}>
            {/* Header */}
            <div className="requests-header glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div>
                    <h1 className="requests-title">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        {appSettings.lang_series_requests_title || 'Seri İstekleri'}
                    </h1>
                    <p className="requests-subtitle">
                        {appSettings.lang_series_requests_subtitle || 'Eklenmesini istediğiniz serileri talep edin. Diğer istekleri oylamaya katılarak öncelik belirleyin.'}
                    </p>
                </div>
                {user ? (
                    <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setError(''); setSuccess(''); }}>
                        {showForm ? (
                            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg> {appSettings.lang_cancel || 'İptal'}</>
                        ) : (
                            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {appSettings.lang_request_a_series || 'Seri Talep Et'}</>
                        )}
                    </button>
                ) : (
                    <Link href="/login" className="btn btn-primary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                        {appSettings.lang_login_to_request || 'Talep için Giriş Yap'}
                    </Link>
                )}
            </div>

            {/* Success / Error banners */}
            {success && (
                <div className="requests-banner success">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {success}
                </div>
            )}
            {error && (
                <div className="requests-banner error">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                    {error}
                </div>
            )}

            {/* Simple request form */}
            {showForm && (
                <form className="requests-form" onSubmit={handleSubmit}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {appSettings.lang_new_series_request || 'Yeni Seri Talebi'}
                    </h3>

                    <div className="rform-field">
                        <label>{appSettings.lang_series_title_label || 'Seri Başlığı'} <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input
                            type="text"
                            placeholder={appSettings.lang_series_title_placeholder || 'örn. Solo Leveling'}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="rform-field">
                        <label>
                            {appSettings.lang_reference_link || 'Referans Bağlantısı'}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400, marginLeft: 6 }}>({appSettings.lang_optional || 'isteğe bağlı'})</span>
                        </label>
                        <input
                            type="url"
                            placeholder={appSettings.lang_reference_link_placeholder || 'https://myanimelist.net/... veya benzeri'}
                            value={link}
                            onChange={e => setLink(e.target.value)}
                        />
                    </div>

                    <div className="rform-field">
                        <label>
                            {appSettings.lang_why_add_this || 'Neden eklenmeli?'}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400, marginLeft: 6 }}>({appSettings.lang_optional || 'isteğe bağlı'})</span>
                        </label>
                        <textarea
                            placeholder={appSettings.lang_why_add_placeholder || 'Bu seri hakkında biraz bilgi verin...'}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? (
                                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {appSettings.lang_submitting || 'Gönderiliyor...'}</>
                            ) : (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> {appSettings.lang_submit_request || 'Talebi Gönder'}</>
                            )}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setError(''); }}>{appSettings.lang_cancel || 'İptal'}</button>
                    </div>
                </form>
            )}

            {/* Filter tabs */}
            <div className="requests-filters glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
                {FILTER_TABS.map(f => (
                    <button
                        key={f.key}
                        className={`rfilter-btn ${filter === f.key ? 'active' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label} {f.key !== 'all' ? `(${counts[f.key] || 0})` : `(${requests.length})`}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.3, marginBottom: 12 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <p>{appSettings.lang_no_requests_found || 'Talep bulunamadı.'}</p>
                    {user && filter === 'all' && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 12 }}>{appSettings.lang_be_first_to_request || 'İlk talebi sen oluştur!'}</button>
                    )}
                </div>
            ) : (
                <div className="requests-list">
                    {filtered.map(req => {
                        const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                        const voted = votedIds.has(req.id);
                        const isExpanded = expandedId === req.id;
                        const hasDetails = req.reason || req.source_url || req.admin_note;

                        return (
                            <div key={req.id} className={`request-card glass-panel glass-panel-hoverable ${isExpanded ? 'expanded' : ''}`}>
                                {/* Upvote column */}
                                <div className="req-vote">
                                    <button
                                        className={`req-vote-btn ${voted ? 'voted' : ''}`}
                                        onClick={() => handleUpvote(req.id)}
                                        title={user ? 'Oy ver' : 'Oy vermek için giriş yap'}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                                            <path d="m18 15-6-6-6 6"/>
                                        </svg>
                                    </button>
                                    <span className="req-vote-count">{req.upvotes}</span>
                                </div>

                                {/* Body */}
                                <div className="req-body">
                                    <div className="req-top">
                                        <span className="req-title">{req.series_title}</span>
                                        <span className="req-status-badge" style={{ background: st.color + '20', color: st.color, border: `1px solid ${st.color}44` }}>
                                            {st.icon} {st.label}
                                        </span>
                                    </div>

                                    <div className="req-meta">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            {req.username}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            {new Date(req.created_at + 'Z').toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Expand/collapse if details exist */}
                                    {hasDetails && (
                                        <>
                                            {isExpanded && (
                                                <div className="req-details">
                                                    {req.reason && (
                                                                <div className="req-detail-block">
                                                                    <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                                        {appSettings.lang_why_add_it || 'Neden eklenmeli:'}
                                                                    </strong>
                                                            <p>{req.reason}</p>
                                                        </div>
                                                    )}
                                                    {req.source_url && (
                                                        <div className="req-detail-block">
                                                            <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                                                {appSettings.lang_reference || 'Referans:'}
                                                            </strong>
                                                            <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="req-link">
                                                                {req.source_url.replace(/^https?:\/\//, '')}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {req.admin_note && (
                                                        <div className="req-detail-block req-admin-note">
                                                            <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                                {appSettings.lang_admin_note || 'Admin notu:'}
                                                            </strong>
                                                            <p>{req.admin_note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <button
                                                className="req-expand-btn"
                                                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                            >
                                                {isExpanded ? (
                                                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg> {appSettings.lang_less || 'Daha Az'}</>
                                                ) : (
                                                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg> {appSettings.lang_details || 'Detaylar'}</>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Kullanıcının kendi bekleyen istekleri */}
            {user && myRequests.length > 0 && (
                <div style={{ marginTop: '48px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Taleplerim
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            ({myRequests.length} istek)
                        </span>
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {myRequests.map(req => {
                            const cfg = STATUS_CONFIG[req.status] || { label: req.status, color: '#9ca3af', icon: null };
                            return (
                                <div key={req.id} className="glass-panel glass-panel-hoverable" style={{
                                    padding: '20px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: `${cfg.color}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.3rem',
                                        flexShrink: 0,
                                    }}>
                                        {cfg.icon || <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>
                                            {req.series_title}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(req.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '6px 14px',
                                        borderRadius: '10px',
                                        background: `${cfg.color}20`,
                                        color: cfg.color,
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                    }}>
                                        {cfg.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}