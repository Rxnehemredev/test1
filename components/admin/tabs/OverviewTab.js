import React from 'react';
import { ShieldIcon } from '@/components/admin/AdminIcons';

export default function OverviewTab({ stats }) {
  return (
    <>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Genel Bakış</h2>
      <div className="stat-grid">
        {[
          { v: stats?.totalSeries || 0, l: 'Seri' },
          { v: stats?.totalChapters || 0, l: 'Bölüm' },
          { v: stats?.totalPages || 0, l: 'Sayfa' },
          { v: stats?.totalUsers || 0, l: 'Kullanıcı' },
          { v: stats?.totalComments || 0, l: 'Yorum' }
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Sunucu Kaynak Kullanımı */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
          Sunucu Kaynak Kullanımı
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CPU Kullanımı</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8' }}>{stats?.cpuUsage ?? '0'}%</div>
            <div style={{ width: '100%', height: 4, background: 'rgba(129,140,248,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, parseInt(stats?.cpuUsage) || 0)}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #a78bfa)', borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>İşlemci yükü</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 19v-3"/><path d="M10 19v-6"/><path d="M14 19v-9"/><path d="M18 19v-12"/></svg>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RAM Kullanımı</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{stats?.ramUsage ?? '0'}%</div>
            <div style={{ width: '100%', height: 4, background: 'rgba(74,222,128,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, parseInt(stats?.ramUsage) || 0)}%`, height: '100%', background: 'linear-gradient(90deg, #4ade80, #22c55e)', borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{stats?.ramDetails ? `${stats.ramDetails.used} / ${stats.ramDetails.total}` : 'Bellek kullanımı'}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Depolama</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{stats?.storage?.total?.formatted || '0 B'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Toplam disk kullanımı</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Yedekler</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>{stats?.storage?.backups?.formatted || '0 B'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{stats?.storage?.backups?.count || 0} yedek dosyası</div>
          </div>
        </div>
      </div>

      {/* Depolama Bilgisi */}
      {stats?.storage && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Depolama Kullanımı
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { label: 'Yüklenen Bölüm Sayfaları', value: stats.storage?.uploads?.formatted || '0 B', icon: '🖼️' },
              { label: 'Veritabanı', value: stats.storage?.database?.formatted || '0 B', icon: '💾' },
              { label: 'Toplam', value: stats.storage?.total?.formatted || '0 B', icon: '📦', bold: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 14px', border: s.bold ? '1px solid var(--accent)' : '1px solid transparent' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: s.bold ? 'var(--accent-light)' : 'var(--text-primary)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-grid">
        <div className="admin-card">
          <h3><ShieldIcon /> Güvenlik</h3>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', paddingLeft: 20, lineHeight: 2.2, listStyle: 'none' }}>
            <li>• Şifreler: bcrypt (12 turlu)</li>
            <li>• Yetkilendirme: JWT jetonları (7 günlük geçerlilik)</li>
            <li>• Oturumlar: HttpOnly SameSite cookie</li>
          </ul>
        </div>
      </div>
    </>
  );
}
