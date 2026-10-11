import React from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, TrashIcon, CheckIcon, UploadIcon, DownloadIcon } from '@/components/admin/AdminIcons';
import LazyMediaCard from '@/components/admin/LazyMediaCard';

export default function MediaTab({
  mediaView,
  setMediaView,
  setSelectedMediaSeries,
  setSelectedMediaChapter,
  setChapterPages,
  setSeriesChapterFolders,
  loadMediaFolders,
  setSelectedUserFolder,
  setUserFolderDetail,
  setUserFolderSearch,
  loadUserFolders,
  mediaFolderBreadcrumb,
  selectedMediaSeries,
  selectedMediaChapter,
  mediaFoldersLoading,
  mediaFolders,
  openMediaSeriesFolder,
  seriesChaptersLoading,
  seriesChapterFolders,
  setPreviewImage,
  setConfirmModal,
  openMediaChapterFolder,
  chapterPagesLoading,
  chapterPages,
  userFolderBreadcrumb,
  selectedUserFolder,
  userFolderSearch,
  userFoldersLoading,
  userFolders,
  openUserFolder,
  userFolderDetailLoading,
  userFolderDetail,
  loadMedia,
  mediaLoading,
  mediaPage,
  mediaFilter,
  setMediaFilter,
  exitSelectMode,
  mediaFiles,
  mediaTotal,
  mediaSelectMode,
  setMediaSelectMode,
  mediaSelected,
  setMediaSelected,
  toggleMediaSelectAll,
  mediaUploadCategory,
  setMediaUploadCategory,
  mediaUploading,
  mediaUploadRef,
  handleMediaUpload,
  toggleMediaSelect,
  mediaHasMore,
  mounted,
  handleBulkDownload,
  handleBulkDelete,
  bulkDeleting
}) {
  return (
    <>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ImageIcon /> Medya Kütüphanesi
      </h2>

      {/* ── Görünüm Seçici ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${mediaView === 'flat' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setMediaView('flat'); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Düz Liste
        </button>
        <button
          className={`btn btn-sm ${mediaView === 'folders' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setMediaView('folders');
            setSelectedMediaSeries(null);
            setSelectedMediaChapter(null);
            setChapterPages(null);
            setSeriesChapterFolders(null);
            loadMediaFolders();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Seri Klasörleri
        </button>
        <button
          className={`btn btn-sm ${mediaView === 'user-folders' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setMediaView('user-folders');
            setSelectedUserFolder(null);
            setUserFolderDetail(null);
            setUserFolderSearch('');
            loadUserFolders();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Kullanıcı Klasörleri
        </button>
      </div>

      {/* ══════════ KLASÖR GÖRÜNÜMÜ ══════════ */}
      {mediaView === 'folders' && (
        <>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {mediaFolderBreadcrumb().map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--border-color)' }}>/</span>}
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {/* ── Seri listesi ── */}
          {!selectedMediaSeries && (
            <>
              {mediaFoldersLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Klasörler yükleniyor...</div>
              ) : mediaFolders.length === 0 ? (
                <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: 'var(--text-muted)' }}>Henüz seri bulunamadı.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {mediaFolders.map(folder => (
                    <div
                      key={folder.seriesId}
                      onClick={() => openMediaSeriesFolder(folder)}
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 10, padding: 14, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        transition: 'border-color 0.15s, background 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {folder.coverUrl ? (
                          <img src={folder.coverUrl} alt={folder.title} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                        ) : (
                          <div style={{ width: 40, height: 56, borderRadius: 4, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }} title={folder.title}>{folder.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                            {folder.chapterCount} bölüm · {folder.pagesCount} sayfa
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{folder.totalSize}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Seri içi: Kapak + Bölüm listesi ── */}
          {selectedMediaSeries && !selectedMediaChapter && (
            <>
              {seriesChaptersLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }}>
                  <div className="spinner" />
                  <span>Bölümler yükleniyor...</span>
                </div>
              ) : seriesChapterFolders && (
                <>
                  {/* Kapak Görseli Klasörü */}
                  <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Kapak Görseli
                    </div>
                    {seriesChapterFolders.series?.coverUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={seriesChapterFolders.series.coverUrl}
                          alt="Kapak"
                          style={{ width: 60, height: 84, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                          onClick={() => setPreviewImage({ src: seriesChapterFolders.series.coverUrl, title: `${seriesChapterFolders.series.title} — Kapak` })}
                          onError={e => e.target.style.display='none'}
                        />
                        <div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{seriesChapterFolders.series.coverUrl.split('/').pop()}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{seriesChapterFolders.series.coverSize}</div>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ marginTop: 8, fontSize: '0.72rem' }}
                            onClick={() => setConfirmModal({ action: 'delete-media', body: { filePath: seriesChapterFolders.series.coverUrl }, text: `"${seriesChapterFolders.series.title}" kapak görselini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` })}
                          >
                            <TrashIcon /> Sil
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kapak görseli yok veya varsayılan kullanılıyor.</div>
                    )}
                  </div>

                  {/* Bölüm Klasörleri */}
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>Bölümler ({seriesChapterFolders.chapters?.length || 0})</div>
                  {seriesChapterFolders.chapters?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px 0' }}>Bu seriye ait bölüm bulunamadı.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {(seriesChapterFolders.chapters || []).map(ch => (
                        <div
                          key={ch.chapterId}
                          onClick={() => openMediaChapterFolder(ch)}
                          style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: 4,
                            transition: 'border-color 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Bölüm {ch.chapterNumber}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ch.pageCount} sayfa · {ch.dirSize}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Bölüm sayfaları ── */}
          {selectedMediaChapter && (
            <>
              {chapterPagesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }}>
                  <div className="spinner" />
                  <span>Sayfalar yükleniyor...</span>
                </div>
              ) : chapterPages && (
                <>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    {chapterPages.pages?.length || 0} sayfa
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {(chapterPages.pages || []).map(p => (
                      <div key={p.pageId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                        {!p.isShared && p.exists ? (
                          <img
                            src={p.path}
                            alt={`Sayfa ${p.pageNumber}`}
                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                            onClick={() => setPreviewImage({ src: p.path, title: `Sayfa ${p.pageNumber} — ${p.name}` })}
                            loading="lazy"
                            onError={e => { e.target.style.display='none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '3/4', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {p.isShared ? 'Paylaşılan' : 'Bulunamadı'}
                          </div>
                        )}
                        <div style={{ padding: '4px 6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          S.{p.pageNumber} · {p.sizeFormatted}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════ KULLANICI KLASÖR GÖRÜNÜMÜ ══════════ */}
      {mediaView === 'user-folders' && (
        <>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {userFolderBreadcrumb().map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--border-color)' }}>/</span>}
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {/* ── Kullanıcı listesi ── */}
          {!selectedUserFolder && (
            <>
              {/* Arama */}
              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={userFolderSearch}
                  onChange={e => setUserFolderSearch(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%', maxWidth: 300 }}
                />
              </div>

              {userFoldersLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Kullanıcı klasörleri yükleniyor...</div>
              ) : userFolders.length === 0 ? (
                <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: 'var(--text-muted)' }}>Henüz kullanıcı bulunamadı.</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    {userFolders.filter(f => !userFolderSearch || f.username.toLowerCase().includes(userFolderSearch.toLowerCase())).length} kullanıcı
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {userFolders
                      .filter(f => !userFolderSearch || f.username.toLowerCase().includes(userFolderSearch.toLowerCase()))
                      .map(folder => (
                      <div
                        key={folder.userId}
                        onClick={() => openUserFolder(folder)}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: 10, padding: 14, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 8,
                          transition: 'border-color 0.15s, background 0.15s',
                          position: 'relative'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        {folder.orphanCount > 0 && (
                          <div style={{ position: 'absolute', top: 8, right: 8, background: '#f59e0b', color: '#000', fontSize: '0.6rem', fontWeight: 800, borderRadius: 4, padding: '1px 5px' }}>
                            {folder.orphanCount} sahipsiz
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {folder.avatarUrl ? (
                            <img
                              src={folder.avatarUrl}
                              alt={folder.username}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '2px solid var(--border-color)' }}
                              onError={e => { e.target.style.display='none'; }}
                            />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                              {folder.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }} title={folder.username}>
                              {folder.username}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {folder.role || 'user'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {folder.avatarUrl && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
                              Avatar
                            </span>
                          )}
                          {folder.coverUrl && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                              Kapak
                            </span>
                          )}
                          {folder.fileCount === 0 && !folder.orphanCount && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {folder.fileCount + folder.orphanCount} dosya · {folder.totalSize}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Seçili kullanıcının dosya detayı ── */}
          {selectedUserFolder && (
            <>
              {userFolderDetailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Yükleniyor...</div>
              ) : userFolderDetail && (
                <>
                  {/* Kullanıcı başlık kartı */}
                  <div style={{ padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {selectedUserFolder.avatarUrl ? (
                      <img src={selectedUserFolder.avatarUrl} alt={selectedUserFolder.username} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} onError={e => e.target.style.display='none'} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {selectedUserFolder.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedUserFolder.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedUserFolder.role || 'user'} · ID: {selectedUserFolder.userId}</div>
                    </div>
                  </div>

                  {/* Dosyalar */}
                  {userFolderDetail.files?.length === 0 ? (
                    <div className="admin-card" style={{ textAlign: 'center', padding: 30 }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bu kullanıcıya ait özel medya dosyası bulunamadı (varsayılan görseller kullanılıyor).</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                      {(userFolderDetail.files || []).map((file, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-card)', border: `1px solid ${file.type === 'orphan' ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                          {file.type === 'orphan' && (
                            <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 5, background: '#f59e0b', color: '#000', fontSize: '0.6rem', fontWeight: 800, borderRadius: 4, padding: '2px 6px' }}>
                              Sahipsiz
                            </div>
                          )}
                          {file.exists && !file.isExternal ? (
                            <img
                              src={file.path}
                              alt={file.label}
                              style={{ width: '100%', aspectRatio: file.type === 'cover' ? '3/1' : '1/1', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                              onClick={() => setPreviewImage({ src: file.path, title: `${selectedUserFolder.username} — ${file.label}` })}
                              loading="lazy"
                              onError={e => { e.target.style.display='none'; }}
                            />
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                          )}
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{file.label}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>{file.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{file.sizeFormatted}</div>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ marginTop: 8, fontSize: '0.7rem', width: '100%', justifyContent: 'center' }}
                              onClick={() => setConfirmModal({
                                action: 'delete-media',
                                body: { filePath: file.path },
                                text: `"${selectedUserFolder.username}" kullanıcısının "${file.label}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                              })}
                            >
                              <TrashIcon /> Sil
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════ DÜZ LİSTE GÖRÜNÜMÜ ══════════ */}
      {mediaView === 'flat' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => loadMedia(1, false, mediaFilter)}>
              {mediaLoading && mediaPage === 1 ? 'Yükleniyor...' : 'Yenile'}
            </button>
            {['all', 'covers', 'pages', 'user_images'].map(f => {
              const labelsTr = { all: 'Tümü', covers: 'Kapaklar', pages: 'Sayfalar', user_images: 'Kullanıcı Görselleri' };
              return (
                <button
                  key={f}
                  className={`btn btn-sm ${mediaFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    exitSelectMode();
                    setMediaFilter(f);
                    loadMedia(1, false, f);
                  }}
                >
                  {labelsTr[f] || f}
                </button>
              );
            })}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {mediaFiles.length} / {mediaTotal} dosya
            </span>
            {!mediaSelectMode ? (
              <button className="btn btn-sm btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={() => { setMediaSelectMode(true); setMediaSelected(new Set()); }}>
                <CheckIcon /> Seç
              </button>
            ) : (
              <button className="btn btn-sm btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={exitSelectMode}>
                İptal
              </button>
            )}
          </div>

          {mediaSelectMode && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.78rem' }} onClick={toggleMediaSelectAll}>
                {mediaSelected.size === mediaFiles.length && mediaFiles.length > 0 ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{mediaSelected.size} seçili</span>
            </div>
          )}

          {/* ── Görsel Yükleme Alanı ── */}
          {mediaFilter !== 'user_images' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <UploadIcon />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Görsel Yükle</span>
              <select
                value={mediaUploadCategory}
                onChange={e => setMediaUploadCategory(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              >
                <option value="covers">Kapaklar</option>
                <option value="pages">Sayfalar</option>
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: mediaUploading ? 'not-allowed' : 'pointer', background: 'var(--accent)', color: '#fff', padding: '6px 16px', borderRadius: 7, fontSize: '0.82rem', fontWeight: 700, opacity: mediaUploading ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                {mediaUploading ? 'Yükleniyor...' : <><UploadIcon /> Dosya Seç</>}
                <input
                  ref={mediaUploadRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={mediaUploading}
                  onChange={handleMediaUpload}
                />
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP, GIF, SVG — Otomatik WebP'ye dönüştürülür</span>
            </div>
          )}

          {mediaFilter === 'user_images' && (
            <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Kullanıcıların profil avatarları ve kapak fotoğrafları (DB + /uploads/avatars/ dizini birleşik). Görsele tıklayınca önizleme açılır. Silme işlemi dosyayı kaldırır ve kullanıcının profil kaydını temizler.
            </div>
          )}

          {mediaFiles.length === 0 && !mediaLoading ? (
            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
              <ImageIcon />
              <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Medya dosyalarını yüklemek için "Yenile"ye tıklayın.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {mediaFiles.map((m, i) => (
                  <LazyMediaCard
                    key={`${m.path}-${i}`}
                    m={m}
                    onPreview={() => setPreviewImage({ src: m.path, title: m.name })}
                    onDelete={() => setConfirmModal({ action: 'delete-media', body: { filePath: m.path }, text: `"${m.name}" dosyasını silmek istediğinize emin misiniz?` })}
                    selectionMode={mediaSelectMode}
                    selected={mediaSelected.has(m.path)}
                    onToggleSelect={toggleMediaSelect}
                  />
                ))}
              </div>
              {mediaHasMore && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button className="btn btn-secondary" onClick={() => loadMedia(mediaPage + 1, true, mediaFilter)} disabled={mediaLoading}>
                    {mediaLoading ? 'Yükleniyor...' : 'Daha Fazla Medya Yükle'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Floating bulk action bar ── */}
          {mediaSelectMode && mediaSelected.size > 0 && mounted && createPortal(
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 12, padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999, flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{mediaSelected.size} dosya seçildi</span>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleBulkDownload}
              >
                <DownloadIcon /> Seçilenleri İndir
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                <TrashIcon /> {bulkDeleting ? 'Siliniyor...' : 'Seçilenleri Sil'}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={exitSelectMode} style={{ fontSize: '0.78rem' }}>İptal</button>
            </div>,
            document.body
          )}
        </>
      )}
    </>
  );
}
