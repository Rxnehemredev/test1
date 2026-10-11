'use client';

import React from 'react';
import {
    BookIcon, PlusIcon, SyncIcon, EditIcon, EyeIcon, TrashIcon, BackIcon,
    DownloadIcon, TagIcon, UploadIcon, CheckIcon, ImageIcon, ClockIcon
} from '../AdminIcons';
import AdminPager from '../AdminPager';
import FormatToolbar from '../FormatToolbar';
import { GENRE_TR } from '@/lib/constants/genres';

export default function SeriesTab(props) {
    const {
        user,
        allSeries,
        selectedSeriesIds,
        setSelectedSeriesIds,
        subView,
        setSubView,
        resetForm,
        handleCreateSeries,
        submitting,
        detailSeries,
        setDetailSeries,
        editMode,
        setEditMode,
        handleUpdateSeries,
        handleDeleteSeries,
        openSeriesDetail,
        // Series form fields
        sTitle, setSTitle,
        sDesc, setSDesc,
        sCoverPreview, setSCoverPreview,
        sAuthor, setSAuthor,
        sArtist, setSArtist,
        sAltTitles, setSAltTitles,
        sGenres, setSGenres,
        sStatus, setSStatus,
        sType, setSType,
        sSlug, setSSlug,
        sCustomUrl, setSCustomUrl,
        sShowInSlider, setSShowInSlider,
        sSliderOrder, setSSliderOrder,
        sPinned, setSPinned,
        sStaffPick, setSStaffPick,
        sAgeRating, setSAgeRating,
        sRecommendation, setSRecommendation,
        sScheduleDays, setSScheduleDays,
        sScheduleTime, setSScheduleTime,
        sScheduleEnabled, setSScheduleEnabled,
        sCustomScore, setSCustomScore,
        sCustomVotes, setSCustomVotes,
        sExternalId, setSExternalId,
        sCoverSource, setSCoverSource,
        sReleaseDate, setSReleaseDate,
        sAdult, setSAdult,
        sShowAd, setSShowAd,
        // Genres
        genres, genresLoading, newGenreName, setNewGenreName,
        deletedDefaultGenres, addGenre, deleteGenre, restoreGenre,
        // Chapters
        chapters, chapterPage, setChapterPage, CHAPTERS_PER_PAGE,
        selectedChapters, setSelectedChapters,
        chapterNumber, setChapterNumber,
        chapterTitle, setChapterTitle,
        chapterType, setChapterType,
        chapterPages, setChapterPages,
        chapterNovelContent, setChapterNovelContent,
        chapterVolume, setChapterVolume,
        chapterScheduledAt, setChapterScheduledAt,
        chapterPrice, setChapterPrice,
        chapterStatus, setChapterStatus,
        chapterBulkFiles, setChapterBulkFiles,
        chapterBulkUploading, handleBulkUploadChapters,
        handleAddChapter, handleDeleteChapter, handleBulkDeleteChapters,
        startEditChapter, saveEditedChapter, cancelEditChapter,
        editingChapterId, quickEditPrice, setQuickEditPrice,
        viewPagesChapterId, setViewPagesChapterId,
        viewPages, setViewPages, viewPagesLoading, handleViewChapterPages,
        // Utilities & Actions
        compressCoverImage, handleCoverUpload, insertFormat,
        setPreviewImage, setConfirmModal, show, authFetch, safeJson,
        loadStats, fDate,
    } = props;

    function renderSeriesForm() {
        return (
            <div style={{ marginTop: 12 }}>
                <div className="form-group">
                    <label>Title *</label>
                    <input className="form-input" value={sTitle} onChange={e => setSTitle(e.target.value)} required placeholder="e.g. Shadow Ronin" />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-input" rows={3} value={sDesc} onChange={e => setSDesc(e.target.value)} style={{ resize: 'vertical' }} placeholder="Series synopsis..." />
                </div>
                <div className="form-group">
                    <label><ImageIcon /> Cover Image</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input type="file" className="form-input" accept="image/*" onChange={handleCoverSelect} style={{ padding: 8 }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recommended: 300x450px (2:3 ratio)</span>
                        </div>
                        {sCoverPreview && (
                            <div style={{ width: 60, height: 85, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                <img src={sCoverPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group"><label>Author</label><input className="form-input" value={sAuthor} onChange={e => setSAuthor(e.target.value)} placeholder="Author" /></div>
                    <div className="form-group"><label>Artist</label><input className="form-input" value={sArtist} onChange={e => setSArtist(e.target.value)} placeholder="Artist" /></div>
                </div>
                <div className="form-group">
                    <label>Alternatif İsimler (SEO — virgülle ayırın)</label>
                    <input className="form-input" placeholder="örn. Shadow Ronin, 影の浪人, 그림자 로닌" value={sAltNames} onChange={e => setSAltNames(e.target.value)} />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Arama motorları için serinin diğer adlarını ekleyin.</small>
                </div>
                <div className="form-group">
                    <label>Türler</label>
                    {/* Predefined genre tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {Object.keys(GENRE_TR).map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setSGenres(prev =>
                                    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                )}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    transition: 'all 0.15s',
                                    background: sGenres.includes(g) ? 'var(--accent)' : 'var(--bg-glass)',
                                    borderColor: sGenres.includes(g) ? 'var(--accent)' : 'var(--border-color)',
                                    color: sGenres.includes(g) ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                {GENRE_TR[g] || g}
                            </button>
                        ))}
                    </div>

                    {/* Selected genres list with remove buttons */}
                    {sGenres.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: 6 }}>
                                Seçili türler:
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {sGenres.map(g => (
                                    <span
                                        key={g}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 8px 3px 10px',
                                            borderRadius: 20,
                                            fontSize: '0.76rem',
                                            fontWeight: 600,
                                            background: 'var(--accent)',
                                            color: '#fff',
                                            border: '1px solid var(--accent)',
                                        }}
                                    >
                                        {GENRE_TR[g] || g}
                                        <button
                                            type="button"
                                            onClick={() => setSGenres(prev => prev.filter(x => x !== g))}
                                            title="Kaldır"
                                            style={{
                                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)',
                                                cursor: 'pointer', padding: '0 0 0 2px', fontSize: '0.85rem',
                                                lineHeight: 1, display: 'flex', alignItems: 'center',
                                            }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Tür Yönetimi Paneli ── */}
                    <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TagIcon /> Tür Yönetimi (Ekle / Sil)
                            </span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={loadGenres} style={{ fontSize: '0.72rem' }}>
                                {genresLoading ? '...' : '↻ Yenile'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Yeni tür adı (örn. Cultivation)"
                                value={newGenreName}
                                onChange={e => setNewGenreName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                                style={{ flex: 1, padding: '5px 10px', fontSize: '0.8rem' }}
                            />
                            <button type="button" className="btn btn-primary btn-sm" onClick={addGenre} style={{ fontSize: '0.8rem' }}>
                                + Ekle
                            </button>
                        </div>
                        {genresLoading ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                        ) : (
                            <>
                            {/* Varsayılan türler */}
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Varsayılan Türler ({genres.filter(g => g.isDefault).length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
                                    {genres.filter(g => g.isDefault).map(g => (
                                        <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', background: 'rgba(99,102,241,0.08)', borderRadius: 16, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.76rem' }}>
                                            <button type="button" onClick={() => { if (!sGenres.includes(g.name)) setSGenres(prev => [...prev, g.name]); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', padding: 0, fontSize: '0.76rem', fontWeight: 600 }}
                                                title="Seriye ekle">{GENRE_TR[g.name] || g.name}</button>
                                            {g.usageCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{g.usageCount}</span>}
                                            <button type="button" onClick={() => deleteGenre(g.id, g.name)}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 1px', fontSize: '0.85rem', lineHeight: 1 }}
                                                title="Varsayılan türü gizle">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Özel türler */}
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Özel Türler ({genres.filter(g => !g.isDefault).length})
                                </div>
                                {genres.filter(g => !g.isDefault).length === 0 ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Henüz özel tür yok.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {genres.filter(g => !g.isDefault).map(g => (
                                            <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', background: 'var(--bg-tertiary)', borderRadius: 16, border: '1px solid var(--border-color)', fontSize: '0.76rem' }}>
                                                <button type="button" onClick={() => { if (!sGenres.includes(g.name)) setSGenres(prev => [...prev, g.name]); }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0, fontSize: '0.76rem', fontWeight: 600 }}
                                                    title="Seriye ekle">{g.name}</button>
                                                {g.usageCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--accent-light)' }}>{g.usageCount}</span>}
                                                <button type="button" onClick={() => deleteGenre(g.id, g.name)}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 1px', fontSize: '0.85rem', lineHeight: 1 }}
                                                    title="Türü kalıcı sil">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Gizlenmiş varsayılan türler */}
                            {deletedDefaultGenres.length > 0 && (
                                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(251,191,36,0.06)', borderRadius: 6, border: '1px solid rgba(251,191,36,0.2)' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Gizlenmiş Varsayılan Türler ({deletedDefaultGenres.length}) — Geri yüklemek için tıklayın
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {deletedDefaultGenres.map(g => (
                                            <button key={g.name} type="button"
                                                onClick={() => restoreGenre(g.name)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(251,191,36,0.1)', borderRadius: 16, border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.76rem', color: '#fbbf24', cursor: 'pointer', fontWeight: 600 }}
                                                title="Geri yükle">
                                                ↺ {GENRE_TR[g.name] || g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 6, display: 'block' }}>
                            Tür adına tıklayarak bu seriye ekleyin. Yeni tür eklemek için yukarıdaki alana yazın. × ile kalıcı silin (tüm serilerden kaldırılır). Gizlenen türler arşiv filtresinde görünmez.
                        </small>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                        <label>Seri Durumu</label>
                        <select className="form-input" value={sStatus} onChange={e => setSStatus(e.target.value)}>
                            <option value="ongoing">Devam Ediyor</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="hiatus">Ara Verildi</option>
                            <option value="cancelled">İptal Edildi</option>
                            <option value="current">Güncel</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select className="form-input" value={sType} onChange={e => setSType(e.target.value)}>
                            <option value="manga">Manga</option>
                            <option value="manhwa">Manhwa</option>
                            <option value="manhua">Manhua</option>
                            <option value="comic">Comic</option>
                            <option value="novel">Novel</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Rating (0-10)</label>
                        <input type="number" className="form-input" min="0" max="10" step="0.1" value={sRating} onChange={e => setSRating(e.target.value)} />
                    </div>
                </div>
                {/* Adult Content Toggle */}
                <div className="form-group" style={{ marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                        <div
                            onClick={() => setSIsAdult(v => !v)}
                            style={{
                                width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                                background: sIsAdult ? '#ef4444' : 'var(--border-color)',
                                transition: 'background 0.2s', cursor: 'pointer'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 3, left: sIsAdult ? 23 : 3,
                                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </div>
                        <span style={{ fontWeight: 600, color: sIsAdult ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.88rem' }}>
                            🔞 Yetişkin İçeriği (18+)
                        </span>
                    </label>
                    {sIsAdult && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: '#ef4444' }}>⚠️ Yetişkin İçeriği Aktif:</strong> Bu seri için kapak görseli bulanık görünecek ve ziyaretçiler giriş yapmaları istenecektir. Giriş yapan kullanıcılar ise 18+ yaş onayı verdikten sonra seriyi görebilecektir.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
                            {tab === 'series' && !subView && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BookIcon /> Seriler ({allSeries.length})
                            </h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {allSeries.length > 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                        if (selectedSeriesIds.length === allSeries.length) setSelectedSeriesIds([]);
                                        else setSelectedSeriesIds(allSeries.map(s => s.id));
                                    }}>
                                        {selectedSeriesIds.length === allSeries.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setSubView('create'); }}>
                                    <PlusIcon /> Yeni Seri
                                </button>
                            </div>
                        </div>
                        {/* Toplu işlem araç çubuğu */}
                        {selectedSeriesIds.length > 0 && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(94,114,228,0.1)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, marginBottom: 14 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{selectedSeriesIds.length} seri seçildi</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <input type="file" accept="image/*" style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    show('Kapak görselleri güncelleniyor...', 'info');
                                                    const compressed = await compressCoverImage(file);
                                                    const fd = new FormData();
                                                    fd.append('cover', compressed);
                                                    fd.append('seriesIds', JSON.stringify(selectedSeriesIds));
                                                    const res = await authFetch('/api/admin?action=bulk-update-cover', { method: 'POST', body: fd });
                                                    const data = await safeJson(res);
                                                    show(data.message || 'Kapak görselleri güncellendi!', res.ok ? 'success' : 'error');
                                                    if (res.ok) { setSelectedSeriesIds([]); loadStats(); }
                                                } catch (err) { show(err.message || 'Bir hata oluştu', 'error'); }
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="btn btn-ghost btn-sm"><ImageIcon /> Toplu Kapak Ayarla</span>
                                    </label>
                                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                        action: 'bulk-delete-series',
                                        body: { seriesIds: JSON.stringify(selectedSeriesIds) },
                                        text: `Seçili ${selectedSeriesIds.length} seriyi silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                        onDone: async () => { setSelectedSeriesIds([]); loadStats(); }
                                    })}>
                                        <TrashIcon /> Seçilenleri Sil ({selectedSeriesIds.length})
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSeriesIds([])}>İptal</button>
                                </div>
                            </div>
                        )}
                        {allSeries.length === 0 ? (
                            <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Henüz seri yok. İlk seriyi oluşturun!</p>
                                <button className="btn btn-primary" onClick={() => { resetForm(); setSubView('create'); }}>
                                    <PlusIcon /> İlk Seriyi Oluştur
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                {allSeries.map(s => (
                                    <div key={s.id} className="admin-card"
                                        style={{ cursor: 'pointer', transition: 'transform 0.15s', outline: selectedSeriesIds.includes(s.id) ? '2px solid var(--accent)' : 'none', position: 'relative' }}
                                        onClick={(e) => {
                                            if (e.target.type === 'checkbox') return;
                                            if (selectedSeriesIds.length > 0) {
                                                setSelectedSeriesIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                                            } else {
                                                handleOpenSeriesCard(s.id);
                                            }
                                        }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                        {openingSeriesId === s.id && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 5 }}>
                                                <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{ position: 'relative', width: 60, height: 85, flexShrink: 0 }}>
                                                <div style={{ width: 60, height: 85, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                                                    <img src={s.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='85'%3E%3Crect width='60' height='85' fill='%231a1a2e'/%3E%3Ctext x='30' y='45' text-anchor='middle' fill='%23555' font-size='22'%3E📖%3C/text%3E%3C/svg%3E"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                                </div>
                                                <input type="checkbox" checked={selectedSeriesIds.includes(s.id)}
                                                    onChange={(e) => { e.stopPropagation(); setSelectedSeriesIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)); }}
                                                    style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</h3>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                                    <span className={`admin-badge ${s.published ? 'admin-role' : 'user-role'}`}>{s.published ? 'Yayında' : 'Taslak'}</span>
                                                    <span className="admin-badge user-role">{s.status}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {s.chapter_count || 0} bölüm · {(s.views || 0).toLocaleString()} görüntülenme · ★ {s.rating?.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ CREATE SERIES ═══════════════ */}
                {tab === 'series' && subView === 'create' && (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSubView(null)} style={{ marginBottom: 16 }}>
                            <BackIcon /> Back to Series
                        </button>
                        <div className="admin-card" style={{ maxWidth: 620 }}>
                            <h3><PlusIcon /> Create New Series</h3>
                            {renderSeriesForm()}
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button className="btn btn-primary" onClick={() => handleCreateSeries(true)} disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Publish'}
                                </button>
                                <button className="btn btn-ghost" onClick={() => handleCreateSeries(false)} disabled={submitting}>
                                    Save as Draft
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════════ SERIES DETAIL ═══════════════ */}
                {tab === 'series' && subView === 'detail' && detailSeries && (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSubView(null); setEditMode(false); }} style={{ marginBottom: 16 }}>
                            <BackIcon /> Back to Series
                        </button>

                        {/* Series info card */}
                        <div className="admin-card" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ width: 120, height: 170, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)', cursor: 'pointer', position: 'relative' }}
                                    onClick={() => setPreviewImage({ src: sCoverPreview || detailSeries.cover_url || '', title: `${detailSeries.title} — Cover` })}
                                    title="Click to preview">
                                    <img src={sCoverPreview || detailSeries.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='170'%3E%3Crect width='120' height='170' fill='%231a1a2e'/%3E%3Ctext x='60' y='90' text-anchor='middle' fill='%23555' font-size='32'%3E📖%3C/text%3E%3C/svg%3E"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ opacity: 0, transition: 'opacity 0.15s' }}
                                            onMouseOver={e => { e.currentTarget.style.opacity = '1'; }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    {!editMode ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                                <div>
                                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{detailSeries.title}</h2>
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                        <span className={`admin-badge ${detailSeries.published ? 'admin-role' : 'user-role'}`}>{detailSeries.published ? 'Published' : 'Draft'}</span>
                                                        <span className="admin-badge user-role">{detailSeries.status}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {detailSeries.id}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}><EditIcon /> Edit</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/seri/${detailSeries.slug || detailSeries.id}`, '_blank')}><EyeIcon /> View</button>
                                                    {(!isCustomRole || currentCustomPerms.includes('delete_series')) && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                            action: 'delete-series', body: { seriesId: detailSeries.id },
                                                            text: `Delete "${detailSeries.title}" and all its chapters & pages?`,
                                                            onDone: () => { setSubView(null); }
                                                        })}><TrashIcon /></button>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>{detailSeries.description || 'No description'}</p>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                {detailSeries.author && <span>Author: <strong>{detailSeries.author}</strong></span>}
                                                {detailSeries.artist && <span>Artist: <strong>{detailSeries.artist}</strong></span>}
                                                <span>Rating: <strong>★ {(detailSeries.rating || 0).toFixed(1)}</strong></span>
                                                <span>Views: <strong>{(detailSeries.views || 0).toLocaleString()}</strong></span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {renderSeriesForm()}
                                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                                <button className="btn btn-primary" onClick={() => handleUpdateSeries()} disabled={submitting}>
                                                    {submitting ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                {!detailSeries.published && (
                                                    <button className="btn btn-ghost" onClick={() => handleUpdateSeries(true)} disabled={submitting}>Publish Now</button>
                                                )}
                                                {detailSeries.published === 1 && (
                                                    <button className="btn btn-ghost" onClick={() => handleUpdateSeries(false)} disabled={submitting}>Unpublish</button>
                                                )}
                                                <button className="btn btn-ghost" onClick={() => { setEditMode(false); populateForm(detailSeries); }}>Cancel</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chapters Section */}
                        <div className="admin-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0 }}>Bölümler ({detailChapters.length})</h3>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {selectedChapters.length > 0 ? (
                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                            action: 'delete-selected-chapters', body: { seriesId: detailSeries.id, chapterIds: JSON.stringify(selectedChapters) },
                                            text: `Seçili ${selectedChapters.length} bölümü ve sayfalarını silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                            onDone: async () => { setSelectedChapters([]); await openSeriesDetail(detailSeries.id); }
                                        })}>
                                            <TrashIcon /> Seçilenleri Sil ({selectedChapters.length})
                                        </button>
                                    ) : (
                                        detailChapters.length > 0 && (
                                            <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                action: 'delete-all-chapters', body: { seriesId: detailSeries.id },
                                                text: `Tüm ${detailChapters.length} bölümü ve sayfalarını silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                                onDone: async () => { await openSeriesDetail(detailSeries.id); }
                                            })}>
                                                <TrashIcon /> Tümünü Sil
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Add chapter inline */}
                            <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <PlusIcon /> Tekli Bölüm Ekle
                                </h4>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer', color: '#38bdf8', fontWeight: 600, marginBottom: 10, padding: '8px 10px', background: 'rgba(56,189,248,0.06)', borderRadius: 6, border: '1px solid rgba(56,189,248,0.2)', width: 'fit-content' }}>
                                    <input type="checkbox" checked={cIsExternal} onChange={e => setCIsExternal(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                    Dış Bağlantılı Bölüm (sayfa yüklemeden, başka bir siteye yönlendir)
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ margin: 0, flex: '0 0 90px' }}>
                                        <label style={{ fontSize: '0.72rem' }}>Bölüm No</label>
                                        <input type="number" className="form-input" step="0.1" value={cNum} onChange={e => setCNum(e.target.value)} placeholder="1" />
                                    </div>
                                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                                        <label style={{ fontSize: '0.72rem' }}>Başlık (isteğe bağlı)</label>
                                        <input className="form-input" value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Bölüm başlığı" />
                                    </div>
                                    {cIsExternal ? (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 100%' }}>
                                            <label style={{ fontSize: '0.72rem' }}>Kaynak Bölüm URL'si *</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                value={cExternalUrl}
                                                onChange={e => setCExternalUrl(e.target.value)}
                                                placeholder="https://kaynak-site.com/seri/bolum-44"
                                                style={{ fontSize: '0.8rem' }}
                                            />
                                            <label style={{ fontSize: '0.72rem', marginTop: 6, display: 'block' }}>Bu bölüme özel uyarı metni (isteğe bağlı)</label>
                                            <textarea
                                                className="form-input"
                                                rows="2"
                                                value={cExternalNote}
                                                onChange={e => setCExternalNote(e.target.value)}
                                                placeholder="Boş bırakılırsa Ayarlar sayfasındaki varsayılan uyarı metni kullanılır"
                                                style={{ fontSize: '0.78rem', resize: 'vertical' }}
                                            />
                                        </div>
                                    ) : detailSeries?.type === 'novel' ? (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 100%' }}>
                                            <label style={{ fontSize: '0.72rem' }}>Bölüm Metni</label>
                                            <FormatToolbar stateSetter={setCContent} stateValue={cContent} textareaId="add-novel-content" />
                                            <textarea id="add-novel-content" className="form-input" rows="4" value={cContent} onChange={e => setCContent(e.target.value)} placeholder="Novel bölüm metnini buraya yapıştırın..." style={{ resize: 'vertical' }} />
                                        </div>
                                    ) : (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                                            <label style={{ fontSize: '0.72rem' }}>
                                                Görseller (isteğe bağlı)
                                                {cFiles && cFiles.length > 0 && (
                                                    <span style={{ color: 'var(--accent-light)', marginLeft: 6 }}>
                                                        {cFiles.length} dosya seçildi
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                ref={cFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="form-input"
                                                style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                                                onChange={e => setCFiles(e.target.files)}
                                            />
                                            <VercelUploadToggle style={{ marginTop: 4 }} />
                                        </div>
                                    )}
                                    <div className="form-group" style={{ margin: 0, flex: '0 0 200px' }}>
                                        <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <ClockIcon /> Zamanlanmış Yayın (isteğe bağlı)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={cPublishAt}
                                            onChange={e => setCPublishAt(e.target.value)}
                                            style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                                        />
                                        {cPublishAt && <small style={{ color: '#fbbf24', fontSize: '0.68rem' }}>⏰ Zamanlanmış</small>}
                                    </div>
                                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                                        <label style={{ fontSize: '0.72rem' }}>Küçük Görsel (Thumbnail)</label>
                                        <select className="form-input" value={cThumbMode} onChange={e => setCThumbMode(e.target.value)} style={{ fontSize: '0.75rem', padding: '5px 8px', marginBottom: 4 }}>
                                            <option value="none">Yok</option>
                                            <option value="auto">Oto (seri kapağı)</option>
                                            <option value="upload">Dosya Yükle</option>
                                        </select>
                                        {cThumbMode === 'upload' && (
                                            <input
                                                ref={cThumbFileRef}
                                                type="file"
                                                accept="image/*"
                                                className="form-input"
                                                onChange={e => setCThumbFile(e.target.files?.[0] || null)}
                                                style={{ fontSize: '0.72rem', padding: '5px 8px' }}
                                            />
                                        )}
                                        {cThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem' }}>✓ Seri kapağı kullanılacak</small>}
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleAddChapter}
                                        disabled={submitting || !cNum}
                                        style={{ height: 38, whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                        {submitting ? '...' : <><PlusIcon /> {cPublishAt ? 'Zamanla' : 'Ekle'}</>}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Bulk Upload Section */}
                            <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16, border: '1px dashed var(--border)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <UploadIcon /> Toplu Bölüm Yükle
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Her bölüm için alt klasörler barındıran bir ana klasör seçin (Örn: MangaKlasor / Bölüm 1 / 01.jpg).
                                </p>
                                <div style={{ marginBottom: 10 }}>
                                    <VercelUploadToggle />
                                </div>
                                <form onSubmit={handleBulkUpload} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="file"
                                        id="bulk-folder-input"
                                        webkitdirectory=""
                                        multiple
                                        onChange={e => setBulkFiles(e.target.files)}
                                        style={{ fontSize: '0.75rem', flex: '1 1 200px', minWidth: 0 }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Thumb:</span>
                                        <select value={bulkThumbMode} onChange={e => setBulkThumbMode(e.target.value)} style={{ fontSize: '0.75rem', padding: '5px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }}>
                                            <option value="none">Yok</option>
                                            <option value="auto">Oto (kapak)</option>
                                            <option value="upload">Dosya</option>
                                        </select>
                                        {bulkThumbMode === 'upload' && (
                                            <input
                                                ref={bulkThumbFileRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setBulkThumbFile(e.target.files?.[0] || null)}
                                                style={{ fontSize: '0.72rem', maxWidth: 160 }}
                                            />
                                        )}
                                        {bulkThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>✓ seri kapağı</small>}
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !bulkFiles} style={{ flexShrink: 0 }}>
                                        {submitting ? 'Yükleniyor...' : 'Toplu Yükle'}
                                    </button>
                                    {bulkStatus && <span style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>{bulkStatus}</span>}
                                </form>
                            </div>

                            {/* Bulk External URL Chapters Section */}
                            <div style={{ padding: 12, background: 'rgba(56,189,248,0.06)', borderRadius: 8, marginBottom: 16, border: '1px dashed rgba(56,189,248,0.35)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                    Toplu Dış Bağlantılı Bölüm Ekle
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                    Başka bir ekip tarafından yapılmış çok sayıda bölümü, sayfa yüklemeden sadece kaynak URL olarak ekleyin. Aşağıya her satıra bir bölüm gelecek şekilde <code>bölümNo|URL|başlık(opsiyonel)</code> formatında yapıştırın, ya da altındaki şablonla otomatik oluşturun.
                                </p>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={bulkExtTemplate}
                                        onChange={e => setBulkExtTemplate(e.target.value)}
                                        placeholder="https://kaynaksite.com/seri/bolum-{n}"
                                        style={{ flex: '1 1 260px', fontSize: '0.78rem' }}
                                    />
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-input"
                                        value={bulkExtStart}
                                        onChange={e => setBulkExtStart(e.target.value)}
                                        placeholder="Baş. no"
                                        style={{ width: 90, fontSize: '0.78rem' }}
                                    />
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-input"
                                        value={bulkExtEnd}
                                        onChange={e => setBulkExtEnd(e.target.value)}
                                        placeholder="Bit. no"
                                        style={{ width: 90, fontSize: '0.78rem' }}
                                    />
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={generateBulkExtLines}>
                                        Satırları Oluştur
                                    </button>
                                </div>

                                <textarea
                                    className="form-input"
                                    rows="6"
                                    value={bulkExtLines}
                                    onChange={e => setBulkExtLines(e.target.value)}
                                    placeholder={"1|https://kaynaksite.com/seri/bolum-1\n2|https://kaynaksite.com/seri/bolum-2|Özel Başlık\n3|https://kaynaksite.com/seri/bolum-3"}
                                    style={{ fontSize: '0.78rem', fontFamily: 'monospace', resize: 'vertical', marginBottom: 8 }}
                                />

                                <textarea
                                    className="form-input"
                                    rows="2"
                                    value={bulkExtNote}
                                    onChange={e => setBulkExtNote(e.target.value)}
                                    placeholder="Bu toplu ekleme için ortak uyarı metni (isteğe bağlı — boş bırakılırsa Ayarlar'daki varsayılan metin kullanılır)"
                                    style={{ fontSize: '0.78rem', resize: 'vertical', marginBottom: 10 }}
                                />

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={bulkExtBusy || !bulkExtLines.trim()}
                                        onClick={handleBulkExternalSubmit}
                                    >
                                        {bulkExtBusy ? 'Ekleniyor...' : `Bölümleri Ekle (${bulkExtLines.split('\n').filter(l => l.trim()).length})`}
                                    </button>
                                    {bulkExtStatus && <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{bulkExtStatus}</span>}
                                </div>
                            </div>

                            {/* ── Auto Import (Scraper) Section ── */}
                            <div style={{ padding: 14, background: 'rgba(99,102,241,0.06)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(99,102,241,0.25)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-light)' }}>
                                    <DownloadIcon /> Auto Import (Scraper)
                                    {scraperSources.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 50, background: 'rgba(99,102,241,0.2)', color: 'var(--accent-light)' }}>
                                        {scraperSources.length} source{scraperSources.length !== 1 ? 's' : ''}
                                    </span>}
                                </h4>

                                {/* Existing sources */}
                                {scraperSources.map(src => (
                                    <div key={src.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                                        <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{src.source_site}</span>
                                        <span style={{ fontSize: '0.78rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={src.source_url}>{src.source_url}</span>
                                        {src.last_checked && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>checked {new Date(src.last_checked).toLocaleDateString()}</span>}
                                        {src.last_chapter_found > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>last: ch.{src.last_chapter_found}</span>}
                                        <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                                            disabled={scraperImporting}
                                            onClick={() => scraperImport(detailSeries.id, src.source_url)}>
                                            {scraperImporting ? <span className="spinner" style={{ width: 10, height: 10 }} /> : <><SyncIcon /> Check New</>}
                                        </button>
                                        <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}
                                            onClick={() => setConfirmModal({ text: 'Remove this scraper source?', action: async () => { await scraperDeleteSource(src.id, detailSeries.id); show('Source removed'); } })}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}

                                {/* Add new source */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="Paste series URL (MangaDex, Comick, etc.)"
                                        value={scraperUrl}
                                        onChange={e => { setScraperUrl(e.target.value); setScraperFetchResult(null); }}
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                    />
                                    <select
                                        value={scraperLang}
                                        onChange={e => { setScraperLang(e.target.value); setScraperFetchResult(null); }}
                                        title="Language (MangaDex / Comick only)"
                                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', flexShrink: 0 }}>
                                        <option value="en">🇬🇧 English</option>
                                        <option value="tr">🇹🇷 Turkish</option>
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
                                    <button className="btn btn-ghost btn-sm" onClick={scraperFetch} disabled={scraperFetchLoading || !scraperUrl}>
                                        {scraperFetchLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Preview'}
                                    </button>
                                </div>

                                {/* Preview result */}
                                {scraperFetchResult && (
                                    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 10, fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                            <strong style={{ color: 'var(--accent-light)' }}>{scraperFetchResult.meta?.title}</strong>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{scraperFetchResult.site}</span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{scraperFetchResult.chapters_count} chapters found</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                            <select value={scraperPublishMode} onChange={e => setScraperPublishMode(e.target.value)}
                                                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem' }}>
                                                <option value="stage">Stage for review (publish manually)</option>
                                                <option value="publish">Download &amp; publish immediately</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}
                                                onClick={async () => { await scraperAddSource(detailSeries.id, scraperUrl); await scraperImport(detailSeries.id, scraperUrl); setScraperUrl(''); setScraperFetchResult(null); }}
                                                disabled={scraperImporting}>
                                                {scraperImporting ? 'Importing...' : `Link & Import ${scraperFetchResult.chapters_count} Chapters`}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }} onClick={() => setScraperFetchResult(null)}>Cancel</button>
                                        </div>
                                    </div>
                                )}

                                {/* Pending chapters list */}
                                {scraperPending.filter(p => p.status === 'pending').length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                {scraperPending.filter(p => p.status === 'pending').length} bölüm inceleme bekliyor
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {scraperSelectedPending.length > 0 && (
                                                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }}
                                                        disabled={scraperPublishing}
                                                        onClick={() => scraperPublishPending(scraperSelectedPending, detailSeries.id)}>
                                                        {scraperPublishing ? 'Yayınlanıyor...' : `Seçilenleri Yayınla (${scraperSelectedPending.length})`}
                                                    </button>
                                                )}
                                                <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', background: 'var(--success)' }}
                                                    disabled={scraperPublishing}
                                                    onClick={() => scraperPublishAllPending(detailSeries.id)}>
                                                    {scraperPublishing ? 'Yayınlanıyor...' : 'Tümünü Yayınla'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {scraperPending.filter(p => p.status === 'pending').map(p => (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-tertiary)', borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem' }}>
                                                    <input type="checkbox"
                                                        checked={scraperSelectedPending.includes(p.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) setScraperSelectedPending(prev => [...prev, p.id]);
                                                            else setScraperSelectedPending(prev => prev.filter(id => id !== p.id));
                                                        }}
                                                        style={{ width: 14, height: 14 }} />
                                                    <span style={{ color: 'var(--accent-light)', fontWeight: 700, minWidth: 40 }}>Bölüm {p.chapter_number}</span>
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{p.chapter_title}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {detailChapters.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                                    Henüz bölüm yok. Yukarıdan ilk bölümü ekleyin.
                                </p>
                            ) : (
                                <>
                                {/* Chapter search / filter */}
                                {detailChapters.length > CHAPTERS_PER_PAGE && (
                                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                        Toplam {detailChapters.length} bölüm · Sayfa başı {CHAPTERS_PER_PAGE} gösteriliyor
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {detailChapters.slice((chapterPage - 1) * CHAPTERS_PER_PAGE, chapterPage * CHAPTERS_PER_PAGE).map(ch => (
                                        <div key={ch.id}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, gap: 8, flexWrap: 'wrap'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedChapters.includes(ch.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedChapters(prev => [...prev, ch.id]);
                                                        else setSelectedChapters(prev => prev.filter(id => ch.id !== id));
                                                    }}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                />
                                                {editingChapterId === ch.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <input 
                                                                type="number" 
                                                                step="any" 
                                                                value={editChapNum} 
                                                                onChange={e => setEditChapNum(e.target.value)} 
                                                                className="form-input" 
                                                                style={{ width: 80, padding: '4px 8px' }} 
                                                                placeholder="No"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={editChapTitle} 
                                                                onChange={e => setEditChapTitle(e.target.value)} 
                                                                className="form-input" 
                                                                style={{ flex: 1, padding: '4px 8px' }} 
                                                                placeholder="Bölüm Başlığı"
                                                            />
                                                        </div>
                                                        {detailSeries?.type === 'novel' && (
                                                            <>
                                                                <FormatToolbar stateSetter={setEditChapContent} stateValue={editChapContent} textareaId="edit-novel-content" />
                                                                <textarea 
                                                                    id="edit-novel-content"
                                                                    className="form-input" 
                                                                    rows="5" 
                                                                    value={editChapContent} 
                                                                    onChange={e => setEditChapContent(e.target.value)} 
                                                                    placeholder="Novel bölüm metni..." 
                                                                    style={{ padding: '8px', resize: 'vertical' }}
                                                                />
                                                            </>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Küçük Görsel (Thumbnail)</label>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <select
                                                                    className="form-input"
                                                                    value={editChapThumbMode}
                                                                    onChange={e => {
                                                                        const m = e.target.value;
                                                                        setEditChapThumbMode(m);
                                                                        if (m === 'auto') setEditChapThumb(detailSeries?.cover_url || '');
                                                                        if (m === 'none') setEditChapThumb('');
                                                                    }}
                                                                    style={{ fontSize: '0.75rem', padding: '4px 8px', flex: '0 0 140px' }}
                                                                >
                                                                    <option value="none">Yok (sil)</option>
                                                                    <option value="auto">Oto (seri kapağı)</option>
                                                                    <option value="upload">Dosya Yükle</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm"
                                                                    onClick={() => handleAutoThumb(editingChapterId)}
                                                                    disabled={autoThumbLoading}
                                                                    title="Bölüm sayfalarından thumbnail oluştur"
                                                                    style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                                                                >
                                                                    {autoThumbLoading ? '...' : '⚡ 1. Sayfa'}
                                                                </button>
                                                            </div>
                                                            {editChapThumbMode === 'upload' && (
                                                                <input
                                                                    ref={editChapThumbFileRef}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="form-input"
                                                                    onChange={e => setEditChapThumbFile(e.target.files?.[0] || null)}
                                                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                                />
                                                            )}
                                                            {editChapThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem' }}>✓ Seri kapağı kullanılacak</small>}
                                                            {editChapThumbMode === 'none' && editChapThumb && <small style={{ color: '#f87171', fontSize: '0.68rem' }}>Mevcut thumbnail silinecek</small>}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px', background: 'rgba(56,189,248,0.06)', borderRadius: 6, border: '1px solid rgba(56,189,248,0.2)' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', color: '#38bdf8', fontWeight: 600 }}>
                                                                <input type="checkbox" checked={editChapIsExternal} onChange={e => setEditChapIsExternal(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                                                                Dış Bağlantılı Bölüm (başka bir ekibin sitesine yönlendir)
                                                            </label>
                                                            {editChapIsExternal && (
                                                                <>
                                                                    <input
                                                                        type="url"
                                                                        value={editChapExternalUrl}
                                                                        onChange={e => setEditChapExternalUrl(e.target.value)}
                                                                        className="form-input"
                                                                        placeholder="https://kaynak-site.com/seri/bolum-44"
                                                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                                    />
                                                                    <textarea
                                                                        value={editChapExternalNote}
                                                                        onChange={e => setEditChapExternalNote(e.target.value)}
                                                                        className="form-input"
                                                                        rows="2"
                                                                        placeholder="Bu bölüme özel uyarı metni (boş bırakılırsa Ayarlar'daki varsayılan metin kullanılır)"
                                                                        style={{ padding: '6px 8px', fontSize: '0.78rem', resize: 'vertical' }}
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-light)', minWidth: 40 }}>
                                                            #{ch.chapter_number}
                                                        </span>
                                                        <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {ch.title}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                {ch.external_url ? (
                                                    <span className="admin-badge" title={ch.external_url} style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                                        Dış Bağlantı
                                                    </span>
                                                ) : (
                                                    <span className="admin-badge user-role">{ch.page_count || 0} sayfa</span>
                                                )}
                                                {ch.translation_count > 0 && <span className="admin-badge admin-role">{ch.translation_count} dil</span>}
                                                {ch.publish_at && (() => { const ps = String(ch.publish_at).trim(); const pd = new Date(ps.includes('T') ? ps : ps.replace(' ', 'T') + 'Z'); return !isNaN(pd.getTime()) && pd > new Date(); })() && (
                                                    <button
                                                        title="Zamanlamayı iptal et (hemen yayınla)"
                                                        style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                        onClick={async () => {
                                                            if (!confirm(`Bölüm ${ch.chapter_number} zamanlaması iptal edilsin mi? Bölüm hemen yayınlanacak.`)) return;
                                                            const fd = new FormData();
                                                            fd.append('action', 'update-chapter');
                                                            fd.append('chapterId', ch.id);
                                                            fd.append('chapterNumber', ch.chapter_number);
                                                            fd.append('title', ch.title || '');
                                                            fd.append('publishAt', '');
                                                            const res = await authFetch('/api/admin', { method: 'POST', body: fd });
                                                            const data = await res.json();
                                                            if (data.success) { show('Zamanlama iptal edildi, bölüm yayınlandı'); await openSeriesDetail(detailSeries.id); }
                                                            else show(data.error || 'Hata', 'error');
                                                        }}
                                                    >
                                                        <ClockIcon /> {(() => { const ps = String(ch.publish_at).trim(); return new Date(ps.includes('T') ? ps : ps.replace(' ', 'T') + 'Z').toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); })()} ✕
                                                    </button>
                                                )}

                                                {editingChapterId === ch.id ? (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-primary btn-sm" onClick={handleUpdateChapter} disabled={submitting}>
                                                            <CheckIcon /> Kaydet
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingChapterId(null)}>
                                                            İptal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => {
                                                            setEditingChapterId(ch.id);
                                                            setEditChapNum(ch.chapter_number);
                                                            setEditChapTitle(ch.title || '');
                                                            setEditChapContent(ch.content || '');
                                                            setEditChapThumb(ch.thumbnail_url || '');
                                                            setEditChapThumbMode(ch.thumbnail_url ? 'manual' : 'none');
                                                            setEditChapIsExternal(!!ch.external_url);
                                                            setEditChapExternalUrl(ch.external_url || '');
                                                            setEditChapExternalNote(ch.external_note || '');
                                                        }} title="Bölümü düzenle">
                                                            <EditIcon />
                                                        </button>

                                                        {uploadChapterId === ch.id ? (
                                                            <form onSubmit={handleUploadPages} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <input type="file" accept="image/*" multiple onChange={e => setUFiles(e.target.files)} style={{ width: 180, fontSize: '0.72rem' }} />
                                                                <VercelUploadToggle />
                                                                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                                                                    {submitting ? '...' : 'Yükle'}
                                                                </button>
                                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setUploadChapterId(null); setUFiles(null); }}>✕</button>
                                                            </form>
                                                        ) : (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setUploadChapterId(ch.id)}
                                                                title="Sayfa yükle">
                                                                <UploadIcon />
                                                            </button>
                                                        )}

                                                        <button className="btn btn-ghost btn-sm"
                                                            onClick={() => openChapterPages(ch.id)}
                                                            title="Sayfaları görüntüle"
                                                            style={viewPagesChapterId === ch.id ? { background: 'var(--accent)', color: '#fff' } : {}}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                                        </button>

                                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                            action: 'delete-chapter', body: { chapterId: ch.id },
                                                            text: `Bölüm ${ch.chapter_number} "${ch.title}" ve tüm sayfaları silinsin mi?`,
                                                            onDone: async () => { await openSeriesDetail(detailSeries.id); }
                                                        })}><TrashIcon /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
{/* Inline pages thumbnail panel */}
                                        {viewPagesChapterId === ch.id && (
                                            <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                {viewPagesLoading ? (
                                                    <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" /></div>
                                                ) : viewPages.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem', padding: 10 }}>Henüz sayfa yüklenmemiş.</p>
                                                ) : (
                                                    <>
                                                        {/* Toolbar */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{viewPages.length} sayfa — önizleme için tıklayın</p>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                {reorderMode ? (
                                                                    <>
                                                                        <button
                                                                            className="btn btn-sm btn-primary"
                                                                            onClick={savePageOrder}
                                                                            disabled={reorderSaving}
                                                                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                                        >
                                                                            {reorderSaving ? '...' : (
                                                                                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Kaydet</>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-ghost"
                                                                            onClick={async () => {
                                                                                // Reload original order from server
                                                                                setViewPagesLoading(true);
                                                                                try {
                                                                                    const res = await fetch(`/api/chapters/${ch.id}`);
                                                                                    const data = await res.json();
                                                                                    const sorted = (data.pages || []).slice().sort((a, b) => a.page_number - b.page_number);
                                                                                    setViewPages(sorted);
                                                                                } catch {}
                                                                                setViewPagesLoading(false);
                                                                                setReorderMode(false);
                                                                            }}
                                                                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                                        >
                                                                            İptal
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-sm btn-ghost"
                                                                        onClick={() => setReorderMode(true)}
                                                                        style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                                                                        title="Sıralamayı düzenle"
                                                                    >
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                                                                        Sırala
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {reorderMode ? (
                                                            /* Reorder mode: list view with up/down buttons and editable page numbers */
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {viewPages.map((p, idx) => (
                                                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 8px', border: '1px solid var(--border-color)' }}>
                                                                        {/* Thumbnail */}
                                                                        <div style={{ width: 36, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                                                                            <img src={p.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                                                                        </div>
                                                                        {/* Page number input */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sıra No</span>
                                                                            <input
                                                                                type="number"
                                                                                value={p.page_number}
                                                                                min={1}
                                                                                onChange={e => updatePageNumber(idx, e.target.value)}
                                                                                style={{ width: 52, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'center' }}
                                                                            />
                                                                        </div>
                                                                        {/* File name */}
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {p.image_path ? p.image_path.split('/').pop() : '—'}
                                                                        </span>
                                                                        {/* Up / Down buttons */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                                                            <button
                                                                                onClick={() => movePageUp(idx)}
                                                                                disabled={idx === 0}
                                                                                title="Yukarı taşı"
                                                                                style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border-color)', background: idx === 0 ? 'transparent' : 'var(--bg-secondary)', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                                            >
                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => movePageDown(idx)}
                                                                                disabled={idx === viewPages.length - 1}
                                                                                title="Aşağı taşı"
                                                                                style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border-color)', background: idx === viewPages.length - 1 ? 'transparent' : 'var(--bg-secondary)', color: idx === viewPages.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: idx === viewPages.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                                            >
                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            /* Normal mode: thumbnail grid */
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 }}>
                                                                {viewPages.map(p => (
                                                                    <div key={p.id} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '3/4', background: 'var(--bg-tertiary)' }}
                                                                        onMouseEnter={e => { const btn = e.currentTarget.querySelector('.pg-del-btn'); if (btn) btn.style.opacity='1'; }}
                                                                        onMouseLeave={e => { const btn = e.currentTarget.querySelector('.pg-del-btn'); if (btn) btn.style.opacity='0'; }}>
                                                                        <div style={{ width: '100%', height: '100%', cursor: 'pointer' }} onClick={() => setPreviewImage({ src: p.image_path, title: `Bölüm ${ch.chapter_number} — Sayfa ${p.page_number}` })}>
                                                                            <img src={p.image_path} alt={`Page ${p.page_number}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                                                                        </div>
                                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', fontSize: '0.6rem', color: '#fff', textAlign: 'center', padding: '2px 0' }}>
                                                                            {p.page_number}
                                                                        </div>
                                                                        <button className="pg-del-btn" onClick={e => { e.stopPropagation(); deleteChapterPage(p.id); }}
                                                                            style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.92)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', zIndex: 2, padding: 0 }}
                                                                            title="Sayfayı sil">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        </div>
                                    ))}
                                </div>
                                {/* Chapter pagination */}
                                <AdminPager
                                    page={chapterPage}
                                    total={detailChapters.length}
                                    pageSize={CHAPTERS_PER_PAGE}
                                    onPageChange={p => { setChapterPage(p); setSelectedChapters([]); }}
                                />
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════════ TURNSTILE ═══════════════ */}

        </>
    );
}
