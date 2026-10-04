'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SeriesCard from '@/components/SeriesCard';
import Breadcrumb from '@/components/Breadcrumb';
import { useSettings } from '@/components/SettingsProvider';
import { useAuth } from '@/components/AuthProvider';

// Default genre list as fallback (used until API loads)
const DEFAULT_GENRES_FALLBACK = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical',
  'Horror', 'Isekai', 'Martial Arts', 'Mystery', 'Reincarnation', 'Romance',
  'School', 'Sci-Fi', 'Supernatural', 'Thriller',
  'Ecchi', 'Harem', 'Josei', 'Mature', 'Mecha', 'Psychological',
  'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Sports', 'Tragedy',
  'Webtoon', 'Manhwa', 'Manhua',
];

const GENRE_TR = {
  'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
  'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
  'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
  'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
  'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
  'Ecchi': 'Ecchi', 'Harem': 'Harem', 'Josei': 'Josei', 'Mature': 'Yetişkin',
  'Mecha': 'Mecha', 'Psychological': 'Psikolojik', 'Seinen': 'Seinen',
  'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
  'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon',
  'Manhwa': 'Manhwa', 'Manhua': 'Manhua',
};

const STATUS_TR = {
  'ongoing': 'Devam Ediyor', 'completed': 'Tamamlandı', 'hiatus': 'Ara Verildi', 'cancelled': 'İptal Edildi', 'current': 'Güncel'
};

const PAGE_SIZE = 24;

function SeriesContent() {
  const searchParams = useSearchParams();
  // mounted flag: prevents SSR/CSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState('latest');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [allGenres, setAllGenres] = useState(DEFAULT_GENRES_FALLBACK.map(g => ({ name: g, name_tr: GENRE_TR[g] || g })));
  const { settings: lang } = useSettings();
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const searchRef = useRef(''); // stale closure önlemi — her zaman güncel arama değerini tutar

  // Read URL params only on client after mount to avoid hydration mismatch
  useEffect(() => {
    setSearch(searchParams.get('search') || searchParams.get('q') || '');
    setSortBy(searchParams.get('sort') || 'latest');
    setStatusFilter(searchParams.get('status') || '');
    setTypeFilter(searchParams.get('type') || '');
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available genres from API (includes custom genres + active defaults)
  // /api/genres public endpoint kullanılıyor — /api/admin/genres admin
  // middleware korumasına tabi olduğundan misafir kullanıcılarda 403 alınıyordu.
  useEffect(() => {
    fetch('/api/genres')
      .then(r => r.json())
      .then(data => {
        if (data.genres && Array.isArray(data.genres)) {
          setAllGenres(data.genres.map(g => ({
            name: g.name,
            name_tr: g.name_tr || GENRE_TR[g.name] || g.name,
          })));
        }
      })
      .catch(() => {}); // keep fallback on error
  }, []);

  const t = useCallback((key, fallback) => lang[key] || fallback, [lang]);

  const fetchSeries = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      // searchRef.current kullan — state'den okumak stale closure'a yol açar
      const currentSearch = searchRef.current !== undefined ? searchRef.current : search;
      if (currentSearch.trim()) params.set('search', currentSearch.trim());
      if (selectedGenres.length > 0) params.set('genre', selectedGenres.join(','));
      if (sortBy) params.set('sort', sortBy);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(pageNum));

      const res = await fetch(`/api/series?${params.toString()}`);
      const data = await res.json();
      const items = data.series || [];

      if (append) {
        setSeries(prev => [...prev, ...items]);
      } else {
        setSeries(items);
        setPage(1);
      }
      setTotal(data.total || items.length);
      setHasMore(data.hasMore || (data.total ? pageNum * PAGE_SIZE < data.total : items.length === PAGE_SIZE));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, selectedGenres, sortBy, statusFilter, typeFilter]);

// Initial load after mount + refetch when filters change
  useEffect(() => {
    if (!mounted) return;
    fetchSeries(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, selectedGenres, sortBy, statusFilter, typeFilter]);

  // Debounced search — searchRef ile stale closure önlendi
  function handleSearchChange(e) {
    const val = e.target.value;
    searchRef.current = val; // ref hemen güncellenir (re-render beklemez)
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // fetchSeries'i doğrudan çağırmak yerine searchRef üzerinden güncel değeri garanti ediyoruz
      fetchSeries(1, false);
    }, 420);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    fetchSeries(1, false);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSeries(nextPage, true);
  }

  function toggleGenre(genre) {
    // Anında loading göster — "bulunamadı" flash'ı önler
    setLoading(true);
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }

  function clearFilters() {
    searchRef.current = '';
    clearTimeout(debounceRef.current);
    if (searchInputRef.current) searchInputRef.current.value = '';
    setSearch('');
    setSelectedGenres([]);
    setStatusFilter('');
    setTypeFilter('');
    setSortBy('latest');
    // Doğrudan fetch tetikle — sadece search aktifken useEffect tetiklenmeyeceğinden
    fetchSeries(1, false);
  }

  const hasFilters = search.trim() || selectedGenres.length > 0 || statusFilter || typeFilter || sortBy !== 'latest';

  // Before mount: render static skeleton to match server output exactly
  if (!mounted) {
    return (
      <div className="page-container page-section fade-in">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-4px', marginRight: 8 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Manga Keşfet
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Yükleniyor...</p>
        </div>
        <div className="sc2-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: '', label: t('lang_status_all', 'Tüm Durumlar') },
    { value: 'ongoing', label: t('lang_status_ongoing', 'Devam Ediyor') },
    { value: 'completed', label: t('lang_status_completed', 'Tamamlandı') },
    { value: 'hiatus', label: t('lang_status_hiatus', 'Ara Verildi') },
  ];

  const sortOptions = [
    { value: 'latest', label: t('lang_sort_latest', 'Son Güncellenen') },
    { value: 'popular', label: t('lang_sort_popular', 'En Popüler') },
    { value: 'rating', label: t('lang_sort_rating', 'En Yüksek Puan') },
    { value: 'title', label: t('lang_sort_az', 'A-Z') },
  ];

  return (
    <div className="page-container page-section fade-in glass-page-container">
      <Breadcrumb items={[
          { label: 'Ana Sayfa', href: '/' },
          { label: 'Seriler' },
      ]} />
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            {t('lang_browse_title', 'Manga Keşfet')}
          </h1>
          {t('lang_browse_subtitle', '') && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>{t('lang_browse_subtitle', '')}</p>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 12px' }}>
          {loading ? '...' : `${total > 0 ? total : series.length} ${t('lang_stat_series', 'seri')}${hasFilters ? ' • filtrelenmiş' : ''}`}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar glass-filter-bar glass-panel" style={{ marginBottom: 12, padding: '12px 16px', borderRadius: '14px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: 0, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('lang_search_placeholder', 'Başlık veya yazara göre manga ara...')}
              value={search}
              onChange={handleSearchChange}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 14px 10px 42px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(var(--accent-rgb, 99, 102, 241), 0.5)';
                e.target.style.background = 'rgba(255,255,255,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
            />
            <button type="submit" style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
              boxShadow: '0 2px 10px rgba(var(--accent-rgb,94,114,228),0.4)',
              flexShrink: 0,
              marginLeft: 8,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--accent-rgb,94,114,228),0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(var(--accent-rgb,94,114,228),0.4)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Ara</span>
            </button>
          </div>
        </form>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 0 }}>
          <option value="">Tüm Türler</option>
          <option value="manga">Manga</option>
          <option value="manhwa">Manhwa</option>
          <option value="manhua">Manhua</option>
          <option value="novel">Novel</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 0 }}>
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ minWidth: 0 }}>
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Genre Tags */}
      <div className="glass-genre-tags-wrapper glass-panel" style={{ marginBottom: 12, padding: '16px', borderRadius: '16px' }}>
        <div className="genre-tags-filter" style={{ margin: 0 }}>
          {allGenres.map(g => (
            <button
              key={g.name}
              className={`genre-tag-filter glass-genre-tag ${selectedGenres.includes(g.name) ? 'active' : ''}`}
              onClick={() => toggleGenre(g.name)}
              type="button"
            >
              {g.name_tr}
            </button>
          ))}
        </div>
      </div>

      {/* Actions row */}
      <div className="filter-actions-row" style={{ marginBottom: 16 }}>
        <div className="active-filters">
          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              type="button"
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {t('lang_status_all', 'Filtreleri Temizle')}
              {selectedGenres.length > 0 && ` (${selectedGenres.length})`}
            </button>
          )}
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="Izgara Görünümü"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="Liste Görünümü"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="sc2-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 12 }} />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>
            {t('lang_no_results', 'Seri bulunamadı.')}
          </p>
          <p style={{ fontSize: '0.85rem' }}>Arama veya filtrelerinizi değiştirmeyi deneyin.</p>
          {hasFilters && (
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={clearFilters} type="button">
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="sc2-grid">
          {series.map(s => <SeriesCard key={s.id} series={s} user={user} />)}
        </div>
      ) : (
        <div className="series-list-view">
          {series.map(s => {
            const genres = Array.isArray(s.genres)
              ? s.genres
              : (() => { try { return JSON.parse(s.genres || '[]'); } catch { return []; } })();
            const statusLabel = s.status === 'ongoing'
              ? t('lang_status_ongoing', 'Devam Ediyor')
              : s.status === 'completed'
                ? t('lang_status_completed', 'Tamamlandı')
                : s.status === 'hiatus'
                  ? t('lang_status_hiatus', 'Ara Verildi')
                  : STATUS_TR[s.status] || s.status;
            const isAdult = !!s.is_adult;
            const isBlurred = isAdult && !user;

            if (isBlurred) {
              return (
                <div key={s.id} className="series-list-item glass-panel glass-panel-hoverable" style={{ cursor: 'pointer', position: 'relative' }}
                  onClick={() => window.location.href = '/login'}>
                  <div className="series-list-cover" style={{ position: 'relative' }}>
                    <img src={s.cover_url || '/demo/cover1.jpg'} alt="18+ İçerik" loading="lazy"
                      style={{ filter: 'blur(12px)', transform: 'scale(1.05)' }} decoding="async" />
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: '#ef4444', color: '#fff', fontWeight: 800,
                      fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4,
                      letterSpacing: '0.05em', zIndex: 2
                    }}>18+</div>
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                      zIndex: 3
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Giriş Yapın
                    </div>
                  </div>
                  <div className="series-list-info">
                    <h3 style={{ filter: 'blur(5px)', userSelect: 'none' }}>{s.title}</h3>
                    <div className="series-list-meta">
                      <span className={`status-badge status-${s.status}`}>{statusLabel}</span>
                      <span className="genre-tag" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Yetişkin
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Bu içerik yalnızca kayıtlı üyelere özeldir.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <a key={s.id} href={`/series/${s.slug || s.id}`} className="series-list-item glass-panel glass-panel-hoverable">
                <div className="series-list-cover">
                  <img src={s.cover_url || '/demo/cover1.jpg'} alt={s.title} loading="lazy" decoding="async" />
                </div>
                <div className="series-list-info">
                  <h3>{s.title}</h3>
                  {(s.author || s.artist) && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0' }}>
                      {s.author}{s.artist && s.artist !== s.author ? ` / ${s.artist}` : ''}
                    </p>
                  )}
                  <div className="series-list-meta">
                    <span className={`status-badge status-${s.status}`}>{statusLabel}</span>
                    {s.rating > 0 && <span>★ {s.rating?.toFixed(1)}</span>}
                    <span>{s.chapterCount || s.chapter_count || 0} bölüm</span>
                    {genres.slice(0, 3).map(g => (
                      <span key={g} className="genre-tag" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>{GENRE_TR[g] || g}</span>
                    ))}
                  </div>
                  {s.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.description}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            className="btn btn-secondary glass-load-more-btn"
            onClick={loadMore}
            disabled={loadingMore}
            type="button"
            style={{ minWidth: 160 }}
          >
            {loadingMore ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Yükleniyor...
              </span>
            ) : (
              t('lang_load_more', 'Daha Fazla Yükle')
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SeriesListPage() {
  return (
    <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
      <SeriesContent />
    </Suspense>
  );
}