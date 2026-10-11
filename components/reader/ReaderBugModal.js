import React from 'react';
import { createPortal } from 'react-dom';
import { isDefaultTitle } from '@/lib/utils/titles';

export default function ReaderBugModal({
    mounted,
    showBugModal,
    closeBugModal,
    series,
    chapter,
    bugSuccess,
    bugDescription,
    setBugDescription,
    bugSubmitting,
    bugError,
    handleBugSubmit,
}) {
    if (!mounted || !showBugModal) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) closeBugModal(); }}
        >
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 16,
                padding: '28px 28px 24px',
                width: '100%', maxWidth: 480,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Hata Bildir</h3>
                    </div>
                    <button onClick={closeBugModal} aria-label="Kapat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* Chapter info */}
                <div style={{ background: 'var(--bg-tertiary,rgba(255,255,255,0.05))', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{series?.title}</div>
                    <div>Bölüm {chapter?.chapter_number}{chapter?.title && !isDefaultTitle(chapter.title, chapter.chapter_number) ? ` — ${chapter.title}` : ''}</div>
                </div>

                {bugSuccess ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '1rem' }}>Teşekkürler!</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>Hata bildiriminiz alındı. İnceleyip en kısa sürede düzelteceğiz.</p>
                        <button onClick={closeBugModal} style={{ padding: '9px 24px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Kapat</button>
                    </div>
                ) : (
                    <form onSubmit={handleBugSubmit}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Hata Açıklaması <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={bugDescription}
                            onChange={(e) => setBugDescription(e.target.value)}
                            placeholder="Gördüğünüz hatayı kısaca açıklayın... (örn: 3. sayfadan sonra resimler yüklenmiyor)"
                            rows={5}
                            required
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: 'var(--bg-primary,#0d0d0d)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8, color: 'var(--text-primary)',
                                fontSize: '0.9rem', padding: '10px 12px',
                                resize: 'vertical', outline: 'none',
                                fontFamily: 'inherit', lineHeight: 1.5,
                                minHeight: 100,
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                        />
                        {bugError && (
                            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.82rem' }}>
                                {bugError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={closeBugModal} style={{ padding: '9px 20px', borderRadius: 8, background: 'var(--bg-tertiary,rgba(255,255,255,0.06))', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.88rem' }}>
                                İptal
                            </button>
                            <button type="submit" disabled={bugSubmitting || !bugDescription.trim()} style={{ padding: '9px 22px', borderRadius: 8, background: bugSubmitting || !bugDescription.trim() ? 'rgba(239,68,68,0.4)' : '#ef4444', color: '#fff', fontWeight: 700, border: 'none', cursor: bugSubmitting || !bugDescription.trim() ? 'not-allowed' : 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
                                {bugSubmitting ? (
                                    <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Gönderiliyor...</>
                                ) : (
                                    <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Gönder</>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
