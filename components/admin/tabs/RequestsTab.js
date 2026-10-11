import React from 'react';
import { safeHref } from '@/lib/security/safeUrl';
import { REQ_STATUSES } from '@/components/admin/AdminIcons';
import AdminPager from '@/components/admin/AdminPager';

export default function RequestsTab({
  seriesRequests,
  setSeriesRequests,
  reqLoading,
  setReqLoading,
  reqFilter,
  setReqFilter,
  requestsPage,
  setRequestsPage,
  editingReq,
  setEditingReq,
  setConfirmModal,
  show,
  authFetch,
  ADMIN_PAGE_SIZE = 20
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          Seri İstekleri ({seriesRequests.length})
        </h2>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--bg-tertiary)' }}
          onClick={async () => {
            setReqLoading(true);
            try {
              const res = await authFetch('/api/series-requests?admin=1');
              const data = await res.json();
              setSeriesRequests(data.requests || []);
            } catch {}
            setReqLoading(false);
          }}
        >
          {reqLoading ? 'Yükleniyor...' : '↻ Yenile'}
        </button>
      </div>

      {/* Filtre sekmeleri */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ k: 'all', l: 'Tümü' }, ...REQ_STATUSES.map(s => ({ k: s.value, l: s.label }))].map(f => (
          <button
            key={f.k}
            onClick={() => { setReqFilter(f.k); setRequestsPage(1); }}
            style={{
              padding: '5px 12px',
              borderRadius: 50,
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: reqFilter === f.k ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: reqFilter === f.k ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      {reqLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).slice((requestsPage - 1) * ADMIN_PAGE_SIZE, requestsPage * ADMIN_PAGE_SIZE).map(req => {
            const st = REQ_STATUSES.find(s => s.value === req.status) || REQ_STATUSES[0];
            const isEditing = editingReq?.id === req.id;
            return (
              <div key={req.id} className="admin-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ fontSize: '0.95rem' }}>{req.series_title}</strong>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 50, background: st.color + '22', color: st.color, border: `1px solid ${st.color}55`, fontWeight: 700 }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 7px', background: 'var(--bg-tertiary)', borderRadius: 50, border: '1px solid var(--border-color)' }}>
                        {req.series_type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {req.author && <span>Yazar: {req.author}</span>}
                      <span>Ekleyen: <strong>{req.username}</strong></span>
                      <span>👍 {req.upvotes}</span>
                      <span>{new Date(req.created_at + 'Z').toLocaleDateString()}</span>
                    </div>
                    {req.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '6px 0 0' }}>{req.description}</p>}
                    {req.reason && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>"{req.reason}"</p>}
                    {req.source_url && <a href={safeHref(req.source_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-light)', wordBreak: 'break-all' }}>{req.source_url}</a>}
                    {req.admin_note && <p style={{ fontSize: '0.78rem', color: '#a5b4fc', margin: '6px 0 0', padding: '6px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: 6 }}>📝 {req.admin_note}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingReq(isEditing ? null : { id: req.id, status: req.status, admin_note: req.admin_note || '' })}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {isEditing ? 'İptal' : 'Düzenle'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.75rem' }}
                      onClick={() => setConfirmModal({
                        text: `"${req.series_title}" isteği silinsin mi?`,
                        action: async () => {
                          await authFetch('/api/series-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: req.id }) });
                          setSeriesRequests(prev => prev.filter(r => r.id !== req.id));
                          show('Silindi');
                        }
                      })}
                    >
                      Sil
                    </button>
                  </div>
                </div>

                {/* Düzenleme paneli */}
                {isEditing && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Durum:</label>
                      <select
                        value={editingReq.status}
                        onChange={e => setEditingReq(r => ({ ...r, status: e.target.value }))}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.82rem' }}
                      >
                        {REQ_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Yönetici Notu:</label>
                      <textarea
                        value={editingReq.admin_note}
                        onChange={e => setEditingReq(r => ({ ...r, admin_note: e.target.value }))}
                        placeholder="Kullanıcı için isteğe bağlı not..."
                        rows={2}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                      onClick={async () => {
                        const res = await authFetch('/api/series-requests', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'update-status', id: editingReq.id, status: editingReq.status, admin_note: editingReq.admin_note }),
                        });
                        if (res.ok) {
                          setSeriesRequests(prev => prev.map(r => r.id === editingReq.id ? { ...r, status: editingReq.status, admin_note: editingReq.admin_note } : r));
                          setEditingReq(null);
                          show('İstek güncellendi');
                        }
                      }}
                    >
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.9rem' }}>İstek bulunamadı.</div>
          )}
          <AdminPager
            page={requestsPage}
            total={seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={p => setRequestsPage(p)}
          />
        </div>
      )}
    </>
  );
}
