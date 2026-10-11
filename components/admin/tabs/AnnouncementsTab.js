import React from 'react';
import { MegaphoneIcon } from '@/components/admin/AdminIcons';
import { safeHref } from '@/lib/security/safeUrl';

export default function AnnouncementsTab({
  annMsg,
  setAnnMsg,
  annLink,
  setAnnLink,
  addAnnouncement,
  announcements,
  toggleAnn,
  deleteAnn
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MegaphoneIcon /> Duyurular
        </h2>
      </div>
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h3>Yeni Duyuru Oluştur</h3>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexDirection: 'column' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Duyuru mesajı... (örn. Discord sunucumuza katılın!)"
            value={annMsg}
            onChange={(e) => setAnnMsg(e.target.value)}
          />
          <input
            type="url"
            className="form-input"
            placeholder="İsteğe Bağlı URL Bağlantısı..."
            value={annLink}
            onChange={(e) => setAnnLink(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addAnnouncement} style={{ width: 120 }}>Yayınla</button>
        </div>
      </div>
      <div className="admin-card">
        <h3>Aktif ve Geçmiş Duyurular</h3>
        <table className="admin-table" style={{ marginTop: 15 }}>
          <thead>
            <tr>
              <th>Mesaj</th>
              <th>Bağlantı</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map(a => (
              <tr key={a.id}>
                <td>{a.message}</td>
                <td>
                  {a.link_url ? (
                    <a href={safeHref(a.link_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>Bağlantı</a>
                  ) : '-'}
                </td>
                <td>{a.is_active ? <span style={{ color: 'var(--success)' }}>Aktif</span> : 'Gizli'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleAnn(a.id, !a.is_active)}>
                    {a.is_active ? 'Gizle' : 'Göster'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteAnn(a.id)}>Sil</button>
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Henüz duyuru yayınlanmamış</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
