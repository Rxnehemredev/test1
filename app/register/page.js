'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import TurnstileWidget from '@/components/TurnstileWidget';
import { useSettings } from '@/components/SettingsProvider';

export default function RegisterPage() {
    const { register } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    const siteKey = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' ? (settings?.turnstile_site_key || '') : '';
    const siteName = settings?.site_name || '';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 12) {
            setError('Şifre en az 12 karakter olmalıdır');
            return;
        }

        if (siteKey && !turnstileToken) {
            setError('Lütfen insan doğrulamasını tamamlayın.');
            return;
        }

        setLoading(true);
        try {
            await register(username, email, password, turnstileToken);
            router.push('/');
        } catch (err) {
            setError(err.message);
            // Reset turnstile on failure
            if (siteKey && window.turnstile) {
                try { window.turnstile.reset(); } catch {}
            }
            setTurnstileToken('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card fade-in">
                <h1>Hesap Oluştur</h1>
                <p className="auth-subtitle">{siteName ? `${siteName}'e katılın — ${settings.auth_subtitle_register || 'dilediğiniz dilde manga okuyun'}` : (settings.auth_subtitle_register || 'dilediğiniz dilde manga okuyun')}</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Kullanıcı Adı</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="kullanici_adiniz"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label>E-posta</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="eposta@adresiniz.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label>Şifre</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="En az 12 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        {password.length > 0 && (
                            <div style={{ fontSize: '0.72rem', marginTop: 4, color: password.length >= 12 ? '#48bb78' : '#e53e3e' }}>
                                {password.length < 12 ? `En az ${12 - password.length} karakter daha gerekli` : '✓ Şifre uzunluğu uygun'}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Şifreyi Onayla</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <div style={{ fontSize: '0.72rem', marginTop: 4, color: '#e53e3e' }}>Şifreler eşleşmiyor</div>
                        )}
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
                        {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                    </button>
                </form>

                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                    Hesap oluşturarak,{' '}
                    <Link href="/terms" style={{ color: 'var(--accent-light)' }}>Kullanım Koşulları</Link>{' '}
                    ve{' '}
                    <Link href="/privacy" style={{ color: 'var(--accent-light)' }}>Gizlilik Politikası</Link>{' '}
                    sözleşmelerimizi kabul etmiş olursunuz.
                </p>

                <div className="auth-footer">
                    Zaten bir hesabınız var mı? <Link href="/login">Giriş Yap</Link>
                </div>
            </div>
        </div>
    );
}
