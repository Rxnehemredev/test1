import React from 'react';
import { GlobeIcon, PlusIcon, EditIcon, TrashIcon } from '@/components/admin/AdminIcons';
import FormatToolbar from '@/components/admin/FormatToolbar';

export default function PagesTab({
  editingPage,
  setEditingPage,
  pageForm,
  setPageForm,
  savePage,
  pagesLoading,
  customPages,
  deletePage,
  saveMenus,
  menuSaving,
  navbarMenu,
  setNavbarMenu,
  footerMenu,
  setFooterMenu,
  addMenuItem,
  updateMenuItem,
  moveMenuItem,
  removeMenuItem
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobeIcon /> Sayfalar &amp; Menüler
        </h2>
      </div>

      {/* ── Özel Sayfalar ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Özel Sayfalar</h3>
          {editingPage === null && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPageForm({ title: '', slug: '', content: '', is_active: true, show_in_footer: true, show_in_navbar: false });
                setEditingPage('new');
              }}
            >
              <PlusIcon /> Yeni Sayfa
            </button>
          )}
        </div>

        {/* Page editor form */}
        {editingPage !== null && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 18, marginBottom: 18, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem' }}>
              {editingPage === 'new' ? 'Yeni Sayfa Oluştur' : `Düzenle: ${editingPage.title}`}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sayfa Başlığı *</label>
                <input
                  className="form-input"
                  placeholder="örn. Hakkımızda"
                  value={pageForm.title}
                  onChange={e => setPageForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>URL (slug)</label>
                <input
                  className="form-input"
                  placeholder="hakkimizda"
                  value={pageForm.slug}
                  onChange={e => setPageForm(f => ({ ...f, slug: e.target.value }))}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Boş bırakılırsa başlıktan otomatik oluşturulur. Erişim: /p/slug</small>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>İçerik (HTML destekler)</label>
              <FormatToolbar
                stateSetter={v => setPageForm(f => ({ ...f, content: v }))}
                stateValue={pageForm.content}
                textareaId="page-content-editor"
              />
              <textarea
                id="page-content-editor"
                className="form-input"
                rows={10}
                value={pageForm.content}
                onChange={e => setPageForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Sayfa içeriğini buraya yazın..."
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { key: 'is_active', label: 'Sayfa Aktif' },
                { key: 'show_in_footer', label: 'Footer\'da Göster' },
                { key: 'show_in_navbar', label: 'Navbar\'da Göster' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={!!pageForm[key]}
                    onChange={e => setPageForm(f => ({ ...f, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={savePage} disabled={!pageForm.title.trim()}>Kaydet</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPage(null)}>İptal</button>
            </div>
          </div>
        )}

        {/* Pages list */}
        {pagesLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : customPages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Henüz özel sayfa yok.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>URL</th>
                <th>Durum</th>
                <th>Menü</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {customPages.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td>
                    <a href={`/p/${encodeURIComponent(p.slug)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)', fontSize: '0.82rem' }}>/p/{p.slug}</a>
                  </td>
                  <td>
                    {p.is_active
                      ? <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>● Aktif</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>○ Gizli</span>}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {p.show_in_navbar && <span style={{ marginRight: 6 }}>Navbar</span>}
                    {p.show_in_footer && <span>Footer</span>}
                    {!p.show_in_navbar && !p.show_in_footer && '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPageForm({ title: p.title, slug: p.slug, content: p.content || '', is_active: !!p.is_active, show_in_footer: !!p.show_in_footer, show_in_navbar: !!p.show_in_navbar });
                          setEditingPage(p);
                        }}
                      >
                        <EditIcon /> Düzenle
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePage(p.id)}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Menü Yönetimi ── */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Menü Yönetimi</h3>
          <button className="btn btn-primary btn-sm" onClick={saveMenus} disabled={menuSaving}>
            {menuSaving ? 'Kaydediliyor...' : 'Menüleri Kaydet'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Navbar Menu */}
          {[
            { label: 'Navbar Menüsü', menu: navbarMenu, setter: setNavbarMenu },
            { label: 'Footer Menüsü', menu: footerMenu, setter: setFooterMenu },
          ].map(({ label, menu, setter }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{label}</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => addMenuItem(setter)}>
                  <PlusIcon /> Bağlantı Ekle
                </button>
              </div>
              {menu.length === 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>Henüz bağlantı yok.</div>
              )}
              {menu.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    className="form-input"
                    placeholder="Etiket"
                    value={item.label}
                    style={{ flex: '0 0 110px', fontSize: '0.82rem', padding: '5px 8px' }}
                    onChange={e => updateMenuItem(setter, idx, 'label', e.target.value)}
                  />
                  <input
                    className="form-input"
                    placeholder="/seriler"
                    value={item.url}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '5px 8px' }}
                    onChange={e => updateMenuItem(setter, idx, 'url', e.target.value)}
                  />
                  <button className="btn btn-ghost btn-sm" title="Yukarı" onClick={() => moveMenuItem(setter, idx, -1)} disabled={idx === 0} style={{ padding: '4px 7px' }}>↑</button>
                  <button className="btn btn-ghost btn-sm" title="Aşağı" onClick={() => moveMenuItem(setter, idx, 1)} disabled={idx === menu.length - 1} style={{ padding: '4px 7px' }}>↓</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeMenuItem(setter, idx)} style={{ padding: '4px 7px' }}><TrashIcon /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          URL olarak <code>/series</code>, <code>/ranking</code>, <code>/p/hakkimizda</code> gibi yerel yollar veya <code>https://...</code> şeklinde dış bağlantılar kullanabilirsiniz.
        </p>
      </div>
    </>
  );
}
