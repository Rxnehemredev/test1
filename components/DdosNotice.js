'use client';
import { useState, useEffect, useCallback } from 'react';

// Ana sayfada Genel Sohbet'in yerine gösterilebilen "DDOS YEDİK" bildirim kartı.
// Ayarlardan (admin panel > Site Ayarları) etkinleştirilip düzenlenebilir.
export default function DdosNotice({ title, message, images = [] }) {
    const [activeIdx, setActiveIdx] = useState(null); // null = kapalı, sayı = açık lightbox index'i
    const validImages = Array.isArray(images) ? images.filter(Boolean) : [];

    const close = useCallback(() => setActiveIdx(null), []);
    const showPrev = useCallback((e) => {
        e?.stopPropagation();
        setActiveIdx((i) => (i === null ? null : (i - 1 + validImages.length) % validImages.length));
    }, [validImages.length]);
    const showNext = useCallback((e) => {
        e?.stopPropagation();
        setActiveIdx((i) => (i === null ? null : (i + 1) % validImages.length));
    }, [validImages.length]);

    useEffect(() => {
        if (activeIdx === null) return;
        function onKey(e) {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        }
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [activeIdx, close, showPrev, showNext]);

    return (
        <>
            <div className="section-header">
                <h2 className="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    Sistem Bildirimi
                </h2>
                <span className="ddos-live-badge">
                    <span className="ddos-live-dot" />
                    Aktif
                </span>
            </div>

            <div className="glass-panel ddos-card">
                <div className="ddos-heading">{title || 'DDOS YEDİK'}</div>
                {message && <p className="ddos-message">{message}</p>}

                {validImages.length > 0 && (
                    <div className={`ddos-image-grid ddos-grid-${Math.min(validImages.length, 4)}`}>
                        {validImages.map((src, idx) => (
                            <button
                                type="button"
                                key={idx}
                                className="ddos-image-thumb"
                                onClick={() => setActiveIdx(idx)}
                                aria-label="Görseli büyüt"
                            >
                                <img src={src} alt={`Bildirim görseli ${idx + 1}`} loading="lazy" decoding="async" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activeIdx !== null && validImages[activeIdx] && (
                <div className="ddos-lightbox" onClick={close}>
                    <button type="button" className="ddos-lightbox-close" onClick={close} aria-label="Kapat">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>

                    {validImages.length > 1 && (
                        <button type="button" className="ddos-lightbox-nav ddos-lightbox-prev" onClick={showPrev} aria-label="Önceki görsel">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                    )}

                    <img
                        src={validImages[activeIdx]}
                        alt={`Bildirim görseli ${activeIdx + 1}`}
                        className="ddos-lightbox-img"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {validImages.length > 1 && (
                        <button type="button" className="ddos-lightbox-nav ddos-lightbox-next" onClick={showNext} aria-label="Sonraki görsel">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    )}

                    {validImages.length > 1 && (
                        <div className="ddos-lightbox-counter">{activeIdx + 1} / {validImages.length}</div>
                    )}
                </div>
            )}

            <style jsx>{`
                .ddos-live-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: var(--danger);
                    background: color-mix(in srgb, var(--danger) 14%, transparent);
                    border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
                    padding: 4px 10px;
                    border-radius: 50px;
                }
                .ddos-live-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: var(--danger);
                    box-shadow: 0 0 0 0 rgba(245, 54, 92, 0.6);
                    animation: ddosPulse 1.6s infinite;
                }
                @keyframes ddosPulse {
                    0% { box-shadow: 0 0 0 0 rgba(245, 54, 92, 0.55); }
                    70% { box-shadow: 0 0 0 8px rgba(245, 54, 92, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(245, 54, 92, 0); }
                }

                .ddos-card {
                    padding: 28px 22px;
                    text-align: center;
                    border-radius: var(--radius-xl, 16px);
                    border-color: color-mix(in srgb, var(--danger) 25%, rgba(255,255,255,0.05));
                }
                .ddos-heading {
                    font-size: clamp(1.6rem, 5vw, 2.4rem);
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    color: var(--danger);
                    text-shadow: 0 0 24px color-mix(in srgb, var(--danger) 45%, transparent);
                    line-height: 1.15;
                    word-break: break-word;
                }
                .ddos-message {
                    margin: 10px auto 0;
                    max-width: 520px;
                    color: var(--text-secondary);
                    font-size: 0.92rem;
                    line-height: 1.5;
                }

                .ddos-image-grid {
                    display: grid;
                    gap: 12px;
                    margin-top: 20px;
                    grid-template-columns: repeat(2, 1fr);
                }
                .ddos-grid-1 { grid-template-columns: 1fr; max-width: 420px; margin-left: auto; margin-right: auto; }
                .ddos-grid-3 { grid-template-columns: repeat(3, 1fr); }
                .ddos-grid-4 { grid-template-columns: repeat(2, 1fr); }
                @media (min-width: 480px) {
                    .ddos-grid-4 { grid-template-columns: repeat(4, 1fr); }
                }

                .ddos-image-thumb {
                    display: block;
                    width: 100%;
                    padding: 0;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg, 10px);
                    overflow: hidden;
                    background: var(--bg-tertiary);
                    cursor: zoom-in;
                    aspect-ratio: 16 / 10;
                    transition: transform 0.18s ease, border-color 0.18s ease;
                }
                .ddos-image-thumb:hover {
                    transform: translateY(-2px);
                    border-color: var(--danger);
                }
                .ddos-image-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .ddos-lightbox {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: rgba(5, 5, 8, 0.92);
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    animation: ddosFadeIn 0.15s ease;
                }
                @keyframes ddosFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .ddos-lightbox-img {
                    max-width: min(92vw, 1100px);
                    max-height: 88vh;
                    border-radius: var(--radius-xl, 16px);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    object-fit: contain;
                    cursor: default;
                }
                .ddos-lightbox-close {
                    position: absolute;
                    top: 18px;
                    right: 18px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(255, 255, 255, 0.06);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.15s ease;
                }
                .ddos-lightbox-close:hover { background: rgba(255, 255, 255, 0.16); }

                .ddos-lightbox-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(255, 255, 255, 0.06);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.15s ease;
                }
                .ddos-lightbox-nav:hover { background: rgba(255, 255, 255, 0.16); }
                .ddos-lightbox-prev { left: 18px; }
                .ddos-lightbox-next { right: 18px; }

                .ddos-lightbox-counter {
                    position: absolute;
                    bottom: 22px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    padding: 4px 12px;
                    border-radius: 50px;
                }

                @media (max-width: 480px) {
                    .ddos-lightbox-nav { width: 38px; height: 38px; }
                    .ddos-lightbox-prev { left: 8px; }
                    .ddos-lightbox-next { right: 8px; }
                }
            `}</style>
        </>
    );
}
