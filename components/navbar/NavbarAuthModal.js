import React from 'react';
import { createPortal } from 'react-dom';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function NavbarAuthModal({
    isOpen,
    authModal,
    setAuthModal,
    onClose,
    authError,
    setAuthError,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authConfirmPassword,
    setAuthConfirmPassword,
    authUsername,
    setAuthUsername,
    authTurnstileToken,
    setAuthTurnstileToken,
    isFormSubmitting,
    handleAuthLogin,
    handleAuthRegister,
    settings,
}) {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="auth-modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="auth-modal-card">
                {/* Tab switcher */}
                <div className="auth-modal-tabs">
                    <button
                        className={`auth-modal-tab ${authModal === 'login' ? 'active' : ''}`}
                        onClick={() => { setAuthModal('login'); setAuthError(''); setAuthTurnstileToken(''); }}
                    >Giriş Yap</button>
                    <button
                        className={`auth-modal-tab ${authModal === 'register' ? 'active' : ''}`}
                        onClick={() => { setAuthModal('register'); setAuthError(''); setAuthTurnstileToken(''); }}
                    >Kayıt Ol</button>
                </div>

                <button className="auth-modal-close" onClick={onClose} aria-label="Kapat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>

                {authError && (
                    <div
                        className="alert alert-error"
                        role="alert"
                        aria-live="polite"
                        style={{ marginBottom: 16, fontSize: '0.82rem' }}
                    >{authError}</div>
                )}

                {authModal === 'login' ? (
                    <form onSubmit={handleAuthLogin}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Tekrar Hoş Geldiniz</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{settings?.auth_subtitle_login || 'Okumaya devam etmek için giriş yapın'}</p>
                        </div>
                        <div className="form-group">
                            <label>E-posta</label>
                            <input type="email" className="form-input" placeholder="eposta@adresiniz.com"
                                value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="off" />
                        </div>
                        <div className="form-group">
                            <label>Şifre</label>
                            <input type="password" className="form-input" placeholder="••••••••"
                                value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete="off" />
                        </div>
                        {settings?.turnstile_site_key && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' && (
                            <TurnstileWidget
                                siteKey={settings.turnstile_site_key}
                                onVerify={(token) => setAuthTurnstileToken(token || '')}
                                onError={() => setAuthError('Doğrulama hatası. Lütfen sayfayı yenileyin.')}
                            />
                        )}
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isFormSubmitting || (settings?.turnstile_site_key && !authTurnstileToken && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1')}>
                            {isFormSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
                            Hesabınız yok mu?{' '}
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
                                onClick={() => { setAuthModal('register'); setAuthError(''); setAuthTurnstileToken(''); }}>
                                Kayıt Ol
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleAuthRegister}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Hesap Oluştur</h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{settings?.auth_subtitle_register || 'Dilediğiniz dilde manga okuyun'}</p>
                        </div>
                        <div className="form-group">
                            <label>Kullanıcı Adı</label>
                            <input type="text" className="form-input" placeholder="kullanici_adiniz"
                                value={authUsername} onChange={e => setAuthUsername(e.target.value)} required minLength={3} autoComplete="off" />
                        </div>
                        <div className="form-group">
                            <label>E-posta</label>
                            <input type="email" className="form-input" placeholder="eposta@adresiniz.com"
                                value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="off" />
                        </div>
                        <div className="form-group">
                            <label>Şifre</label>
                            <input type="password" className="form-input" placeholder="En az 6 karakter"
                                value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete="new-password" />
                        </div>
                        <div className="form-group">
                            <label>Şifreyi Onayla</label>
                            <input type="password" className="form-input" placeholder="••••••••"
                                value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} required autoComplete="new-password" />
                        </div>
                        {settings?.turnstile_site_key && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' && (
                            <TurnstileWidget
                                siteKey={settings.turnstile_site_key}
                                onVerify={(token) => setAuthTurnstileToken(token || '')}
                                onError={() => setAuthError('Doğrulama hatası. Lütfen sayfayı yenileyin.')}
                            />
                        )}
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isFormSubmitting || (settings?.turnstile_site_key && !authTurnstileToken && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1')}>
                            {isFormSubmitting ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
                            Zaten hesabınız var mı?{' '}
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
                                onClick={() => { setAuthModal('login'); setAuthError(''); setAuthTurnstileToken(''); }}>
                                Giriş Yap
                            </button>
                        </p>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
