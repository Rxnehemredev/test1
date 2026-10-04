'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import TurnstileWidget from '@/components/TurnstileWidget';

// ══════════════════════════════════════════════════════════════════════════
// YÖNETİCİ GİRİŞ SAYFASI — /admin5
// Normal kullanıcı girişinden (/login) ayrıdır ve ayrı API kullanır:
//   POST /api/admin/auth/login  → sadece personel rolleri oturum açabilir.
// 2FA açıksa ikinci adım mevcut /api/auth/2fa/login-verify ile tamamlanır.
// ══════════════════════════════════════════════════════════════════════════

const STAFF_ROLES = ['admin', 'manager', 'moderator', 'team_member'];

const ERRORS_TR = {
    'Invalid email or password': 'E-posta veya şifre hatalı.',
    'Not authorized for admin panel': 'Bu hesabın yönetim paneline erişimi yok.',
    'Too many requests. Please try again later.': 'Çok fazla deneme yaptın. Yaklaşık 15 dakika sonra tekrar dene.',
    'Account suspended': 'Hesabın askıya alınmış.',
    'Login failed': 'Giriş yapılamadı. Lütfen tekrar dene.',
    'Email and password are required': 'E-posta ve şifre gerekli.',
    'Human verification required': 'Lütfen insan doğrulamasını tamamla.',
    'Human verification failed. Please try again.': 'İnsan doğrulaması başarısız. Lütfen tekrar dene.',
};

export default function AdminLoginPage() {
    const { user, loading: authLoading, verify2FALogin } = useAuth();
    const { settings } = useSettings();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    const [preAuthToken, setPreAuthToken] = useState('');
    const [twoFAMode, setTwoFAMode] = useState('code'); // 'code' | 'backup'
    const [twoFACode, setTwoFACode] = useState('');

    const siteKey = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' ? (settings?.turnstile_site_key || '') : '';
    const brandName = settings?.site_name || 'Asteria Scans';

    // Zaten personel olarak giriş yapılmışsa doğrudan panele geç
    useEffect(() => {
        if (!authLoading && user && STAFF_ROLES.includes(user.role)) {
            window.location.replace('/admin-panel');
        }
    }, [authLoading, user]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (siteKey && !turnstileToken) {
            setError('Lütfen insan doğrulamasını tamamla.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, turnstileToken }),
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Sunucu beklenmeyen bir yanıt verdi (HTTP ${res.status}). Lütfen birkaç saniye sonra tekrar dene.`);
            }
            if (!res.ok) throw new Error(ERRORS_TR[data.error] || data.error || 'Giriş yapılamadı.');

            if (data.requires2FA) {
                setPreAuthToken(data.preAuthToken);
                setLoading(false);
                return;
            }
            // Tam sayfa yönlendirme: sunucu yeni oturum cookie'sini görsün
            window.location.href = '/admin-panel';
        } catch (err) {
            setError(err.message);
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
            window.location.href = '/admin-panel';
        } catch (err) {
            setError(err.message);
            setTwoFACode('');
            setLoading(false);
        }
    }

    const linkButton = {
        background: 'none', border: 'none', color: 'var(--primary-color, #6366f1)',
        cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit',
    };

    const header = (
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span className="brand-wordmark" style={{ fontSize: '1.5rem' }}>{brandName}</span>
        </div>
    );

    // ── 2. adım: 6 haneli kod / yedek kod ──────────────────────────────────
    if (preAuthToken) {
        return (
            <div className="auth-page" style={{ width: '100%' }}>
                <div className="auth-card fade-in">
                    {header}
                    <h1>İki Adımlı Doğrulama</h1>
                    <p className="auth-subtitle">
                        {twoFAMode === 'code'
                            ? 'Authenticator uygulamandaki 6 haneli kodu gir'
                            : 'Yedek kodlarından birini gir'}
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
                                autoComplete="one-time-code"
                                inputMode={twoFAMode === 'code' ? 'numeric' : 'text'}
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
                            style={linkButton}
                            onClick={() => { setTwoFAMode(twoFAMode === 'code' ? 'backup' : 'code'); setTwoFACode(''); setError(''); }}
                        >
                            {twoFAMode === 'code' ? 'Yedek kod kullan' : 'Doğrulama koduna dön'}
                        </button>
                        {' · '}
                        <button
                            type="button"
                            style={linkButton}
                            onClick={() => { setPreAuthToken(''); setTwoFACode(''); setError(''); }}
                        >
                            Geri dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 1. adım: e-posta + şifre ───────────────────────────────────────────
    return (
        <div className="auth-page" style={{ width: '100%' }}>
            <div className="auth-card fade-in">
                {header}
                <h1>Yönetici Girişi</h1>
                <p className="auth-subtitle">Yönetim paneline erişmek için personel hesabınla giriş yap</p>

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
                            autoComplete="username"
                            autoCapitalize="none"
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
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {siteKey && (
                        <TurnstileWidget
                            siteKey={siteKey}
                            onVerify={(token) => setTurnstileToken(token || '')}
                            onError={() => setError('Doğrulama hatası. Lütfen sayfayı yenile.')}
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
                    <Link href="/">← Siteye dön</Link>
                </div>
            </div>
        </div>
    );
}
