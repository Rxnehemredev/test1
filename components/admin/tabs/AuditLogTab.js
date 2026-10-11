import React from 'react';
import { AuditIcon } from '@/components/admin/AdminIcons';
import AdminPager from '@/components/admin/AdminPager';

export default function AuditLogTab({
  auditLogs,
  auditLoading,
  loadAuditLogs,
  auditSearch,
  setAuditSearch,
  auditPage,
  setAuditPage,
  auditActionFilter,
  setAuditActionFilter,
  ADMIN_PAGE_SIZE = 20
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <AuditIcon /> Denetim Kaydı
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>({auditLogs.length} kayıt)</span>
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={loadAuditLogs}>{auditLoading ? 'Yükleniyor...' : '↻ Yenile'}</button>
      </div>

      {/* Arama ve Filtre */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            className="form-input"
            placeholder="Yönetici adı veya detay ara..."
            style={{ paddingLeft: 32, fontSize: '0.85rem' }}
            value={auditSearch || ''}
            onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
          />
        </div>
        <select
          value={auditActionFilter || 'all'}
          onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem' }}
        >
          <option value="all">Tüm İşlemler</option>
          <option value="delete">Silme</option>
          <option value="add">Ekleme</option>
          <option value="update">Güncelleme</option>
          <option value="create">Oluşturma</option>
          <option value="reset">Sıfırlama</option>
          <option value="change">Değişiklik</option>
        </select>
      </div>

      <div className="admin-card" style={{ overflow: 'auto' }}>
        {auditLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (() => {
          const q = (auditSearch || '').trim().toLowerCase();
          const af = auditActionFilter || 'all';
          const filtered = auditLogs.filter(log => {
            const matchSearch = !q || log.admin_username?.toLowerCase().includes(q) || log.details?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q);
            const matchAction = af === 'all' || log.action?.includes(af);
            return matchSearch && matchAction;
          });
          const paginated = filtered.slice((auditPage - 1) * ADMIN_PAGE_SIZE, auditPage * ADMIN_PAGE_SIZE);
          return (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Yönetici</th>
                    <th>İşlem</th>
                    <th>Özet</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(log => {
                    const isDel = log.action?.includes('delete') || log.action?.includes('ban');
                    const isAdd = log.action?.includes('add') || log.action?.includes('create') || log.action?.includes('upload');
                    const badgeBg = isDel ? 'rgba(239,68,68,0.15)' : isAdd ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)';
                    const badgeColor = isDel ? '#f87171' : isAdd ? '#4ade80' : 'var(--accent-light)';
                    let detailShort = log.details || '';
                    try {
                      const parsed = JSON.parse(detailShort);
                      if (parsed && typeof parsed === 'object') {
                        const val = parsed.title || parsed.username || parsed.name || parsed.series_title || Object.values(parsed)[0];
                        detailShort = val ? String(val).substring(0, 60) : detailShort.substring(0, 60);
                      }
                    } catch { detailShort = detailShort.substring(0, 80); }
                    return (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{log.admin_username}</td>
                        <td>
                          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                          {detailShort}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Kayıt bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
              <AdminPager page={auditPage} total={filtered.length} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setAuditPage(p)} />
            </>
          );
        })()}
      </div>
    </>
  );
}
