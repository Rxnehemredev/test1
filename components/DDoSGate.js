'use client';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/components/SettingsProvider';

/**
 * DDoSGate — Siteye gelen her ziyaretçiye (bot dahil) Cloudflare Turnstile
 * doğrulaması yapan giriş kapısı.
 *
 * Nasıl çalışır:
 *   1. Sayfa yüklenince sessionStorage'a bakılır. Token zaten varsa gösterilmez.
 *   2. Turnstile widget render edilir; kullanıcı/bot otomatik veya manuel doğrular.
 *   3. Token /api/ddos-gate'e POST edilir, sunucu Cloudflare API ile doğrular.
 *   4. Başarılıysa sessionStorage'a işaret yazılır, overlay kapanır.
 *   5. Başarısızsa hata mesajı gösterilir, yeniden dene butonu çıkar.
 *
 * Admin panelinden kontrol:
 *   ddos_gate_enabled   — '1' etkin, '0' devre dışı (varsayılan '0')
 *
 * Turnstile site key'i mevcut turnstile_site_key ayarından okunur.
 * Secret key'i mevcut turnstile_secret_key ayarından okunur (sunucu tarafı).
 *
 * NOT: Turnstile "Managed" modunda gerçek kullanıcılar genellikle hiçbir
 * şey yapmak zorunda kalmaz (invisible challenge). Botlar için ise kutu
 * işaretleme ekranı çıkar.
 */
export default function DDoSGate() {
    const { settings, loaded } = useSettings();
    const [phase, setPhase] = useState('idle'); // idle | verifying | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [scriptReady, setScriptReady] = useState(false);

    const siteKey = settings?.turnstile_site_key || '';
    const enabled = settings?.ddos_gate_enabled === '1';

    const SESSION_KEY = 'ddos_gate_passed';

    // Script'i yükle
    useEffect(() => {
        if (!siteKey) return;
        if (window.turnstile) { setScriptReady(true); return; }
        const existing = document.getElementById('cf-turnstile-script');
        if (existing) {
            existing.addEventListener('load', () => setScriptReady(true));
            return;
        }
        const s = document.createElement('script');
        s.id = 'cf-turnstile-script';
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.defer = true;
        s.onload = () => setScriptReady(true);
        document.head.appendChild(s);
    }, [siteKey]);

    // Widget'ı render et
    useEffect(() => {
        if (!scriptReady || !siteKey || !containerRef.current) return;
        if (widgetIdRef.current !== null) return;
        if (phase !== 'idle') return;

        widgetIdRef.current = window.turnstile?.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            size: 'normal',
            callback: async (token) => {
                setPhase('verifying');
                try {
                    const res = await fetch('/api/ddos-gate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                        sessionStorage.setItem(SESSION_KEY, '1');
                        setPhase('success');
                    } else {
                        setErrorMsg(data.error || 'Doğrulama başarısız.');
                        setPhase('error');
                        resetWidget();
                    }
                } catch {
                    setErrorMsg('Sunucuya ulaşılamadı. Lütfen tekrar dene.');
                    setPhase('error');
                    resetWidget();
                }
            },
            'error-callback': () => {
                setErrorMsg('Turnstile yüklenemedi. Sayfayı yenile.');
                setPhase('error');
            },
            'expired-callback': () => {
                setPhase('idle');
                resetWidget();
            },
        });
    }, [scriptReady, siteKey, phase]);

    function resetWidget() {
        if (widgetIdRef.current !== null && window.turnstile) {
            try { window.turnstile.reset(widgetIdRef.current); } catch {}
        }
        setPhase('idle');
    }

    // Cleanup
    useEffect(() => {
        return () => {
            if (widgetIdRef.current !== null && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
                widgetIdRef.current = null;
            }
        };
    }, []);

    // Karar: göster mi gösterme mi?
    if (!loaded) return null;
    if (!enabled || !siteKey) return null;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return null;
    if (phase === 'success') return null;
    // Admin panel'de gösterme
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.iconWrap}>
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt={settings?.site_name || 'Site'} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                    ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    )}
                </div>

                <h2 style={styles.title}>Güvenlik Doğrulaması</h2>
                <p style={styles.desc}>
                    Devam etmek için lütfen aşağıdaki doğrulamayı tamamla.
                    {' '}Gerçek kullanıcılar genellikle otomatik geçer.
                </p>

                {/* Turnstile widget container */}
                {phase !== 'error' && (
                    <div ref={containerRef} style={styles.widgetWrap} />
                )}

                {/* Durum mesajları */}
                {phase === 'verifying' && (
                    <p style={styles.statusMsg}>⏳ Doğrulanıyor...</p>
                )}
                {phase === 'error' && (
                    <div style={styles.errorBox}>
                        <p style={{ margin: '0 0 12px', color: '#f87171', fontSize: '0.9rem' }}>
                            ⚠️ {errorMsg}
                        </p>
                        <button onClick={resetWidget} style={styles.retryBtn}>
                            Tekrar Dene
                        </button>
                    </div>
                )}

                <p style={styles.powered}>
                    Koruması:{' '}
                    <a href="https://www.cloudflare.com/products/turnstile/" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316' }}>
                        Cloudflare Turnstile
                    </a>
                </p>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    card: {
        maxWidth: 400,
        width: '100%',
        background: 'rgba(20, 20, 35, 0.96)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '36px 28px 24px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
    },
    iconWrap: {
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: 'rgba(74,222,128,0.1)',
        border: '1px solid rgba(74,222,128,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#f1f5f9',
        margin: '0 0 10px',
    },
    desc: {
        fontSize: '0.88rem',
        color: '#94a3b8',
        margin: '0 0 20px',
        lineHeight: 1.6,
    },
    widgetWrap: {
        display: 'flex',
        justifyContent: 'center',
        margin: '0 0 12px',
        minHeight: 65,
    },
    statusMsg: {
        fontSize: '0.88rem',
        color: '#94a3b8',
        margin: '8px 0',
    },
    errorBox: {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10,
        padding: '14px',
        margin: '8px 0 12px',
    },
    retryBtn: {
        background: 'rgba(74,222,128,0.15)',
        border: '1px solid rgba(74,222,128,0.3)',
        borderRadius: 8,
        color: '#4ade80',
        padding: '8px 20px',
        fontSize: '0.88rem',
        cursor: 'pointer',
        fontWeight: 600,
    },
    powered: {
        fontSize: '0.75rem',
        color: '#475569',
        margin: '12px 0 0',
    },
};
