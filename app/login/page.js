'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import TurnstileWidget from '@/components/TurnstileWidget';
import { useSettings } from '@/components/SettingsProvider';

export default function LoginPage() {
    const { login, verify2FALogin } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    // 2FA — şifre doğru ama hesapta 2FA açıksa bu adıma geçilir.
    const [preAuthToken, setPreAuthToken] = useState('');
    const [twoFAMode, setTwoFAMode] = useState('code'); // 'code' | 'backup'
    const [twoFACode, setTwoFACode] = useState('');

    const siteKey = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' ? (settings?.turnstile_site_key || '') : '';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        // If Turnstile is configured and token not yet received, block
        if (siteKey && !turnstileToken) {
            setError('Lütfen insan doğrulamasını tamamlayın.');
            return;
        }
        setLoading(true);
        try {
            const data = await login(email, password, turnstileToken);
            if (data?.requires2FA) {
                setPreAuthToken(data.preAuthToken);
                setLoading(false);
                return;
            }
            // Tam sayfa yenilemesi — sunucu admin cookie'sini görsün, bakım modu bypass çalışsın
            window.location.href = '/';
        } catch (err) {
            setError(err.message);
            // Reset turnstile on failure
            if (siteKey && window.turnstile) {
                try { window.turnstile.reset(); } catch {}
            }
            setTurnstileToken('');
            setLoading(false);
        }
    }

    async function handle2FASubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verify2FALogin(
                preAuthToken,
                twoFAMode === 'code' ? { token: twoFACode } : { backupCode: twoFACode }
            );
            window.location.href = '/';
        } catch (err) {
            setError(err.message);
            setTwoFACode('');
        } finally {
            setLoading(false);
        }
    }

    // ── 2FA adımı: şifre doğrulandı, 6 haneli kod (veya yedek kod) bekleniyor ──
    if (preAuthToken) {
        return (
            <div className="auth-page">
                <div className="auth-card fade-in">
                    <h1>İki Adımlı Doğrulama</h1>
                    <p className="auth-subtitle">
                        {twoFAMode === 'code'
                            ? 'Authenticator uygulamanızdaki 6 haneli kodu girin'
                            : 'Yedek kodlarınızdan birini girin'}
                    </p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handle2FASubmit}>
                        <div className="form-group">
                            <label>{twoFAMode === 'code' ? 'Doğrulama Kodu' : 'Yedek Kod'}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={twoFAMode === 'code' ? '123456' : 'XXXXX-XXXXX'}
                                value={twoFACode}
                                onChange={(e) => setTwoFACode(e.target.value)}
                                autoComplete="off"
                                autoFocus
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 8 }}
                            disabled={loading || !twoFACode}
                        >
                            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color, #6366f1)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                            onClick={() => {
                                setTwoFAMode(twoFAMode === 'code' ? 'backup' : 'code');
                                setTwoFACode('');
                                setError('');
                            }}
                        >
                            {twoFAMode === 'code' ? 'Yedek kod kullan' : 'Doğrulama koduna dön'}
                        </button>
                        {' · '}
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color, #6366f1)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                            onClick={() => { setPreAuthToken(''); setTwoFACode(''); setError(''); }}
                        >
                            Geri dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card fade-in">
                <h1>Tekrar Hoş Geldiniz</h1>
                <p className="auth-subtitle">{settings.auth_subtitle_login || 'Okumaya devam etmek için giriş yapın'}</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>E-posta</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="eposta@adresiniz.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>

                    {siteKey && (
                        <TurnstileWidget
                            siteKey={siteKey}
                            onVerify={(token) => setTurnstileToken(token || '')}
                            onError={() => setError('Turnstile doğrulama hatası. Lütfen sayfayı yenileyin.')}
                        />
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={loading || (siteKey && !turnstileToken)}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="auth-footer">
                    Hesabınız yok mu? <Link href="/register">Kayıt Ol</Link>
                </div>
                <p style={{ fontSize: '0.72rem', opacity: 0.7, textAlign: 'center', marginTop: 8 }}>
                    Not: Yeni hesaplarda şifre en az 12 karakter olmalıdır. Mevcut hesaplarınız etkilenmez;
                    ancak 12 karakterden kısa bir şifreniz varsa profilinizden güncellemenizi öneririz.
                </p>
            </div>
        </div>
    );
}
