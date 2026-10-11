import React from 'react';
import { ShieldIcon, TrashIcon } from '@/components/admin/AdminIcons';
import AdminPager from '@/components/admin/AdminPager';

export default function BugReportsTab({
  bugReports,
  setBugReports,
  reportsLoading,
  setReportsLoading,
  authFetch,
  reportsPage,
  setReportsPage,
  updateReportStatus,
  deleteReport,
  ADMIN_PAGE_SIZE = 20
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <ShieldIcon />
          Hata Bildirimleri ({bugReports.length})
        </h2>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--bg-tertiary)' }}
          onClick={() => {
            setReportsLoading(true);
            authFetch('/api/admin/reports')
              .then(r => r.json())
              .then(d => { if (d.success) setBugReports(d.reports || []); })
              .catch(() => {})
              .finally(() => setReportsLoading(false));
          }}
        >
          {reportsLoading ? 'Yükleniyor...' : '🔄 Yenile'}
        </button>
      </div>

      {bugReports.length === 0 && !reportsLoading ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
          <ShieldIcon />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Henüz herhangi bir hata bildirimi alınmadı.</p>
        </div>
      ) : (
        <div className="admin-card" style={{ overflow: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Başlık</th>
                <th>Açıklama</th>
                <th>Gönderen</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {bugReports.slice((reportsPage - 1) * ADMIN_PAGE_SIZE, reportsPage * ADMIN_PAGE_SIZE).map(rep => (
                <tr key={rep.id}>
                  <td>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: rep.type === 'comment_report' ? 'rgba(236,72,153,0.15)' : 'rgba(99,102,241,0.15)',
                      color: rep.type === 'comment_report' ? '#f472b6' : '#818cf8',
                      fontWeight: 700
                    }}>
                      {rep.type === 'comment_report' ? 'Yorum' : 'Hata'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rep.title}</td>
                  <td style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: '0.8rem', padding: '10px 8px' }}>
                    {rep.description}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {rep.username ? (
                      <div>
                        <strong>{rep.username}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{rep.email}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Ziyaretçi (Anonim)</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(rep.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 50,
                      background: rep.status === 'resolved' ? 'rgba(34,197,94,0.15)' : rep.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: rep.status === 'resolved' ? '#22c55e' : rep.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      fontWeight: 700
                    }}>
                      {rep.status === 'resolved' ? 'Çözüldü' : rep.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {rep.status !== 'resolved' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => updateReportStatus(rep.id, 'resolved')}
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          Çözüldü
                        </button>
                      )}
                      {rep.status !== 'rejected' && (
                        <button
                          className="btn btn-sm"
                          onClick={() => updateReportStatus(rep.id, 'rejected')}
                          style={{ padding: '4px 8px', fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                        >
                          Reddet
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteReport(rep.id)}
                        style={{ padding: '6px 8px' }}
                        title="Raporu Sil"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager page={reportsPage} total={bugReports.length} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setReportsPage(p)} />
        </div>
      )}
    </>
  );
}
