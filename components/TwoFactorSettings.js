'use client';
import { useState, useEffect } from 'react';

// Profil sayfasının "Ayarlar" sekmesine gömülen, kendi state'ini kendi
// yöneten 2FA kartı. authFetch üzerinden /api/auth/2fa/* endpoint'lerini
// kullanır — token/oturum yönetimiyle uğraşmaz, AuthProvider'a devreder.
export default function TwoFactorSettings({ authFetch }) {
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [error, setError] = useState('');

    // Kurulum akışı: idle -> setting-up (QR gösteriliyor) -> showing-backup-codes
    const [phase, setPhase] = useState('idle');
    const [setupData, setSetupData] = useState(null); // { secret, otpauthUrl, secretGrouped }
    const [confirmCode, setConfirmCode] = useState('');
    const [backupCodes, setBackupCodes] = useState(null);
    const [busy, setBusy] = useState(false);

    // Kapatma akışı
    const [showDisableForm, setShowDisableForm] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');

    async function loadStatus() {
        setLoadingStatus(true);
        try {
            const res = await authFetch('/api/auth/2fa/status');
            const data = await res.json();
            if (res.ok) setEnabled(!!data.enabled);
        } catch {} finally {
            setLoadingStatus(false);
        }
    }

    useEffect(() => { loadStatus(); }, []);

    async function startSetup() {
        setError('');
        setBusy(true);
        try {
            const res = await authFetch('/api/auth/2fa/setup', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSetupData(data);
            setPhase('setting-up');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function confirmSetup(e) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const res = await authFetch('/api/auth/2fa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: confirmCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setBackupCodes(data.backupCodes);
            setPhase('showing-backup-codes');
            setEnabled(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function finishSetup() {
        setPhase('idle');
        setSetupData(null);
        setConfirmCode('');
        setBackupCodes(null);
        loadStatus();
    }

    async function handleDisable(e) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const res = await authFetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: disablePassword, token: disableCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEnabled(false);
            setShowDisableForm(false);
            setDisablePassword('');
            setDisableCode('');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const qrImageUrl = setupData?.otpauthUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupData.otpauthUrl)}`
        : null;

    return (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-5z" /><path d="m9 12 2 2 4-4" /></svg>
                İki Adımlı Doğrulama (2FA)
            </h3>

            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

            {loadingStatus ? (
                <p style={{ opacity: 0.7 }}>Yükleniyor...</p>
            ) : phase === 'idle' && !showDisableForm ? (
                <div>
                    <p style={{ opacity: 0.8, marginBottom: 12 }}>
                        {enabled
                            ? '2FA hesabınızda aktif. Giriş yaparken şifrenize ek olarak authenticator uygulamanızdaki kod istenecek.'
                            : 'Hesabınıza ekstra bir güvenlik katmanı ekleyin. Aktifleştirdiğinizde, girişte şifrenize ek olarak Google Authenticator / Authy gibi bir uygulamadan 6 haneli kod istenir.'}
                    </p>
                    {enabled ? (
                        <button type="button" className="btn btn-danger" onClick={() => setShowDisableForm(true)}>
                            2FA'yı Kapat
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={startSetup} disabled={busy}>
                            {busy ? 'Hazırlanıyor...' : '2FA\'yı Etkinleştir'}
                        </button>
                    )}
                </div>
            ) : phase === 'setting-up' ? (
                <div>
                    <p style={{ opacity: 0.8, marginBottom: 12 }}>
                        1) Google Authenticator, Authy gibi bir uygulamayla aşağıdaki QR kodu okutun (veya anahtarı elle girin).<br />
                        2) Uygulamada beliren 6 haneli kodu aşağıya yazıp onaylayın.
                    </p>
                    {qrImageUrl && (
                        <img
                            src={qrImageUrl}
                            alt="2FA QR kodu"
                            width={220}
                            height={220}
                            style={{ borderRadius: 8, background: '#fff', padding: 8, marginBottom: 12 }}
                        />
                    )}
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, wordBreak: 'break-all', marginBottom: 16 }}>
                        Manuel giriş anahtarı: <code>{setupData?.secretGrouped}</code>
                    </p>
                    <form onSubmit={confirmSetup}>
                        <div className="form-group">
                            <label>Doğrulama Kodu</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="123456"
                                value={confirmCode}
                                onChange={(e) => setConfirmCode(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={busy || !confirmCode}>
                                {busy ? 'Doğrulanıyor...' : 'Onayla ve Etkinleştir'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setPhase('idle'); setSetupData(null); setConfirmCode(''); setError(''); }}>
                                Vazgeç
                            </button>
                        </div>
                    </form>
                </div>
            ) : phase === 'showing-backup-codes' ? (
                <div>
                    <div className="alert" style={{ marginBottom: 12 }}>
                        2FA etkinleşti! Aşağıdaki yedek kodları güvenli bir yere kaydedin — telefonunuzu
                        kaybederseniz hesabınıza bu kodlarla girebilirsiniz. Her kod SADECE BİR KEZ kullanılabilir
                        ve bu ekran kapandıktan sonra tekrar gösterilmez.
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                        fontFamily: 'monospace', background: 'var(--bg-secondary, #1a1a1a)',
                        padding: 16, borderRadius: 8, marginBottom: 16,
                    }}>
                        {backupCodes?.map((code) => <div key={code}>{code}</div>)}
                    </div>
                    <button type="button" className="btn btn-primary" onClick={finishSetup}>
                        Kaydettim, Tamam
                    </button>
                </div>
            ) : showDisableForm ? (
                <form onSubmit={handleDisable}>
                    <p style={{ opacity: 0.8, marginBottom: 12 }}>
                        2FA'yı kapatmak için mevcut şifrenizi ve authenticator uygulamanızdaki (veya bir yedek) kodu girin.
                    </p>
                    <div className="form-group">
                        <label>Şifre</label>
                        <input type="password" className="form-input" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} autoComplete="off" required />
                    </div>
                    <div className="form-group">
                        <label>Doğrulama Kodu veya Yedek Kod</label>
                        <input type="text" className="form-input" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} autoComplete="off" required />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-danger" disabled={busy}>
                            {busy ? 'İşleniyor...' : '2FA\'yı Kapat'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowDisableForm(false); setDisablePassword(''); setDisableCode(''); setError(''); }}>
                            Vazgeç
                        </button>
                    </div>
                </form>
            ) : null}
        </div>
    );
}
