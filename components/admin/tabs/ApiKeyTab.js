import React from 'react';

export default function ApiKeyTab({
  turnstileLoaded,
  turnstileSiteKey,
  setTurnstileSiteKey,
  turnstileSecretKey,
  setTurnstileSecretKey,
  authFetch,
  show,
  fetchStats
}) {
  return (
    <div className="admin-card" style={{ maxWidth: 560, marginTop: 20 }}>
      <h3>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Cloudflare Turnstile
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>
        Giriş ve kayıt sayfalarını botlardan korur. Devre dışı bırakmak için boş bırakın.{' '}
        <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>Cloudflare'den anahtarları edinin</a>
        {turnstileLoaded && turnstileSiteKey && <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓ Aktif.</span>}
      </p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          const res = await authFetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turnstile_site_key: turnstileSiteKey,
              ...(turnstileSecretKey ? { turnstile_secret_key: turnstileSecretKey } : {}),
            }),
          });
          const d = await res.json();
          if (!d.success) throw new Error(d.error || 'Failed');
          show('Turnstile ayarları kaydedildi!');
          setTurnstileSecretKey('');
          fetchStats();
        } catch (err) {
          show(err.message, 'error');
        }
      }}>
        <div className="form-group">
          <label>Site Anahtarı (Site Key - public)</label>
          <input
            type="text"
            className="form-input"
            placeholder="0x4AAAAAAAxxxxxxxxxxxxxxxx"
            value={turnstileSiteKey}
            onChange={e => setTurnstileSiteKey(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Gizli Anahtar (Secret Key)</label>
          <input
            type="password"
            className="form-input"
            placeholder="Mevcut gizli anahtarı korumak için boş bırakın"
            value={turnstileSecretKey}
            onChange={e => setTurnstileSecretKey(e.target.value)}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Gizli anahtar sadece yazılabilir niteliktedir ve bir daha gösterilmez.</small>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Turnstile Kaydet
          </button>
          {turnstileSiteKey && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  const res = await authFetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ turnstile_site_key: '', turnstile_secret_key: '' }),
                  });
                  const d = await res.json();
                  if (!d.success) throw new Error(d.error);
                  setTurnstileSiteKey('');
                  setTurnstileSecretKey('');
                  show('Turnstile devre dışı bırakıldı.');
                  fetchStats();
                } catch (err) {
                  show(err.message, 'error');
                }
              }}
            >
              Devre Dışı Bırak
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
