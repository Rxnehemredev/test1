'use client';

import React, { useState } from 'react';
import { MsgIcon, ClockIcon, CheckIcon, ShieldIcon, TrashIcon } from '../AdminIcons';

export default function CommentsTab({
    stats,
    commentSearch,
    setCommentSearch,
    commentReports,
    setCommentReports,
    commentFilter,
    setCommentFilter,
    commentStatusTab,
    setCommentStatusTab,
    commentsPage,
    setCommentsPage,
    ADMIN_PAGE_SIZE,
    selectedComments,
    setSelectedComments,
    commentEmojis,
    setCommentEmojis,
    reportReasons,
    setReportReasons,
    submitting,
    setSubmitting,
    authFetch,
    show,
    loadStats,
    setConfirmModal,
    fDate,
    tab,
}) {
    const [newEmojiIcon, setNewEmojiIcon] = useState('');
    const [newEmojiLabel, setNewEmojiLabel] = useState('');
    const [newReasonText, setNewReasonText] = useState('');

    async function handleSaveEmojis(updatedEmojis) {
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_emojis: JSON.stringify(updatedEmojis) })
            });
            const data = await res.json();
            if (data.success) {
                setCommentEmojis(updatedEmojis);
                show('Tepki emojileri başarıyla kaydedildi!');
            } else {
                show(data.error || 'Ayarlar kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveReportReasons(updatedReasons) {
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_report_reasons: JSON.stringify(updatedReasons) })
            });
            const data = await res.json();
            if (data.success) {
                setReportReasons(updatedReasons);
                show('Bildirim nedenleri başarıyla kaydedildi!');
            } else {
                show(data.error || 'Ayarlar kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    function addEmoji() {
        if (!newEmojiIcon.trim() || !newEmojiLabel.trim()) return;
        const nextEmojis = [...commentEmojis, { icon: newEmojiIcon.trim(), label: newEmojiLabel.trim() }];
        setCommentEmojis(nextEmojis);
        setNewEmojiIcon('');
        setNewEmojiLabel('');
    }

    function removeEmoji(index) {
        const nextEmojis = commentEmojis.filter((_, i) => i !== index);
        setCommentEmojis(nextEmojis);
    }

    function updateEmojiField(index, field, value) {
        const nextEmojis = commentEmojis.map((em, i) => {
            if (i === index) {
                return { ...em, [field]: value };
            }
            return em;
        });
        setCommentEmojis(nextEmojis);
    }

    function addReason() {
        if (!newReasonText.trim()) return;
        const nextReasons = [...reportReasons, newReasonText.trim()];
        setReportReasons(nextReasons);
        setNewReasonText('');
    }

    function removeReason(index) {
        const nextReasons = reportReasons.filter((_, i) => i !== index);
        setReportReasons(nextReasons);
    }

    function updateReasonText(index, value) {
        const nextReasons = reportReasons.map((re, i) => {
            if (i === index) return value;
            return re;
        });
        setReportReasons(nextReasons);
    }

    const allComments = stats?.recentComments || [];
    const q = commentSearch.trim().toLowerCase();
    const reportedCommentIds = new Set(commentReports.filter(r => r.status === 'open' || r.status === 'pending' || !r.status).map(r => r.comment_id));

    const filtered = allComments.filter(c => {
        const matchQ = !q || c.content?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q) || c.series_title?.toLowerCase().includes(q);
        const matchF = commentFilter === 'all' || (commentFilter === 'series' && !c.chapter_id) || (commentFilter === 'chapter' && !!c.chapter_id);
        const matchStatus = commentStatusTab === 'all' ||
                            (commentStatusTab === 'reported' && reportedCommentIds.has(c.id)) ||
                            (commentStatusTab === 'approved' && !reportedCommentIds.has(c.id));
        return matchQ && matchF && matchStatus;
    });

    const paginated = filtered.slice((commentsPage - 1) * ADMIN_PAGE_SIZE, commentsPage * ADMIN_PAGE_SIZE);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
            {/* Modern Header Card */}
            <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 32px', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(96, 165, 250, 0.05) 100%)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', backdropFilter: 'blur(10px)' }}>
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)' }}>
                        <MsgIcon />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            Yorum Yönetimi
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>
                            Kullanıcı yorumlarını ve raporlarını modern arayüzle kolayca yönetin.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {/* Floating Tabs */}
                <div style={{ display: 'flex', gap: '12px', padding: '24px 32px 20px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {[
                        { id: 'all', label: 'Tümü', icon: <MsgIcon />, count: allComments.length, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
                        { id: 'pending', label: 'Bekleyen', icon: <ClockIcon />, count: 0, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
                        { id: 'approved', label: 'Onaylı', icon: <CheckIcon />, count: allComments.length - reportedCommentIds.size, color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
                        { id: 'reported', label: 'Şikayetli', icon: <ShieldIcon />, count: reportedCommentIds.size, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
                        { id: 'deleted', label: 'Silinen', icon: <TrashIcon />, count: 0, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
                    ].map(t => {
                        const isActive = commentStatusTab === t.id;
                        return (
                            <button key={t.id} onClick={() => { setCommentStatusTab(t.id); setCommentsPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '14px', background: isActive ? t.bg : 'transparent', border: `1px solid ${isActive ? t.bg : 'rgba(255,255,255,0.05)'}`, color: isActive ? t.color : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }} onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.7 }}>
                                    {t.id !== 'all' && React.cloneElement(t.icon, { width: 16, height: 16 })}
                                    {t.label}
                                </span>
                                <span style={{ fontSize: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'var(--bg-tertiary)', color: 'inherit', padding: '2px 10px', borderRadius: '12px', fontWeight: '800' }}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Filters Row */}
                <div style={{ padding: '20px 32px', display: 'flex', gap: '16px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.02)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input
                            type="text"
                            placeholder="Yorumlarda, kullanıcılarda veya serilerde ara..."
                            value={commentSearch}
                            onChange={e => { setCommentSearch(e.target.value); setCommentsPage(1); }}
                            style={{ width: '100%', padding: '12px 16px 12px 48px', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)'; }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {['Tüm zamanlar', 'Min şikayet', 'En yeni'].map((txt, i) => (
                            <select key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '12px 20px', outline: 'none', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                <option>{txt}</option>
                            </select>
                        ))}
                        <select value={commentFilter} onChange={e => { setCommentFilter(e.target.value); setCommentsPage(1); }} style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '12px 20px', outline: 'none', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                            <option value="all">Tüm seriler</option>
                            <option value="series">Sadece Seri</option>
                            <option value="chapter">Sadece Bölüm</option>
                        </select>
                    </div>
                </div>

                {/* Modern Table */}
                <div style={{ overflowX: 'auto', minHeight: '350px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '20px 32px', width: '40px', fontWeight: '700' }}>
                                    <input
                                        type="checkbox"
                                        checked={paginated.length > 0 && paginated.every(c => selectedComments.has(c.id))}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedComments(prev => {
                                                    const next = new Set(prev);
                                                    paginated.forEach(c => next.add(c.id));
                                                    return next;
                                                });
                                            } else {
                                                setSelectedComments(prev => {
                                                    const next = new Set(prev);
                                                    paginated.forEach(c => next.delete(c.id));
                                                    return next;
                                                });
                                            }
                                        }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                    />
                                </th>
                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Kullanıcı</th>
                                <th style={{ padding: '20px 16px', fontWeight: '700', width: '35%' }}>Yorum</th>
                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Bağlantı</th>
                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Reaksiyonlar</th>
                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Tarih</th>
                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Durum</th>
                                <th style={{ padding: '20px 32px', fontWeight: '700', textAlign: 'right' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'inline-flex', padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '20px' }}>
                                            <MsgIcon />
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Eşleşen yorum bulunamadı</div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Farklı filtreler veya arama terimleri deneyin.</div>
                                    </td>
                                </tr>
                            ) : paginated.map(c => {
                                const commentUrl = c.series_slug ? (c.chapter_id && c.chapter_number != null) ? `/seri/${c.series_slug}/bolum/${c.chapter_number}#comment-${c.id}` : `/seri/${c.series_slug}#comment-${c.id}` : null;
                                const initials = (c.username || '?').slice(0, 2).toUpperCase();
                                const avatarColors = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#fb923c'];
                                const avatarColor = avatarColors[(c.username || '').charCodeAt(0) % avatarColors.length];
                                const rCount = commentReports.filter(r => r.comment_id === c.id).length;

                                return (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s', background: selectedComments.has(c.id) ? 'rgba(99,102,241,0.05)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = selectedComments.has(c.id) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = selectedComments.has(c.id) ? 'rgba(99,102,241,0.05)' : 'transparent'}>
                                        <td style={{ padding: '20px 32px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedComments.has(c.id)}
                                                onChange={e => {
                                                    const next = new Set(selectedComments);
                                                    if (e.target.checked) next.add(c.id);
                                                    else next.delete(c.id);
                                                    setSelectedComments(next);
                                                }}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '20px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', boxShadow: `0 4px 12px ${avatarColor}40` }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.username || 'Anonim'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {c.user_id || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 16px' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5', maxWidth: '400px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {c.content}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 16px' }}>
                                            <a
                                                href={commentUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#60a5fa', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', padding: '6px 12px', background: 'rgba(96, 165, 250, 0.08)', borderRadius: '10px', border: '1px solid rgba(96, 165, 250, 0.15)', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.15)'; e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.08)'; e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.15)'; }}
                                            >
                                                <span>{c.series_title || 'Seri'} {c.chapter_number ? `Bölüm ${c.chapter_number}` : ''}</span>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                            </a>
                                        </td>
                                        <td style={{ padding: '20px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', fontWeight: '700' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                                    <span>{c.likes || 0}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"/></svg>
                                                    <span>{c.dislikes || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                            {fDate(c.created_at)}
                                        </td>
                                        <td style={{ padding: '20px 16px' }}>
                                            {rCount > 0 ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px #f87171' }}></span>
                                                    İncelenecek
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }}></span>
                                                    Onaylı
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '8px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: '10px', transition: 'all 0.2s' }} onClick={() => setConfirmModal({ action: 'delete-comment', body: { commentId: c.id }, text: 'Bu yorumu silmek istediğinize emin misiniz?' })} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}>
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Bulk Action Bar */}
                {selectedComments.size > 0 && (
                    <div style={{ padding: '16px 32px', background: 'rgba(99,102,241,0.06)', borderTop: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-light)' }}>{selectedComments.size} yorum seçildi</span>
                            <button style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }} onClick={() => setSelectedComments(new Set())}>Seçimi Temizle</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => { if (!window.confirm(`${selectedComments.size} yorumu silmek istediğinize emin misiniz?`)) return; const ids = Array.from(selectedComments); let ok = 0; for (const id of ids) { try { const fd = new FormData(); fd.append('action', 'delete-comment'); fd.append('commentId', id); const res = await authFetch('/api/admin', { method: 'POST', body: fd }); const d = await res.json(); if (d.message || d.success) ok++; } catch {} } show(`${ok}/${ids.length} yorum silindi`); setSelectedComments(new Set()); if (tab === 'comments') loadStats(); }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                Toplu Sil
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Ayarlar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Tepki Emojileri */}
                <div style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}>✨</div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Tepki Emojileri</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                        Yorumlarda kullanıcıların etkileşim kurabileceği emojileri belirleyin.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {commentEmojis.map((em, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <input type="text" value={em.icon} onChange={e => updateEmojiField(index, 'icon', e.target.value)} style={{ width: '50px', textAlign: 'center', fontSize: '1.2rem', padding: '6px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} />
                                <input type="text" value={em.label} onChange={e => updateEmojiField(index, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='transparent'} />
                                <button onClick={() => removeEmoji(index)} style={{ padding: '8px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'all 0.2s', borderRadius: '8px' }} onMouseEnter={e=>{e.currentTarget.style.opacity=1; e.currentTarget.style.background='rgba(248,113,113,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.opacity=0.7; e.currentTarget.style.background='transparent'}} title="Kaldır"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', marginBottom: '20px', border: '1px dashed rgba(59, 130, 246, 0.3)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#60a5fa', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yeni Ekle</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="text" value={newEmojiIcon} onChange={e => setNewEmojiIcon(e.target.value)} style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '6px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="🔥" />
                            <input type="text" value={newEmojiLabel} onChange={e => setNewEmojiLabel(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="İsim (örn. Beğen)" onKeyDown={e => e.key === 'Enter' && addEmoji()} />
                            <button onClick={addEmoji} disabled={!newEmojiIcon.trim() || !newEmojiLabel.trim()} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: (!newEmojiIcon.trim() || !newEmojiLabel.trim()) ? 0.5 : 1 }}>Ekle</button>
                        </div>
                    </div>
                    <button onClick={() => handleSaveEmojis(commentEmojis)} disabled={submitting} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>

                {/* Bildirim Nedenleri */}
                <div style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}>🚩</div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Bildirim Nedenleri</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                        Kullanıcıların yorumları raporlarken seçebileceği nedenler listesi.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {reportReasons.map((re, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>{index + 1}</div>
                                <input type="text" value={re} onChange={e => updateReasonText(index, e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='#ef4444'} onBlur={e=>e.target.style.borderColor='transparent'} />
                                <button onClick={() => removeReason(index)} style={{ padding: '8px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'all 0.2s', borderRadius: '8px' }} onMouseEnter={e=>{e.currentTarget.style.opacity=1; e.currentTarget.style.background='rgba(248,113,113,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.opacity=0.7; e.currentTarget.style.background='transparent'}} title="Kaldır"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', marginBottom: '20px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f87171', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yeni Ekle</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="text" value={newReasonText} onChange={e => setNewReasonText(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="Örn. Nefret Söylemi" onKeyDown={e => e.key === 'Enter' && addReason()} />
                            <button onClick={addReason} disabled={!newReasonText.trim()} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: !newReasonText.trim() ? 0.5 : 1 }}>Ekle</button>
                        </div>
                    </div>
                    <button onClick={() => handleSaveReportReasons(reportReasons)} disabled={submitting} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </div>

            {/* Yorum Şikayetleri */}
            <div style={{ padding: '28px 32px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <ShieldIcon />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>Yorum Şikayetleri</h3>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Kullanıcıların bildirdiği şikayetli yorumlar</p>
                        </div>
                    </div>
                </div>

                {commentReports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎉</div>
                        <div>Şu an bekleyen veya incelenecek yorum şikayeti yok.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {commentReports.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ef4444' }}>{r.reason || 'Belirtilmedi'}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {fDate(r.created_at)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        "{r.comment_content || 'Yorum içeriği silinmiş veya bulunamadı'}"
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Raporlayan: {r.reporter_username || 'Anonim'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    {(!r.status || r.status === 'open' || r.status === 'pending') && (
                                        <>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                <button style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onClick={() => authFetch('/api/reports/comments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id, status: 'resolved' }) }).then(() => setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x))).catch(() => show('İşlem başarısız', 'error'))} onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.1)'}>
                                                    Çöz
                                                </button>
                                                <button style={{ padding: '6px 12px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onClick={() => authFetch('/api/reports/comments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id, status: 'rejected' }) }).then(() => setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'rejected' } : x))).catch(() => show('İşlem başarısız', 'error'))} onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'}>
                                                    Reddet
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Yorumu silmek istediğinize emin misiniz?')) return; const fd = new FormData(); fd.append('action', 'delete-comment'); fd.append('commentId', r.comment_id); authFetch('/api/admin', { method: 'POST', body: fd }).then(res => res.json()).then(d => { if (d.message || d.success) { setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved', comment_content: '[silindi]' } : x)); show('Yorum silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                    Yorumu Sil
                                                </button>
                                                <button style={{ padding: '6px 10px', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Bu raporu silmek istediğinize emin misiniz?')) return; authFetch('/api/reports/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id }) }).then(res => res.json()).then(d => { if (d.success) { setCommentReports(prev => prev.filter(x => x.id !== r.id)); show('Rapor silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(100,116,139,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(100,116,139,0.1)'}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                    Raporu Sil
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {(r.status === 'resolved' || r.status === 'rejected') && (
                                        <button style={{ padding: '6px 10px', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Bu raporu silmek istediğinize emin misiniz?')) return; authFetch('/api/reports/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id }) }).then(res => res.json()).then(d => { if (d.success) { setCommentReports(prev => prev.filter(x => x.id !== r.id)); show('Rapor silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(100,116,139,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(100,116,139,0.1)'}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                            Raporu Sil
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
