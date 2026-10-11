import React from 'react';

export default function ReaderSupportCard({ appSettings }) {
    if (appSettings?.reader_support_enabled !== '1') return null;
    const text = appSettings.reader_support_text || 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.';
    const btnText = appSettings.reader_support_button_text || 'Destek Ol';
    const btnUrl = appSettings.reader_support_url || '#';

    return (
        <div style={{
            margin: '40px auto 12px',
            maxWidth: 500,
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            padding: '2px',
            background: 'rgba(30, 30, 35, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
            <div style={{
                position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
            }}>
                <div style={{
                    position: 'absolute', top: -30, left: -20, width: 160, height: 160,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
                    filter: 'blur(24px)',
                }}/>
                <div style={{
                    position: 'absolute', bottom: -20, right: -10, width: 130, height: 130,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                }}/>
            </div>
            <div style={{
                position: 'relative', zIndex: 1,
                borderRadius: 22,
                padding: '32px 28px 28px',
                background: 'rgba(20, 20, 25, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                textAlign: 'center',
            }}>
                <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
                    flexShrink: 0,
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </div>

                <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#ef4444',
                }}>Destek</div>

                <p style={{
                    color: '#d1d5db',
                    fontSize: '0.91rem',
                    lineHeight: 1.75,
                    margin: 0,
                    fontWeight: 400,
                    maxWidth: 380,
                }}>
                    {text}
                </p>

                <div style={{
                    width: '40%',
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}/>

                <a
                    href={btnUrl}
                    target={btnUrl !== '#' ? '_blank' : undefined}
                    rel={btnUrl !== '#' ? 'noopener noreferrer' : undefined}
                    onClick={e => e.stopPropagation()}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 32px',
                        borderRadius: 50,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {btnText}
                </a>
            </div>
        </div>
    );
}
