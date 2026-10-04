'use client';
import { useEffect, useState, useRef } from 'react';
import { useSettings } from '@/components/SettingsProvider';

/**
 * PopupAlert — Cam efekti tasarımlı özelleştirilebilir uyarı kutusu bileşeni.
 *
 * app_settings anahtarları:
 *   alert_popup_enabled        — '1' | '0'
 *   alert_popup_type           — 'adblock' | 'custom'
 *   alert_popup_title          — string
 *   alert_popup_message        — string
 *   alert_popup_skip_delay     — saniye cinsinden (örn: '5')
 *   alert_popup_skip_label     — "Geç" butonu etiketi
 *   alert_popup_link_url       — bağlantı butonu URL'si (boşsa gösterilmez)
 *   alert_popup_link_label     — bağlantı butonunun etiketi
 *   alert_popup_link_new_tab   — '1' | '0' (yeni sekmede aç)
 *   alert_popup_show_once      — '1' | '0' (session başına bir kez göster)
 *   alert_popup_bg_color       — arka plan rengi (isteğe bağlı, varsayılan koyu)
 *   alert_popup_icon           — emoji/ikon (isteğe bağlı)
 *   alert_popup_interval       — 'session' | 'hourly' | 'daily' | 'every_3_hours' | 'always'
 *                               — session: her oturumda bir kez
 *                               — hourly: saatte bir
 *                               — daily: günde bir
 *                               — every_3_hours: 3 saatte bir
 *                               — always: her zaman göster
 */
export default function PopupAlert() {
    const { settings, loaded } = useSettings();
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [skipActive, setSkipActive] = useState(false);
    const intervalRef = useRef(null);

    // Admin panel kontrolü
    const isAdminPanel = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin-panel');

    const isEnabled = settings?.alert_popup_enabled === '1';
    const type = settings?.alert_popup_type || 'custom';
    const title = settings?.alert_popup_title || '';
    const message = settings?.alert_popup_message || '';
    const skipDelay = parseInt(settings?.alert_popup_skip_delay || '0', 10);
    const skipLabel = settings?.alert_popup_skip_label || 'Geç';
    const linkUrl = settings?.alert_popup_link_url || '';
    const linkLabel = settings?.alert_popup_link_label || 'Devam Et';
    const linkNewTab = settings?.alert_popup_link_new_tab !== '0';
    const showOnce = settings?.alert_popup_show_once !== '0';
    const bgColor = settings?.alert_popup_bg_color || '';
    const icon = settings?.alert_popup_icon || '';
    const interval = settings?.alert_popup_interval || 'session';

    // İçerik hash'i — içerik değiştiğinde show_once bayrağını sıfırla
    const contentKey = (() => {
        try {
            const raw = `${title}|${message}|${linkUrl}`;
            return `alert_popup_shown_${btoa(unescape(encodeURIComponent(raw))).slice(0, 20)}`;
        } catch {
            return 'alert_popup_shown';
        }
    })();

    // Interval kontrolü — localStorage ile gösterim aralığını kontrol et
    const shouldShowByInterval = () => {
        if (interval === 'always' || !interval) return true;

        const lastShown = localStorage.getItem('alert_popup_last_shown');
        const now = Date.now();

        if (!lastShown) return true;

        const elapsed = now - parseInt(lastShown, 10);
        const intervals = {
            'hourly': 60 * 60 * 1000,           // 1 saat
            'daily': 24 * 60 * 60 * 1000,      // 1 gün
            'every_3_hours': 3 * 60 * 60 * 1000, // 3 saat
            'session': -1,                        // özel, sessionStorage ile kontrol edilir
        };

        const intervalMs = intervals[interval] || intervals['session'];
        return elapsed >= intervalMs;
    };

    const markAsShown = () => {
        localStorage.setItem('alert_popup_last_shown', Date.now().toString());
    };

    useEffect(() => {
        if (!loaded || !isEnabled || (!title && !message)) return;
        if (isAdminPanel) return; // Admin panelinde gösterme

        // Interval kontrolü
        if (!shouldShowByInterval()) return;

        // Session kontrolü
        if (showOnce) {
            const alreadySeen = sessionStorage.getItem(contentKey);
            if (alreadySeen) return;
        }

        setVisible(true);
        markAsShown();
        if (showOnce) {
            sessionStorage.setItem(contentKey, '1');
        }
    }, [loaded, isEnabled, title, message, showOnce, contentKey, interval, isAdminPanel]);

    useEffect(() => {
        if (!visible) return;
        if (skipDelay <= 0) {
            setSkipActive(true);
            return;
        }
        setCountdown(skipDelay);
        setSkipActive(false);

        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    setSkipActive(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(intervalRef.current);
        };
    }, [visible, skipDelay]);

    function handleDismiss() {
        setVisible(false);
    }

    if (!loaded || !isEnabled || !visible) return null;
    if (!title && !message) return null;

    // Adblock tipi için cam efekti tasarım
    if (type === 'adblock') {
        return (
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                }}
            >
                {/* Parlama efekti */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(239,68,68,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.08) 0%, transparent 50%)',
                }} />

                <div
                    style={{
                        maxWidth: 480, width: '100%',
                        background: 'rgba(20, 20, 35, 0.85)',
                        borderRadius: 24,
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '40px 36px',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset',
                        textAlign: 'center',
                        position: 'relative',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Glass shimmer efekti */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }} />

                    {/* İkon */}
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 100%)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        fontSize: icon ? '2.2rem' : '2rem',
                        boxShadow: '0 8px 32px rgba(239,68,68,0.2)',
                    }}>
                        {icon || <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                    </div>

                    {/* Başlık */}
                    {title && (
                        <h2 style={{
                            margin: '0 0 14px',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#fff',
                            lineHeight: 1.3,
                            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                            {title}
                        </h2>
                    )}

                    {/* Mesaj */}
                    {message && (
                        <p style={{
                            margin: '0 0 32px',
                            fontSize: '0.95rem',
                            color: 'rgba(255,255,255,0.75)',
                            lineHeight: 1.75,
                            whiteSpace: 'pre-line',
                        }}>
                            {message}
                        </p>
                    )}

                    {/* Butonlar */}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {linkUrl && (
                            <a
                                href={linkUrl}
                                target={linkNewTab ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                onClick={handleDismiss}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '13px 32px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff', borderRadius: 14, fontWeight: 700,
                                    fontSize: '0.95rem', textDecoration: 'none',
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset'; }}
                            >
                                {linkLabel}
                            </a>
                        )}
                        <button
                            onClick={skipActive ? handleDismiss : undefined}
                            disabled={!skipActive}
                            style={{
                                padding: '13px 28px',
                                background: skipActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                                color: skipActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                                border: `1px solid ${skipActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 14, fontWeight: 600,
                                fontSize: '0.9rem', cursor: skipActive ? 'pointer' : 'not-allowed',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                minWidth: 110,
                            }}
                        >
                            {skipActive
                                ? skipLabel
                                : `${skipLabel} (${countdown}s)`
                            }
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Custom (cam efekti) tip
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
        >
            {/* Parlama efekti */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 20% 30%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(168,85,247,0.06) 0%, transparent 50%)',
            }} />

            <div
                style={{
                    maxWidth: 520, width: '100%',
                    background: bgColor || 'rgba(30, 30, 46, 0.9)',
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '40px 36px',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset',
                    textAlign: 'center',
                    position: 'relative',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                {/* Glass shimmer efekti */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }} />

                {/* Kapat butonu (sağ üst) */}
                {skipActive && (
                    <button
                        onClick={handleDismiss}
                        style={{
                            position: 'absolute', top: 16, right: 16,
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        aria-label="Kapat"
                    >
                        ✕
                    </button>
                )}

                {/* İkon */}
                {icon && (
                    <div style={{
                        fontSize: '2.8rem',
                        marginBottom: 18,
                        lineHeight: 1,
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                    }}>
                        {icon}
                    </div>
                )}

                {/* Başlık */}
                {title && (
                    <h2 style={{
                        margin: '0 0 14px',
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: 'var(--text-primary, #fff)',
                        lineHeight: 1.3,
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                        {title}
                    </h2>
                )}

                {/* Mesaj */}
                {message && (
                    <p style={{
                        margin: '0 0 32px',
                        fontSize: '0.95rem',
                        color: 'var(--text-secondary, rgba(255,255,255,0.75))',
                        lineHeight: 1.75,
                        whiteSpace: 'pre-line',
                    }}>
                        {message}
                    </p>
                )}

                {/* Butonlar */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {linkUrl && (
                        <a
                            href={linkUrl}
                            target={linkNewTab ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            onClick={handleDismiss}
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '13px 32px',
                                background: 'linear-gradient(135deg, var(--accent, #6366f1) 0%, #8b5cf6 100%)',
                                color: '#fff', borderRadius: 14, fontWeight: 700,
                                fontSize: '0.95rem', textDecoration: 'none',
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset'; }}
                        >
                            {linkLabel}
                        </a>
                    )}
                    <button
                        onClick={skipActive ? handleDismiss : undefined}
                        disabled={!skipActive}
                        style={{
                            padding: '13px 28px',
                            background: skipActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                            color: skipActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                            border: `1px solid ${skipActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 14, fontWeight: 600,
                            fontSize: '0.9rem', cursor: skipActive ? 'pointer' : 'not-allowed',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            minWidth: 110,
                        }}
                    >
                        {skipActive
                            ? skipLabel
                            : `${skipLabel} (${countdown}s)`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}