'use client';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import SeriesCard from '@/components/SeriesCard';
import GlassmorphismCard from '@/components/UpdateCards/GlassmorphismCard';
import MostReadWidget from '@/components/MostReadWidget';
import TrendingWidget from '@/components/TrendingWidget';
import GlobalChat from '@/components/GlobalChat';
import HeroSliderWidget from '@/components/HeroSliderWidget';
import { useAuth } from '@/components/AuthProvider';

const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim', 'Ecchi': 'Ecchi', 'Harem': 'Harem',
    'Josei': 'Josei', 'Mature': 'Yetişkin', 'Mecha': 'Mecha', 'Psychological': 'Psikolojik',
    'Seinen': 'Seinen', 'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua'
};

const STATUS_TR = {
    'ongoing': 'Devam Ediyor',
    'completed': 'Tamamlandı',
    'hiatus': 'Ara Verildi',
    'cancelled': 'İptal Edildi',
    'current': 'Güncel'
};

function formatType(type) {
    if (!type) return '';
    const lower = type.toLowerCase();
    if (lower === 'manga') return 'Manga';
    if (lower === 'manhwa') return 'Manhwa';
    if (lower === 'manhua') return 'Manhua';
    if (lower === 'webtoon') return 'Webtoon';
    if (lower === 'novel') return 'Roman';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function capitalizeFirst(str) {
    if (!str) return '';
    let first = str.charAt(0);
    if (first === 'i') first = 'İ';
    else if (first === 'ı') first = 'I';
    else if (first === 'ş') first = 'Ş';
    else if (first === 'ğ') first = 'Ğ';
    else if (first === 'ü') first = 'Ü';
    else if (first === 'ö') first = 'Ö';
    else if (first === 'ç') first = 'Ç';
    else first = first.toUpperCase();
    return first + str.slice(1);
}


function isDefaultTitle(title, chNum) {
    if (!title) return true;
    const cleanTitle = title.trim().toLowerCase();
    const cleanNum = String(chNum).trim().toLowerCase();
    const normalized = cleanTitle.replace(/\s+/g, ' ');
    const defaults = [
        `chapter ${cleanNum}`,
        `ch. ${cleanNum}`,
        `ch.${cleanNum}`,
        `bölüm ${cleanNum}`,
        `böl. ${cleanNum}`,
        `böl.${cleanNum}`,
        `bö. ${cleanNum}`,
        `bö.${cleanNum}`,
        `${cleanNum}. bölüm`,
        `${cleanNum}.bölüm`,
        `bölüm: ${cleanNum}`,
        `bölüm:${cleanNum}`,
        `bölüm-${cleanNum}`,
        `bölüm_${cleanNum}`,
        cleanNum
    ];
    return defaults.includes(normalized);
}

function toTitleCaseTr(str) {
    if (!str) return '';
    const lower = str.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
    return lower.split(' ').map(word => {
        if (!word) return '';
        let first = word.charAt(0);
        if (first === 'i') first = 'İ';
        else if (first === 'ı') first = 'I';
        else if (first === 'ş') first = 'Ş';
        else if (first === 'ğ') first = 'Ğ';
        else if (first === 'ü') first = 'Ü';
        else if (first === 'ö') first = 'Ö';
        else if (first === 'ç') first = 'Ç';
        else first = first.toUpperCase();
        return first + word.slice(1);
    }).join(' ');
}

// Performans: fmtCh fonksiyonu bileşen dışında tanımlandı - gereksiz fonksiyon oluşturmayı önler
function fmtCh(n) {
    const num = Number(n);
    if (isNaN(num)) return n;
    return num % 1 === 0 ? String(Math.floor(num)) : String(num);
}

// Performans: timeAgo fonksiyonu bileşen dışında tanımlandı
function timeAgo(date, appSettings = {}) {
    if (!date) return '';
    const d = typeof date === 'string' && !date.endsWith('Z') ? date + 'Z' : date;
    const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    const justNow = appSettings.lang_time_just_now || 'şimdi';
    const minAgo = appSettings.lang_time_min_ago || ' dk önce';
    const hourAgo = appSettings.lang_time_hour_ago || ' sa önce';
    const dayAgo = appSettings.lang_time_day_ago || ' gün önce';
    if (seconds < 60) return justNow;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${minAgo}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}${hourAgo}`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}${dayAgo}`;
    return new Date(date).toLocaleDateString('tr-TR');
}

// Performans: Memoized ChapterRow bileşeni - gereksiz re-render'ları önler
const ChapterRow = memo(function ChapterRow({ ch, seriesSlug, showNewBadge, hasCustomTitle, appSettings, isNew, timeAgoStr }) {
    const chWord = appSettings?.lang_chapter_word || 'Bölüm';
    const chPrefix = appSettings?.lang_chapter_prefix || 'Bölüm';

    return (
        <Link href={`/seri/${seriesSlug}/bolum/${ch.chapter_number}`} className={`holo-chapter-row${isNew ? ' is-new' : ''}`} prefetch={false} suppressHydrationWarning>
            <span className="name" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ display: 'block', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hasCustomTitle
                        ? `${chPrefix} ${fmtCh(ch.chapter_number)} - ${ch.title}`
                        : `${chWord} ${fmtCh(ch.chapter_number)}`}
                </span>
                {isNew && showNewBadge && (
                    <span className="new-chapter-badge-pill" title="Son 24 saatte yüklendi!">
                        {appSettings?.lang_new || 'YENİ'}
                    </span>
                )}
            </span>
            <span className="time" style={{ flexShrink: 0, marginLeft: '8px' }} suppressHydrationWarning>{timeAgoStr}</span>
        </Link>
    );
});

// Performans: Memoized UpdateCard bileşeni - her kart için ayrı memo
const UpdateCard = memo(function UpdateCard({ s, mounted, user, appSettings, onChapterTimeAgo, CardComponent }) {
    const seriesSlug = s.slug || s.id;

    return (
        <div style={{ position: 'relative', minWidth: 0, isolation: 'isolate' }}>
            {/* Yetişkin içerik — giriş yapmamış kullanıcılar için blur overlay */}
            {mounted && s.is_adult === 1 && !user && (
                <a href="/login" style={{
                    position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'rgba(0,0,0,0.60)', borderRadius: 10, textDecoration: 'none',
                    color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                    letterSpacing: '0.04em'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Giriş Yapın
                </a>
            )}
            <div style={mounted && s.is_adult === 1 && !user ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', borderRadius: 10, overflow: 'hidden', minWidth: 0, willChange: 'filter' } : { minWidth: 0 }}>
                <CardComponent
                    href={`/seri/${seriesSlug}`}
                    coverUrl={s.cover_url || '/demo/cover1.jpg'}
                    title={s.title}
                    type={formatType(s.type)}
                    status={STATUS_TR[s.status] || s.status}
                    statusKey={s.status}
                >
                    {Array.isArray(s.chapters) && s.chapters.length > 0 && s.chapters.map(ch => {
                        const hasCustomTitle = ch.title && !isDefaultTitle(ch.title, ch.chapter_number);
                        const isNew = (() => {
                            if (appSettings?.show_new_chapter_badge === '0') return false;
                            if (ch.is_new === 1 || ch.is_new === true) return true;
                            if (!ch.created_at) return false;
                            const dateStr = String(ch.created_at);
                            const normalized = dateStr.includes('T') ? (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z') : dateStr.replace(' ', 'T') + 'Z';
                            const ts = new Date(normalized).getTime();
                            if (isNaN(ts)) return false;
                            return (Date.now() - ts) < 24 * 60 * 60 * 1000;
                        })();
                        const timeAgoStr = onChapterTimeAgo ? onChapterTimeAgo(ch.created_at) : '';

                        return (
                            <ChapterRow
                                key={ch.id}
                                ch={ch}
                                seriesSlug={seriesSlug}
                                showNewBadge={appSettings?.show_new_chapter_badge !== '0'}
                                hasCustomTitle={hasCustomTitle}
                                appSettings={appSettings}
                                isNew={isNew}
                                timeAgoStr={timeAgoStr}
                            />
                        );
                    })}
                    {(!s.chapters || s.chapters.length === 0) && (
                        <span className="holo-chapter-row" style={{ opacity: 0.5 }}>{appSettings?.lang_no_chapters_yet || 'Henüz bölüm yok'}</span>
                    )}
                </CardComponent>
            </div>
        </div>
    );
});

export default function HomeClient({ initialData } = {}) {
  const { user, authFetch } = useAuth();
  const [popularSeries, setPopularSeries] = useState(initialData?.popularSeries || []);
  const [latestUpdates, setLatestUpdates] = useState(initialData?.latestUpdates || []);
  const [updatesPage, setUpdatesPage] = useState(1);
  const [updatesTotalPages, setUpdatesTotalPages] = useState(initialData?.updatesTotalPages || 1);
  const [updatesTotal, setUpdatesTotal] = useState(initialData?.updatesTotal || 0);
  const [updatesPageLoading, setUpdatesPageLoading] = useState(false);
  const [readingHistory, setReadingHistory] = useState([]);
  const [trending, setTrending] = useState(initialData?.trending || []);
  const [editorPicks, setEditorPicks] = useState(initialData?.editorPicks || []);
  const [activeEPIndex, setActiveEPIndex] = useState(0);
  const [announcements, setAnnouncements] = useState(initialData?.announcements || []);
  const [topSeries, setTopSeries] = useState(initialData?.topSeries || []);
  const [appSettings, setAppSettings] = useState(initialData?.appSettings || {});
  const [topPeriod, setTopPeriod] = useState(initialData?.topPeriod || 'daily');
  const [showAdult, setShowAdult] = useState(false);
  const [updateTypeFilter, setUpdateTypeFilter] = useState('normal'); // 'normal' | 'novel'
  const [loading, setLoading] = useState(!initialData);
  const [topLoading, setTopLoading] = useState(false);
  // SSR'dan zaten "daily" period için veri geldiyse, mount olur olmaz
  // aynı isteği tekrar client'tan atıp widget'ı gereksiz yere
  // boşaltmamak (topLoading=true -> opacity düşmesi) için bunu işaretliyoruz.
  const skipInitialTopFetch = useRef(!!initialData?.topSeries?.length);
  const [stats, setStats] = useState({ series: 0, chapters: 0, users: 0 });
  const [mounted, setMounted] = useState(false);

  // Donation countdown — ref kullanıyoruz, gereksiz re-render engellenir
  const donationNowRef = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => { donationNowRef.current = Date.now(); }, 30000);
    return () => clearInterval(t);
  }, []);
  // Render sırasında her zaman güncel zamanı oku
  const donationNow = donationNowRef.current;

  // Bug Report Modal State
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugMessage, setBugMessage] = useState('');
  const [bugMessageType, setBugMessageType] = useState('success');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real-time stats from dedicated endpoint
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      const newSeries = data.series || 0;
      const newChapters = data.chapters || 0;
      const newUsers = data.users || 0;
      setStats(prev => {
        if (prev.series === newSeries && prev.chapters === newChapters && prev.users === newUsers) return prev;
        return { series: newSeries, chapters: newChapters, users: newUsers };
      });
    } catch {}
  }, []);

  // Auto-refresh stats every 60 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    // Sunucu tarafında (SSR) zaten veri geldiyse burada tekrar fetch atmaya gerek yok —
    // ilk yüklemedeki gereksiz round-trip'i ve boş ekran anını ortadan kaldırır.
    if (initialData) { setLoading(false); return; }
    async function fetchData() {
      try {
        const [popRes, updRes, trendRes, edRes, annRes, settRes] = await Promise.all([
          fetch('/api/series?sort=popular&limit=5', { cache: 'no-store' }),
          fetch(`/api/series/latest-updates?page=1&adult=${showAdult ? '1' : '0'}`, { cache: 'no-store' }),
          fetch('/api/series/trending', { cache: 'no-store' }),
          fetch('/api/series/editor-pick', { cache: 'no-store' }),
          fetch('/api/announcements?active=true', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' })
        ]);
        const popData = await popRes.json();
        const updData = await updRes.json();
        const trendData = await trendRes.json();
        const edData = await edRes.json();
        const annData = await annRes.json();
        const settData = await settRes.json();

        setPopularSeries(popData.series || []);
        setLatestUpdates(updData.updates || []);
        setUpdatesTotalPages(updData.totalPages || 1);
        setUpdatesTotal(updData.total || 0);
        setTrending(trendData.series || []);
        setEditorPicks(Array.isArray(edData.series) ? edData.series : (edData.series ? [edData.series] : []));
        setAnnouncements(annData.announcements || []);
        if (settData.success) {
            setAppSettings(settData.settings || {});
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  useEffect(() => {
    // SSR ilk period için veriyi zaten getirdiyse, mount anında aynı isteği
    // tekrarlayıp widget'ı boşa çıkarma (bkz. skipInitialTopFetch tanımı).
    if (skipInitialTopFetch.current) {
      skipInitialTopFetch.current = false;
      return;
    }
    let cancelled = false;
    async function fetchTop() {
      setTopLoading(true);
      try {
        const res = await fetch(`/api/series/top?period=${topPeriod}`);
        const data = await res.json();
        if (!cancelled) setTopSeries(data.series || []);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setTopLoading(false); }
    }
    fetchTop();
    return () => { cancelled = true; };
  }, [topPeriod]);

  async function goToUpdatesPage(targetPage) {
    if (updatesPageLoading || targetPage < 1 || targetPage > updatesTotalPages) return;
    setUpdatesPageLoading(true);
    try {
      const res = await fetch(`/api/series/latest-updates?page=${targetPage}&adult=${showAdult ? '1' : '0'}`);
      const data = await res.json();
      if (data.updates) {
        setLatestUpdates(data.updates);
        setUpdatesTotalPages(data.totalPages || 1);
        setUpdatesTotal(data.total || 0);
        setUpdatesPage(targetPage);
        // Sayfa değişince Son Güncellemeler başlığına scroll
        const el = document.getElementById('latest-updates-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) { console.error(err); }
    finally { setUpdatesPageLoading(false); }
  }

  // Adult filtresi değişince sayfa 1'den yeniden çek
  // useRef ile ilk render atlanır — fetchData() zaten başlangıçta çalışıyor
  const isFirstAdultRender = useRef(true);
  useEffect(() => {
    if (isFirstAdultRender.current) { isFirstAdultRender.current = false; return; }
    if (!mounted) return;
    async function refetchUpdates() {
      setUpdatesPageLoading(true);
      try {
        const res = await fetch(`/api/series/latest-updates?page=1&adult=${showAdult ? '1' : '0'}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.updates) {
          setLatestUpdates(data.updates);
          setUpdatesTotalPages(data.totalPages || 1);
          setUpdatesTotal(data.total || 0);
          setUpdatesPage(1);
        }
      } catch {}
      finally { setUpdatesPageLoading(false); }
    }
    refetchUpdates();
  }, [showAdult]);

  // Adult filtresi server tarafında yapılır; Normal/Novel ayrımı ise
  // seri türüne (type) göre client tarafında uygulanır
  const filteredUpdates = useMemo(() => {
    return latestUpdates.filter(s => {
      const isNovel = (s.type || '').toLowerCase() === 'novel';
      return updateTypeFilter === 'novel' ? isNovel : !isNovel;
    });
  }, [latestUpdates, updateTypeFilter]);

  // Sadece Glassmorphism (Cam Efekti) kart tasarımı kullanılıyor
  const CardComponent = GlassmorphismCard;

  // Fetch real reading history if logged in
  useEffect(() => {
    if (!user) return;
    async function fetchHistory() {
      try {
        const res = await authFetch('/api/users/reading-history');
        const data = await res.json();
        setReadingHistory(data.history || []);
      } catch { }
    }
    fetchHistory();
  }, [user, authFetch]);

  function parseGenres(g) {
    try { return Array.isArray(g) ? g : JSON.parse(g || '[]'); } catch { return []; }
  }

  // Performans: timeAgo helper - ChapterRow için ön-hesaplama
  const getChapterTimeAgo = useCallback((date) => {
    if (!date || !mounted) return '';
    return timeAgo(date, appSettings);
  }, [mounted, appSettings.lang_time_just_now, appSettings.lang_time_min_ago, appSettings.lang_time_hour_ago, appSettings.lang_time_day_ago]);

  async function handleBugSubmit(e) {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim()) {
      setBugMessage('Lütfen tüm alanları doldurun.');
      setBugMessageType('error');
      return;
    }
    setBugSubmitting(true);
    setBugMessage('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bugTitle, description: bugDesc })
      });
      const data = await res.json();
      if (data.success) {
        setBugMessage('Hata bildiriminiz başarıyla iletildi. Teşekkür ederiz!');
        setBugMessageType('success');
        setBugTitle('');
        setBugDesc('');
        setTimeout(() => setShowBugModal(false), 2000);
      } else {
        setBugMessage(data.error || 'Bildirim gönderilemedi.');
        setBugMessageType('error');
      }
    } catch (err) {
      setBugMessage('Bir hata oluştu, lütfen tekrar deneyin.');
      setBugMessageType('error');
    } finally {
      setBugSubmitting(false);
    }
  }

  return (
    <>
    <div className="home-wrapper">
      {/* SEO/erişilebilirlik: sayfanın gerçek H1'i (görsel olarak gizli).
          Hero slider görsel başlık olarak yeterli ama tarayıcılar/arama motorları
          için semantik bir H1 gerekiyor. */}
      <h1 className="sr-only">
        {appSettings.site_name || 'Asteria Scans'} — {appSettings.seo_desc_home || 'Türkçe Manga, Manhwa ve Manhua Oku'}
      </h1>
      {/* Popular Series — Devasa Hero Slider */}
      <div className="page-container page-section pt-0">
        {(loading || !mounted) && <div className="pop-slider-skel" />}
        {mounted && !loading && popularSeries.length > 0 && (
          <HeroSliderWidget design={appSettings.hero_slider_design || 'hero_style1'} popularSeries={popularSeries} />
        )}
      </div>

      {/* Side-by-Side Banners: Discord and Bug Report */}
      {!loading && (appSettings.discord_enabled === '1' || appSettings.bug_report_enabled === '1') && (
        <section className="page-container page-section pt-0" style={{ paddingBottom: '20px' }}>
          <div className={`banners-grid ${(appSettings.discord_enabled === '1') !== (appSettings.bug_report_enabled === '1') ? 'single-banner' : ''}`}>
            {appSettings.discord_enabled === '1' && (
              <a
                href={appSettings.discord_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="banner-card discord-banner"
                style={{ textDecoration: 'none' }}
              >
                <div className="banner-card-info">
                  <h4 className="banner-card-title">{appSettings.discord_title || 'Discord Sunucumuza Katıl'}</h4>
                  <p className="banner-card-desc">{appSettings.discord_text || 'Güncellemeler burada ilk paylaşılır, topluluğa katıl!'}</p>
                </div>
                <span className="banner-card-btn discord-btn">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
                  </svg>
                  Katıl
                </span>
              </a>
            )}

            {appSettings.bug_report_enabled === '1' && (
              <div
                className="banner-card report-banner"
                onClick={() => setShowBugModal(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setShowBugModal(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="banner-card-info">
                  <h4 className="banner-card-title">{appSettings.bug_report_title || 'Hata Bildir'}</h4>
                  <p className="banner-card-desc">{appSettings.bug_report_text || 'Sorun mu var? Bize bildirin, hızlıca çözelim.'}</p>
                </div>
                <span className="banner-card-btn report-btn">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
                  </svg>
                  Bildir
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Announcements Bar */}
      {announcements.length > 0 && (
        <section className="page-container page-section pt-0" style={{ paddingBottom: '10px' }}>
          <div className="announcements-bar">
            {announcements.map(ann => (
              <div key={ann.id} className="ann-item">
                <span className="ann-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  {appSettings.lang_announcement_label || 'DUYURU'}
                </span>
                {ann.link_url ? (
                  <a href={ann.link_url} target="_blank" rel="noopener noreferrer" className="ann-message">{ann.message}</a>
                ) : (
                  <span className="ann-message">{ann.message}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

                                          {/* Donation Banner */}
            {!loading && appSettings?.donation_enabled === '1' && (() => {
                const goalEnabled = appSettings.donation_goal_enabled === '1';
                const goalCurrent = Math.max(0, parseFloat(appSettings.donation_goal_current || '0') || 0);
                const goalTarget = Math.max(1, parseFloat(appSettings.donation_goal_target || '1000') || 1000);
                const goalCurrency = appSettings.donation_goal_currency || '₺';
                const goalLabel = appSettings.donation_goal_label || 'Sunucu Maliyeti';
                const manualPct = parseFloat(appSettings.donation_goal_pct || '0') || 0;
                const goalPct = manualPct > 0 ? Math.min(100, Math.max(0, manualPct)) : Math.min(100, Math.max(0, (goalCurrent / goalTarget) * 100));
                const isPctMode = manualPct > 0;
                const isComplete = goalPct >= 100;
                const hasAnyBtn = appSettings.paypal_url || appSettings.kofi_url || appSettings.kreosus_url;

                // ── Geri sayım hesaplama ──
                const deadlineRaw = appSettings.donation_goal_deadline || '';
                let countdown = null;
                if (deadlineRaw) {
                    const deadlineMs = new Date(deadlineRaw).getTime();
                    const nowMs = donationNow || Date.now();
                    const diffMs = deadlineMs - nowMs;
                    if (diffMs > 0) {
                        const totalSecs = Math.floor(diffMs / 1000);
                        const days  = Math.floor(totalSecs / 86400);
                        const hours = Math.floor((totalSecs % 86400) / 3600);
                        const mins  = Math.floor((totalSecs % 3600) / 60);
                        countdown = { days, hours, mins, isUrgent: days < 3 };
                    } else {
                        countdown = { days: 0, hours: 0, mins: 0, isUrgent: true, expired: true };
                    }
                }
                
                return (
                <section className="page-container page-section pt-0" style={{ paddingBottom: '16px' }}>
                    
                    <div className={`dn-card${countdown?.isUrgent ? ' dn-urgent' : ''}`}>
                        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '150px', height: '150px', background: `radial-gradient(circle, ${countdown?.isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)'} 0%, transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-50%', left: '-10%', width: '150px', height: '150px', background: `radial-gradient(circle, ${countdown?.isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.15)'} 0%, transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none' }} />
                        
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className="dn-top">
                                <div className="dn-left">
                                    <div className={`dn-icon${countdown?.isUrgent ? ' dn-icon-urgent' : ''}`}>
                                        {countdown?.isUrgent
                                            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                        }
                                    </div>
                                    <div>
                                        <h3 className="dn-title">{appSettings.donation_text || 'Bize Destek Olun!'}</h3>
                                    </div>
                                </div>
                                
                                {hasAnyBtn && (
                                    <div className="dn-buttons">
                                        {appSettings.paypal_url && (
                                            <a href={appSettings.paypal_url} target="_blank" rel="noopener noreferrer" className="dn-btn" onMouseEnter={e => { e.currentTarget.style.background = '#00457C'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.825l-.173 1.089 1.158 7.346H7.28l-.96 6.081c-.065.412.253.787.67.787h3.918c.46 0 .85-.334.922-.787l.038-.196.733-4.645.047-.257c.072-.453.462-.787.922-.787h.58c3.76 0 6.7-1.528 7.558-5.946.36-1.847.174-3.39-.486-4.48z"/></svg>
                                                PayPal
                                            </a>
                                        )}
                                        {appSettings.kofi_url && (
                                            <a href={appSettings.kofi_url} target="_blank" rel="noopener noreferrer" className="dn-btn" onMouseEnter={e => { e.currentTarget.style.background = '#FF5E5B'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>
                                                Ko-fi
                                            </a>
                                        )}
                                        {appSettings.kreosus_url && (
                                            <a href={appSettings.kreosus_url} target="_blank" rel="noopener noreferrer" className="dn-btn" onMouseEnter={e => { e.currentTarget.style.background = '#8b5cf6'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                                Kreosus
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {goalEnabled && (
                                <div className="dn-goal-wrap">
                                    <div className="dn-goal-top">
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span className="dn-goal-label">{goalLabel}:</span>
                                            <span className="dn-goal-val">
                                                {isPctMode ? `%${goalPct}` : `${goalCurrency}${Number(goalCurrent).toLocaleString('tr-TR')}`} 
                                                <span className="dn-goal-max"> / {isPctMode ? '%100' : `${Number(goalTarget).toLocaleString('tr-TR')}`}</span>
                                            </span>
                                        </div>
                                        {isComplete && (
                                            <div style={{ padding: '2px 6px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                Ulaşıldı
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${goalPct}%`, height: '100%', background: isComplete ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' : countdown?.isUrgent ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' : 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)', borderRadius: '10px' }} />
                                    </div>
                                    {countdown && !countdown.expired && (
                                        <div className="dn-countdown">
                                            <span className={`dn-countdown-label${countdown.isUrgent ? ' urgent' : ''}`}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                Kalan süre:
                                            </span>
                                            {countdown.days > 0 && (
                                                <>
                                                    <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                                        <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{countdown.days}</span>
                                                        <span className="dn-countdown-lbl">gün</span>
                                                    </div>
                                                    <span className="dn-countdown-sep">:</span>
                                                </>
                                            )}
                                            <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                                <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{String(countdown.hours).padStart(2,'0')}</span>
                                                <span className="dn-countdown-lbl">saat</span>
                                            </div>
                                            <span className="dn-countdown-sep">:</span>
                                            <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                                <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{String(countdown.mins).padStart(2,'0')}</span>
                                                <span className="dn-countdown-lbl">dak</span>
                                            </div>
                                        </div>
                                    )}
                                    {countdown?.expired && (
                                        <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            Kampanya süresi doldu
                                        </div>
                                    )}
                                </div>
                            )}
                            {!goalEnabled && countdown && !countdown.expired && (
                                <div className="dn-goal-wrap" style={{ marginTop: 10 }}>
                                    <div className="dn-countdown">
                                        <span className={`dn-countdown-label${countdown.isUrgent ? ' urgent' : ''}`}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Kalan süre:
                                        </span>
                                        {countdown.days > 0 && (
                                            <>
                                                <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                                    <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{countdown.days}</span>
                                                    <span className="dn-countdown-lbl">gün</span>
                                                </div>
                                                <span className="dn-countdown-sep">:</span>
                                            </>
                                        )}
                                        <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                            <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{String(countdown.hours).padStart(2,'0')}</span>
                                            <span className="dn-countdown-lbl">saat</span>
                                        </div>
                                        <span className="dn-countdown-sep">:</span>
                                        <div className={`dn-countdown-unit${countdown.isUrgent ? ' urgent' : ''}`}>
                                            <span className={`dn-countdown-num${countdown.isUrgent ? ' urgent' : ''}`}>{String(countdown.mins).padStart(2,'0')}</span>
                                            <span className="dn-countdown-lbl">dak</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                );
            })()}
            
{/* Continue Reading (Homepage) */}
      {user && readingHistory.length > 0 && (
          <section className="page-container page-section pt-0" style={{ paddingBottom: '14px' }}>
             <Link href={`/read/${readingHistory[0].chapter_id}`} className="continue-reading-card group">
                {/* Arka plan blur görseli */}
                <div className="cr-bg" style={{ backgroundImage: `url(${readingHistory[0].cover_url || '/demo/cover1.jpg'})` }} />
                {/* Kapak */}
                <div className="cr-cover-wrapper">
                    <Image src={readingHistory[0].cover_url || '/demo/cover1.jpg'} alt={`${readingHistory[0].series_title || 'Seri'} kapak görseli`} fill unoptimized sizes="80px" className="cr-cover" style={{ objectFit: 'cover' }} />
                </div>
                {/* Bilgi */}
                <div className="cr-info">
                   <span className="cr-subtitle">
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                     {appSettings.lang_continue_reading || 'OKUMAYA DEVAM ET'}
                   </span>
                   <h3 className="cr-title">{readingHistory[0].series_title}</h3>
                   <span className="cr-chapter">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      Bölüm {fmtCh(readingHistory[0].chapter_number)}
                      {readingHistory[0].latest_chapter && readingHistory[0].latest_chapter > readingHistory[0].chapter_number ? (
                          <span className="cr-badge">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            +{Math.floor(readingHistory[0].latest_chapter - readingHistory[0].chapter_number)} {appSettings.lang_new_badge || 'Yeni'}
                          </span>
                      ) : null}
                    </span>
                </div>
                {/* Aksiyon */}
                <div className="cr-action">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
             </Link>
          </section>
      )}

      {/* Trending Series (Numbered) - Full Width Grid above the split */}
      {!loading && trending.length > 0 && (
        <section className="page-container page-section pt-0">
          <div className="section-header">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
              {appSettings.lang_trending_right_now || 'Şu Anda Trend Olanlar'}
            </h2>
          </div>
          <TrendingWidget design={appSettings.trending_design || 'trend_style1'} trending={trending} />
        </section>
      )}

      {/* MAIN LAYOUT: 2-COLUMN STRUCTURE (SCANLATION STYLE) */}
      <section className="page-container page-section pt-0 pb-40">
        <div className="main-layout">
          
          {/* LEFT COLUMN: LATEST UPDATES */}
          <div className="main-content" id="latest-updates-section">
            {/* Genel Sohbet — trend olanların altında, son güncellemelerin üstünde, editör seçiminin solunda */}
            <div className="gchat-slot">
              <GlobalChat />
            </div>

            <div className="section-header">
              <h2 className="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {appSettings.lang_latest_updates || 'Son Güncellemeler'}
              </h2>
              <div className="update-type-toggle" role="group" aria-label="İçerik türü filtresi">
                <button
                  type="button"
                  className={`utt-btn${updateTypeFilter === 'normal' ? ' active' : ''}`}
                  onClick={() => setUpdateTypeFilter('normal')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  Normal
                </button>
                <button
                  type="button"
                  className={`utt-btn${updateTypeFilter === 'novel' ? ' active' : ''}`}
                  onClick={() => setUpdateTypeFilter('novel')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  Novel
                </button>
              </div>
            </div>
            
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner"></div></div>
            ) : (
              <div className="updates-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '12px', minWidth: 0, width: '100%' }}>
                {filteredUpdates.map(s => (
                  <UpdateCard
                    key={s.id}
                    s={s}
                    mounted={mounted}
                    user={user}
                    appSettings={appSettings}
                    onChapterTimeAgo={getChapterTimeAgo}
                    CardComponent={CardComponent}
                  />
                ))}
              </div>
            )}
            
            {!loading && updatesTotalPages > 1 && (
              <>
                <div className="updates-pagination">
                  {/* Önceki */}
                  <button
                    className="upg-nav-btn"
                    onClick={() => goToUpdatesPage(updatesPage - 1)}
                    disabled={updatesPage <= 1 || updatesPageLoading}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    Önceki
                  </button>

                  {/* Sayfa numaraları */}
                  {Array.from({ length: updatesTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === updatesTotalPages || Math.abs(p - updatesPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="upg-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className={`upg-page-btn${p === updatesPage ? ' active' : ''}`}
                          onClick={() => goToUpdatesPage(p)}
                          disabled={updatesPageLoading}
                        >
                          {p}
                        </button>
                      )
                    )
                  }

                  {/* Sonraki */}
                  <button
                    className="upg-nav-btn"
                    onClick={() => goToUpdatesPage(updatesPage + 1)}
                    disabled={updatesPage >= updatesTotalPages || updatesPageLoading}
                  >
                    Sonraki
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Sayfa bilgisi */}
                  <span className="upg-page-info">{updatesPage} / {updatesTotalPages}</span>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: SIDEBAR */}
          <aside className="sidebar">
            
            {/* User Continue Reading Widget removed to prevent duplication */}

            {/* Editor's Pick Widget (Deck stack carousel) */}
            {!loading && editorPicks.length > 0 && (() => {
              const activeEP = editorPicks[activeEPIndex] || editorPicks[0] || {};
              const prevEP = editorPicks[(activeEPIndex - 1 + editorPicks.length) % editorPicks.length] || activeEP;
              const nextEP = editorPicks[(activeEPIndex + 1) % editorPicks.length] || activeEP;
              
              if (!activeEP.id) return null;
              
              return (
                <div className="sidebar-widget epw-deck-widget" style={{
                  padding: '24px 20px 20px',
                  background: 'linear-gradient(160deg, var(--bg-secondary) 0%, var(--bg-card) 100%)',
                  borderRadius: '18px',
                  border: '1px solid rgba(var(--accent-rgb,94,114,228),0.18)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Dekoratif arka plan parıltısı */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--accent-rgb,94,114,228),0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover,#4f46e5))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {toTitleCaseTr(appSettings.lang_editors_pick || 'Editörün Seçimi')}
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0 36px' }}>
                      Sizin için özenle seçilen en iyiler
                    </p>
                  </div>
                  
                  {/* 3D Cover Deck Container */}
                  <div className="epw-deck-container" style={{ position: 'relative', height: '260px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0 20px 0' }}>
                    
                    {/* Left (Previous) Card */}
                    {editorPicks.length > 1 && (
                      <div 
                        key={`epw-prev-${prevEP.id}`}
                        className="epw-deck-card prev" 
                        onClick={() => setActiveEPIndex((activeEPIndex - 1 + editorPicks.length) % editorPicks.length)}
                        style={{ 
                          position: 'absolute', 
                          width: '140px', 
                          height: '210px', 
                          borderRadius: '12px', 
                          overflow: 'hidden', 
                          transform: 'translateX(-65px) scale(0.85) rotate(-6deg)', 
                          opacity: 0.45, 
                          zIndex: 1, 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
                        }}
                      >
                        <img src={prevEP.cover_url || '/demo/cover1.jpg'} alt={`${prevEP.title || 'Seri'} kapak görseli`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                      </div>
                    )}

                    {/* Right (Next) Card */}
                    {editorPicks.length > 1 && (
                      <div 
                        key={`epw-next-${nextEP.id}`}
                        className="epw-deck-card next" 
                        onClick={() => setActiveEPIndex((activeEPIndex + 1) % editorPicks.length)}
                        style={{ 
                          position: 'absolute', 
                          width: '140px', 
                          height: '210px', 
                          borderRadius: '12px', 
                          overflow: 'hidden', 
                          transform: 'translateX(65px) scale(0.85) rotate(6deg)', 
                          opacity: 0.45, 
                          zIndex: 1, 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
                        }}
                      >
                        <Image src={nextEP.cover_url || '/demo/cover1.jpg'} alt={`${nextEP.title || 'Seri'} kapak görseli`} fill unoptimized sizes="140px" style={{ objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Active (Center) Card */}
                    <div 
                      key={`epw-active-${activeEP.id}`}
                      className="epw-deck-card active" 
                      style={{ 
                        position: 'absolute', 
                        width: '160px', 
                        height: '240px', 
                        borderRadius: '12px', 
                        overflow: 'hidden', 
                        transform: 'scale(1) translateX(0)', 
                        opacity: 1, 
                        zIndex: 3, 
                        transition: 'all 0.3s ease',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.6)',
                        border: activeEP.is_adult ? '2px solid rgba(239,68,68,0.4)' : '2px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <Image src={activeEP.cover_url || '/demo/cover1.jpg'} alt={activeEP.title} fill unoptimized sizes="160px" style={{ objectFit: 'cover', ...(activeEP.is_adult && !user ? { filter: 'blur(14px)', transform: 'scale(1.1)' } : {}) }} />
                      {/* Yetişkin içerik koruması — editör seçimi */}
                      {activeEP.is_adult && !user && (
                        <a href="/login" style={{
                          position: 'absolute', inset: 0, zIndex: 10,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                          textDecoration: 'none', color: '#fff', borderRadius: 'inherit',
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', padding: '0 6px' }}>18+<br/>Giriş Yapın</span>
                        </a>
                      )}
                      
                      {/* Navigation Arrow Overlays */}
                      {editorPicks.length > 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveEPIndex((activeEPIndex - 1 + editorPicks.length) % editorPicks.length); }}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(12, 12, 15, 0.7)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              zIndex: 20, /* adult overlay (10) üzerinde kalmalı */
                              padding: 0
                            }}
                            aria-label="Previous"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveEPIndex((activeEPIndex + 1) % editorPicks.length); }}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(12, 12, 15, 0.7)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              zIndex: 20, /* adult overlay (10) üzerinde kalmalı */
                              padding: 0
                            }}
                            aria-label="Next"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dots Pill Indicator */}
                  {editorPicks.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                      {editorPicks.map((_, idx) => {
                        const isActive = idx === activeEPIndex;
                        return (
                          <button 
                            key={idx} 
                            onClick={() => setActiveEPIndex(idx)}
                            style={{
                              padding: 0,
                              border: 'none',
                              width: isActive ? '20px' : '6px',
                              height: '6px',
                              borderRadius: '10px',
                              background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Details Section — animated on index change */}
                  <div key={`ep-details-${activeEPIndex}`} className="epw-deck-content-animate" style={{ textAlign: 'center' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {activeEP.title}
                    </h4>
                    
                    {activeEP.description && (
                      <p style={{ 
                        fontSize: '0.78rem', 
                        color: 'var(--text-secondary)', 
                        margin: '6px 0 12px 0', 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.4'
                      }}>
                        {activeEP.description}
                      </p>
                    )}

                    {/* Badges Row */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                        {formatType(activeEP.type)}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
                        {STATUS_TR[activeEP.status] || activeEP.status}
                      </span>
                    </div>

                    {/* Buttons Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <Link 
                        href={`/seri/${activeEP.slug || activeEP.id}`} 
                        className="btn btn-primary" 
                        style={{ 
                          padding: '10px 12px', 
                          fontSize: '0.8rem', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          borderRadius: '8px',
                          background: 'var(--accent)'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        {appSettings.lang_start_reading || 'Şimdi Oku'}
                      </Link>
                      <Link 
                        href={`/seri/${activeEP.slug || activeEP.id}#reading-list`} 
                        className="btn btn-ghost" 
                        style={{ 
                          padding: '10px 12px', 
                          fontSize: '0.8rem', 
                          fontWeight: 600, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {appSettings.lang_add_to_list || 'Listeye Ekle'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Most Read Widget — v3 (reference style) */}
            <div className="mr3-widget-transparent" style={{ marginBottom: '24px' }}>
              {/* Header row: title left, tabs right */}
              <div className="mr3-header">
                <h3 className="mr3-title">{appSettings.lang_most_read || 'En Çok Okunanlar'}</h3>
                <div className="mr3-tabs">
                  {[
                    ['daily', appSettings.lang_period_daily || 'Günlük'],
                    ['weekly', appSettings.lang_period_weekly || 'Haftalık'],
                    ['monthly', appSettings.lang_period_monthly || 'Aylık'],
                    ['all', appSettings.lang_period_all || 'Tümü'],
                  ].map(([key, label]) => (
                    <button key={key} className={`mr3-tab ${topPeriod === key ? 'active' : ''}`} onClick={() => setTopPeriod(key)}>
                      {capitalizeFirst(label)}
                    </button>
                  ))}
                </div>
              </div>

                <MostReadWidget 
                design={appSettings.most_read_design || 'mr_style1'} 
                topSeries={topSeries} 
                topLoading={topLoading} 
                lang_rating={appSettings.lang_rating} 
              />
              {!topLoading && topSeries.length === 0 && (
                  <div className="empty-text" style={{padding:'20px 0',textAlign:'center'}}>{appSettings.lang_no_views || 'Henüz görüntülenme kaydedilmedi.'}</div>
              )}
            </div>

          </aside>
        </div>
      </section>

      {/* Stats Bar — Bottom (shown only when show_stats_bar != '0') */}
      {!loading && mounted && appSettings.show_stats_bar !== '0' && (
        <div className="stats-bar" style={{
          marginTop: '40px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div className="stats-bar-inner" style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'center',
            maxWidth: 640, margin: '0 auto', padding: '0 16px',
          }}>
            {/* Seri */}
            <div className="stat-item" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '16px 12px' }}>
              <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb,94,114,228),0.10)', border: '1px solid rgba(var(--accent-rgb,94,114,228),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light,#a5b4fc)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span className="stat-number" style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{stats.series.toLocaleString('tr-TR')}</span>
                <span className="stat-label" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{appSettings.lang_stat_series || 'Seri'}</span>
              </div>
            </div>
            {/* Ayırıcı */}
            <div className="stat-sep" style={{ width: 1, background: 'var(--border-color)', margin: '14px 0', opacity: 0.6 }} />
            {/* Bölüm */}
            <div className="stat-item" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '16px 12px' }}>
              <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb,94,114,228),0.10)', border: '1px solid rgba(var(--accent-rgb,94,114,228),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light,#a5b4fc)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span className="stat-number" style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{stats.chapters.toLocaleString('tr-TR')}</span>
                <span className="stat-label" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{appSettings.lang_stat_chapters || 'Bölüm'}</span>
              </div>
            </div>
            {/* Ayırıcı */}
            <div className="stat-sep" style={{ width: 1, background: 'var(--border-color)', margin: '14px 0', opacity: 0.6 }} />
            {/* Üye */}
            <div className="stat-item" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '16px 12px' }}>
              <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb,94,114,228),0.10)', border: '1px solid rgba(var(--accent-rgb,94,114,228),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light,#a5b4fc)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <span className="stat-number" style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{(stats.users || 0).toLocaleString('tr-TR')}</span>
                <span className="stat-label" style={{ display: 'block', fontSize: '0.63rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{appSettings.lang_stat_members || 'Üye'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Bug Report Modal — createPortal ile doğrudan body'ye mount edilir, her zaman ekran ortasında */}
      {showBugModal && typeof document !== 'undefined' && createPortal(
        <div
          className="bug-modal-overlay"
          onClick={() => setShowBugModal(false)}
        >
          <div className="bug-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bug-modal-header">
              <h3 className="bug-modal-title">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
                </svg>
                Hata Bildir
              </h3>
              <button className="bug-modal-close" onClick={() => setShowBugModal(false)}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleBugSubmit} className="bug-modal-form">
              {bugMessage && (
                <div className={`bug-modal-alert ${bugMessageType}`}>{bugMessage}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Başlık</label>
                <input
                  type="text"
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  placeholder="örn. Bölüm sayfaları yüklenmiyor"
                  required
                  className="bug-modal-input"
                />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Açıklama / Detaylar</label>
                <textarea
                  value={bugDesc}
                  onChange={(e) => setBugDesc(e.target.value)}
                  placeholder="Yaşadığınız sorunu detaylıca açıklayın..."
                  rows={4}
                  required
                  className="bug-modal-textarea"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="bug-modal-btn-cancel"
                  onClick={() => setShowBugModal(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={bugSubmitting}
                  className={`bug-modal-btn-submit ${bugSubmitting ? 'submitting' : ''}`}
                >
                  {bugSubmitting ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Gönder
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
