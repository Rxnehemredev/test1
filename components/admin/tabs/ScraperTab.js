import React from 'react';
import { DownloadIcon, SyncIcon, LinkIcon } from '@/components/admin/AdminIcons';
import { safeHref } from '@/lib/security/safeUrl';

export default function ScraperTab({
  loadAllScraperSources,
  allScraperSourcesLoading,
  scraperSyncAll,
  scraperSyncLoading,
  scrapeNewUrl,
  setScrapeNewUrl,
  scrapeNewLang,
  setScrapeNewLang,
  scrapeNewLoading,
  setScrapeNewLoading,
  scrapeNewPreview,
  setScrapeNewPreview,
  handleCreateSeriesFromScrape,
  allScraperSources,
  setTab,
  openSeriesDetail,
  authFetch,
  show
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <DownloadIcon /> Bot (Scraper)
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadAllScraperSources} disabled={allScraperSourcesLoading}>
            {allScraperSourcesLoading ? 'Yükleniyor...' : <><SyncIcon /> Yenile</>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={scraperSyncAll} disabled={scraperSyncLoading}>
            {scraperSyncLoading ? 'Eşitleniyor...' : <><SyncIcon /> Tüm Kaynakları Eşitle</>}
          </button>
        </div>
      </div>

      {/* Create new series from URL */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
          <LinkIcon /> URL'den Yeni Seri Çek
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
          MangaDex, Comick.io veya desteklenen diğer sitelerden bir manga URL'si yapıştırın. Bot; seri bilgilerini ve kapağı çekecek, tüm bölümleri inceleme için hazırlayacaktır.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            type="url"
            className="form-input"
            placeholder="https://mangadex.org/title/... veya https://comick.io/comic/..."
            value={scrapeNewUrl}
            onChange={e => { setScrapeNewUrl(e.target.value); setScrapeNewPreview(null); }}
            style={{ flex: 1 }}
          />
          <select
            value={scrapeNewLang}
            onChange={e => { setScrapeNewLang(e.target.value); setScrapeNewPreview(null); }}
            title="Dil (Yalnızca MangaDex / Comick)"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', flexShrink: 0 }}
          >
            <option value="en">🇬🇧 English</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="pt-br">🇧🇷 Portuguese (BR)</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="es-la">🇲🇽 Spanish (LA)</option>
            <option value="fr">🇫🇷 French</option>
            <option value="de">🇩🇪 German</option>
            <option value="it">🇮🇹 Italian</option>
            <option value="id">🇮🇩 Indonesian</option>
            <option value="ru">🇷🇺 Russian</option>
            <option value="ar">🇸🇦 Arabic</option>
            <option value="ja">🇯🇵 Japanese</option>
            <option value="ko">🇰🇷 Korean</option>
            <option value="zh">🇨🇳 Chinese (Simp.)</option>
            <option value="zh-hk">🇹🇼 Chinese (Trad.)</option>
          </select>
          <button
            className="btn btn-ghost btn-sm"
            disabled={scrapeNewLoading || !scrapeNewUrl}
            onClick={async () => {
              if (!scrapeNewUrl.trim()) return;
              setScrapeNewLoading(true);
              try {
                const res = await authFetch('/api/admin/scrape', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'fetch-info', url: scrapeNewUrl.trim(), language: scrapeNewLang }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setScrapeNewPreview(data);
              } catch (e) {
                show(e.message, 'error');
              } finally {
                setScrapeNewLoading(false);
              }
            }}
          >
            {scrapeNewLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Önizleme'}
          </button>
        </div>
        {scrapeNewPreview && (
          <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {scrapeNewPreview.meta?.coverUrl && (
                <img src={scrapeNewPreview.meta.coverUrl} alt="" style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} decoding="async" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ fontSize: '1rem' }}>{scrapeNewPreview.meta?.title}</strong>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{scrapeNewPreview.site}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{scrapeNewPreview.chapters_count} bölüm bulundu</span>
                </div>
                {scrapeNewPreview.meta?.author && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Yazar: {scrapeNewPreview.meta.author}</div>}
                {scrapeNewPreview.meta?.genres?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {scrapeNewPreview.meta.genres.slice(0, 6).map(g => <span key={g} className="genre-tag" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>{g}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateSeriesFromScrape} disabled={scrapeNewLoading}>
                    {scrapeNewLoading ? 'Oluşturuluyor...' : `Seriyi Oluştur ve ${scrapeNewPreview.chapters_count} Bölümü Hazırla`}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setScrapeNewPreview(null); setScrapeNewUrl(''); }}>İptal</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All sources */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Aktif Kaynaklar ({allScraperSources.length})</h3>
          {allScraperSources.length === 0 && (
            <button className="btn btn-ghost btn-sm" onClick={loadAllScraperSources}>Kaynakları Yükle</button>
          )}
        </div>
        {allScraperSources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
            Henüz kaynak eklenmemiş. Bir seriyi açıp "Otomatik İçerik Çekme" alanından kaynak URL'si ekleyebilirsiniz.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Seri</th>
                <th>Site</th>
                <th>Kaynak URL</th>
                <th>Son Kontrol</th>
                <th>Son Bölüm</th>
                <th>Bekleyen</th>
                <th>Otomatik Eşitleme</th>
              </tr>
            </thead>
            <tbody>
              {allScraperSources.map(src => (
                <tr key={src.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                      onClick={() => { setTab('series'); openSeriesDetail(src.series_id); }}
                    >
                      {src.series_title}
                    </button>
                  </td>
                  <td><span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', textTransform: 'uppercase' }}>{src.source_site}</span></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <a href={safeHref(src.source_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>{src.source_url}</a>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {src.last_checked ? new Date(src.last_checked).toLocaleString() : 'Hiçbir Zaman'}
                  </td>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {src.last_chapter_found > 0 ? `Bölüm ${src.last_chapter_found}` : '-'}
                  </td>
                  <td>
                    {src.pending_count > 0 ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 50, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>
                        {src.pending_count} bekleyen
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.72rem', color: src.auto_sync ? '#22c55e' : 'var(--text-muted)' }}>
                      {src.auto_sync ? '✓ Açık' : 'Kapalı'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
