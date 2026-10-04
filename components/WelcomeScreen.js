'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '@/components/SettingsProvider';

/**
 * WelcomeScreen — bir ziyaretçi IP'si siteye ilk kez girdiğinde bir defaya
 * mahsus gösterilen, birden fazla adımdan (slayt) oluşan karşılama ekranı.
 *
 * Kontrol app_settings üzerinden admin panelinden yapılır (Ayarlar sekmesi):
 *   welcome_screen_enabled      — '1' | '0'
 *   welcome_screen_slides       — JSON string, [{ title, message, image, buttonText? }, ...]
 *
 * Eski (tekli) alanlar geriye dönük uyumluluk için hâlâ okunuyor ve
 * welcome_screen_slides tanımlı/geçerli değilse tek slaytlık bir dizi
 * olarak kullanılıyor:
 *   welcome_screen_title, welcome_screen_message, welcome_screen_button_text
 *
 * "İlk ziyaret mi?" kararı sunucu tarafında, IP'nin hash'inin `known_visitors`
 * tablosunda daha önce görülüp görülmediğine bakılarak veriliyor — bu yüzden
 * farklı cihaz/tarayıcılardan aynı ağdan (aynı IP) gelindiğinde de tutarlı
 * çalışır ve kullanıcı çerezlerini temizlese bile tekrar tekrar gösterilmez.
 */
export default function WelcomeScreen() {
    const { settings, loaded } = useSettings();
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState('next'); // animasyon yönü: 'next' | 'prev'
    const touchStartX = useRef(null);
    const touchDeltaX = useRef(0);

    const isAdminPanel = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    const isEnabled = settings?.welcome_screen_enabled !== '0';
    const siteName = settings?.site_name || 'Asteria Scans';
    const logoUrl = settings?.logo_url || '';

    // Slaytları hazırla: yeni çoklu-slayt alanı varsa onu, yoksa eski tekli
    // alanlardan üretilen tek slaytlık bir diziyi kullan.
    const slides = useMemo(() => {
        const raw = settings?.welcome_screen_slides;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed
                        .filter(s => s && (s.title || s.message || s.image))
                        .map(s => ({
                            title: s.title || '',
                            message: s.message || '',
                            image: s.image || '',
                            buttonText: s.buttonText || '',
                        }));
                }
            } catch (e) { /* geçersiz JSON — eski alanlara düş */ }
        }
        return [{
            title: settings?.welcome_screen_title || 'Hoş geldin!',
            message: settings?.welcome_screen_message || 'Sitemize ilk kez uğruyorsun — bulunduğun için çok mutluyuz.',
            image: '',
            buttonText: settings?.welcome_screen_button_text || 'Keşfetmeye Başla',
        }];
    }, [settings]);

    const total = slides.length;
    const current = slides[Math.min(step, total - 1)] || slides[0];
    const isLast = step >= total - 1;
    const finalButtonText = current?.buttonText || settings?.welcome_screen_button_text || 'Keşfetmeye Başla';

    useEffect(() => {
        if (!loaded || !isEnabled || isAdminPanel) return;

        // Aynı sekme/oturumda birden fazla kez sorgulanmasın diye ekstra bir
        // istemci tarafı bayrak — asıl "ilk ziyaret mi" kararı sunucudan gelir.
        if (sessionStorage.getItem('welcome_screen_checked')) return;
        sessionStorage.setItem('welcome_screen_checked', '1');

        let cancelled = false;
        fetch('/api/welcome-check', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (!cancelled && data?.firstVisit) setVisible(true);
            })
            .catch(() => {});

        return () => { cancelled = true; };
    }, [loaded, isEnabled, isAdminPanel]);

    function handleClose() {
        setClosing(true);
        setTimeout(() => setVisible(false), 200);
    }

    function goNext() {
        if (isLast) { handleClose(); return; }
        setDir('next');
        setStep(s => Math.min(s + 1, total - 1));
    }

    function goPrev() {
        if (step === 0) return;
        setDir('prev');
        setStep(s => Math.max(s - 1, 0));
    }

    function goTo(i) {
        setDir(i > step ? 'next' : 'prev');
        setStep(i);
    }

    function onTouchStart(e) {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
    }
    function onTouchMove(e) {
        if (touchStartX.current === null) return;
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
    function onTouchEnd() {
        if (touchStartX.current === null) return;
        const dx = touchDeltaX.current;
        touchStartX.current = null;
        touchDeltaX.current = 0;
        if (dx <= -45) goNext();
        else if (dx >= 45) goPrev();
    }

    if (!loaded || !isEnabled || !visible) return null;

    return (
        <div
            className="ws-overlay"
            style={{ opacity: closing ? 0 : 1 }}
            onClick={handleClose}
        >
            {/* Parlama efekti */}
            <div className="ws-glow" />

            <div
                className="ws-card"
                style={{ transform: closing ? 'scale(0.96)' : 'scale(1)' }}
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Glass shimmer efekti */}
                <div className="ws-shimmer" />

                {/* Kapat butonu */}
                <button
                    onClick={handleClose}
                    aria-label="Kapat"
                    className="ws-close-btn"
                >
                    ✕
                </button>

                {/* Görsel / GIF alanı ya da logo rozeti */}
                {current?.image ? (
                    <div className="ws-media" key={`img-${step}`}>
                        <img
                            src={current.image}
                            alt={current.title || siteName}
                            className="ws-media-img"
                            decoding="async"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                ) : (
                    <div className="ws-badge">
                        {logoUrl ? (
                            <img src={logoUrl} alt={siteName} style={{ width: '62%', height: '62%', objectFit: 'contain' }} decoding="async" />
                        ) : (
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        )}
                    </div>
                )}

                <div key={`text-${step}`} className={`ws-text ws-anim-${dir}`}>
                    <h2 className="ws-title">{current?.title}</h2>
                    <p className="ws-message">{current?.message}</p>
                </div>

                {/* İlerleme noktaları */}
                {total > 1 && (
                    <div className="ws-dots" role="tablist" aria-label="Karşılama adımları">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                role="tab"
                                aria-selected={i === step}
                                aria-label={`${i + 1}. adım`}
                                className={`ws-dot ${i === step ? 'ws-dot-active' : ''}`}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>
                )}

                {/* Alt aksiyon satırı */}
                <div className="ws-actions">
                    {!isLast && total > 1 ? (
                        <button onClick={handleClose} className="ws-skip-btn">
                            Geç
                        </button>
                    ) : <span />}

                    <div className="ws-actions-right">
                        {step > 0 && (
                            <button onClick={goPrev} aria-label="Geri" className="ws-prev-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                        )}
                        <button onClick={goNext} className="ws-next-btn">
                            {isLast ? finalButtonText : 'İleri'}
                            {!isLast && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M9 6l6 6-6 6" /></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .ws-overlay {
                    position: fixed; inset: 0; z-index: 99999;
                    background: rgba(0,0,0,0.65);
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    transition: opacity 0.2s ease;
                }
                .ws-glow {
                    position: absolute; inset: 0; pointer-events: none;
                    background: radial-gradient(ellipse at 25% 20%, rgba(34,197,94,0.10) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(99,102,241,0.10) 0%, transparent 50%);
                }
                .ws-card {
                    max-width: 460px; width: 100%;
                    max-height: min(640px, 92vh);
                    overflow-y: auto;
                    background: rgba(24, 24, 38, 0.92);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 40px 32px 28px;
                    box-shadow: 0 25px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset;
                    text-align: center;
                    position: relative;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    transition: transform 0.2s ease;
                }
                .ws-shimmer {
                    position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                }
                .ws-close-btn {
                    position: absolute; top: 14px; right: 14px;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6);
                    cursor: pointer; font-size: 1.05rem; line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                    z-index: 2;
                }
                .ws-close-btn:hover {
                    background: rgba(255,255,255,0.15);
                    color: #fff;
                }
                .ws-badge {
                    width: 76px; height: 76px; border-radius: 50%;
                    background: linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(99,102,241,0.1) 100%);
                    border: 1px solid rgba(34,197,94,0.3);
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 20px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(34,197,94,0.2);
                }
                .ws-media {
                    width: 100%;
                    max-width: 320px;
                    margin: 0 auto 20px;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 12px 36px rgba(0,0,0,0.35);
                    background: rgba(255,255,255,0.03);
                }
                .ws-media-img {
                    display: block;
                    width: 100%;
                    max-height: 220px;
                    object-fit: cover;
                }
                .ws-text { animation: wsFadeIn 0.28s ease; }
                @keyframes wsFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .ws-title {
                    margin: 0 0 10px;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #fff;
                    line-height: 1.3;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .ws-message {
                    margin: 0 0 22px;
                    font-size: 0.94rem;
                    color: rgba(255,255,255,0.75);
                    line-height: 1.7;
                    white-space: pre-line;
                }
                .ws-dots {
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .ws-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    border: none; cursor: pointer; padding: 0;
                    transition: all 0.25s ease;
                }
                .ws-dot-active {
                    width: 22px;
                    background: linear-gradient(135deg, #22c55e 0%, #6366f1 100%);
                }
                .ws-actions {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 10px;
                }
                .ws-actions-right {
                    display: flex; align-items: center; gap: 8px;
                    margin-left: auto;
                }
                .ws-skip-btn {
                    background: transparent; border: none;
                    color: rgba(255,255,255,0.45);
                    font-size: 0.85rem; font-weight: 600;
                    cursor: pointer; padding: 10px 6px;
                    transition: color 0.2s;
                }
                .ws-skip-btn:hover { color: rgba(255,255,255,0.75); }
                .ws-prev-btn {
                    width: 42px; height: 42px; border-radius: 12px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.7);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; flex-shrink: 0;
                    transition: all 0.2s;
                }
                .ws-prev-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
                .ws-next-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 12px 28px;
                    background: linear-gradient(135deg, #22c55e 0%, #6366f1 100%);
                    color: #fff; border-radius: 14px; font-weight: 700;
                    font-size: 0.92rem;
                    border: none; cursor: pointer;
                    box-shadow: 0 8px 24px rgba(34,197,94,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                }
                .ws-next-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px rgba(34,197,94,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset;
                }

                @media (max-width: 480px) {
                    .ws-overlay { padding: 12px; align-items: flex-end; }
                    .ws-card {
                        max-width: 100%;
                        border-radius: 22px 22px 18px 18px;
                        padding: 32px 20px 22px;
                        max-height: 88vh;
                    }
                    .ws-media { max-width: 100%; }
                    .ws-media-img { max-height: 170px; }
                    .ws-title { font-size: 1.2rem; }
                    .ws-message { font-size: 0.88rem; margin-bottom: 18px; }
                    .ws-next-btn { padding: 12px 22px; font-size: 0.88rem; flex: 1; }
                    .ws-actions-right { flex: 1; }
                    .ws-skip-btn { flex-shrink: 0; }
                }
            `}</style>
        </div>
    );
}
