'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import CommentSection from '@/components/CommentSection';
import SeriesCard from '@/components/SeriesCard';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { getDominantColor, generateAdaptivePalette } from '@/components/ColorUtils';
import { genreToSlug } from '@/lib/genreSlug';

// Bileşen dışında tek bir formatter instance — her render'da yeniden oluşturulmasını önler
const trFormatter = new Intl.NumberFormat('tr-TR');

const CHAPTERS_INITIAL = 20;
const CHAPTERS_PER_LOAD = 20;
const CHAPTERS_SCROLL_HEIGHT = 480; // px — scroll modunda kutu yüksekliği (tüm bölümler bu kutu içinde)

const STATUS_TR = { 'ongoing': 'Devam Ediyor', 'completed': 'Tamamlandı', 'hiatus': 'Ara Verildi', 'cancelled': 'İptal Edildi', 'current': 'Güncel' };

const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
    'Ecchi': 'Ecchi', 'Harem': 'Harem', 'Josei': 'Josei', 'Mature': 'Yetişkin',
    'Mecha': 'Mecha', 'Psychological': 'Psikolojik', 'Seinen': 'Seinen', 'Shoujo': 'Shoujo',
    'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam', 'Sports': 'Spor',
    'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua'
};

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



const ReadingIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
);
const CompletedIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);
const PlanIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
);
const DroppedIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
);
const RemoveIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
);

const LIST_OPTIONS_BASE = [
    { value: 'reading',   labelKey: 'lang_list_reading',    fallback: 'Okuyor',       Icon: ReadingIcon },
    { value: 'completed', labelKey: 'lang_list_completed',  fallback: 'Tamamlandı',   Icon: CompletedIcon },
    { value: 'plan',      labelKey: 'lang_list_plan',       fallback: 'Okuma Planı',  Icon: PlanIcon },
    { value: 'dropped',   labelKey: 'lang_list_dropped',    fallback: 'Bırakıldı',    Icon: DroppedIcon },
];

export default function SeriesDetailClient({ series, chapters, relatedSeries: initialRelated }) {
    const { user, authFetch } = useAuth();
    const { settings: appSettings = {} } = useSettings() || {};
    const [relatedSeries, setRelatedSeries] = useState(initialRelated || []);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [favoriteMsg, setFavoriteMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [sortDesc, setSortDesc] = useState(true);
    const [dominantColor, setDominantColor] = useState(null);
    const [descExpanded, setDescExpanded] = useState(false);
    const [readingListStatus, setReadingListStatus] = useState(null);
    const [showListDropdown, setShowListDropdown] = useState(false);
    const [showAllChapters, setShowAllChapters] = useState(false);
    const [visibleChapterCount, setVisibleChapterCount] = useState(CHAPTERS_INITIAL);
    const [chapterSearch, setChapterSearch] = useState('');
    const [showStickyCTA, setShowStickyCTA] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [continueChapter, setContinueChapter] = useState(null); // { chapter_number, id }
    const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);

    // User rating state
    const [userRating, setUserRating] = useState(null); // 1-5
    const [hoverRating, setHoverRating] = useState(null);
    const [ratingLoading, setRatingLoading] = useState(false);
    const [ratingVoteCount, setRatingVoteCount] = useState(series.vote_count || 0);
    const [avgRating, setAvgRating] = useState(series.rating || null);
    const [ratingMsg, setRatingMsg] = useState('');

    // Adult content gate
    const isAdult = !!series.is_adult;
    const [ageVerified, setAgeVerified] = useState(false);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [ageDeclined, setAgeDeclined] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check if user has already verified age for this session
        if (isAdult && user) {
            try {
                const verified = localStorage.getItem('adult_age_verified') === '1';
                if (verified) {
                    setAgeVerified(true);
                } else {
                    setShowAgeGate(true);
                }
            } catch {
                setShowAgeGate(true);
            }
        }
    }, [isAdult, user]);

    // Load last read chapter for "Continue Reading" feature
    useEffect(() => {
        if (!series?.id || !chapters || chapters.length === 0) return;

        async function loadContinueChapter() {
            // 1. Try reading history API if user is logged in
            if (user && authFetch) {
                try {
                    const res = await authFetch(`/api/users/reading-history`);
                    if (res && res.ok) {
                        const data = await res.json();
                        const entry = (data.history || []).find(h => h.series_id === series.id);
                        if (entry && entry.chapter_number) {
                            const ch = chapters.find(c => c.chapter_number === entry.chapter_number);
                            if (ch) { setContinueChapter(ch); return; }
                        }
                    }
                } catch { /* fall through to localStorage */ }
            }
            // 2. Fall back to localStorage (works for guests too)
            try {
                const saved = localStorage.getItem(`yt_series_lastchapter_${series.id}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const ch = chapters.find(c => c.id === parsed.id || c.chapter_number === parsed.chapter_number);
                    if (ch) setContinueChapter(ch);
                }
            } catch { /* ignore */ }
        }

        loadContinueChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [series?.id, user, chapters]);

    useEffect(() => {
        let rafId = null;
        function handleScroll() {
            // rAF throttle — scroll jank önler
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const shouldShow = window.scrollY > 450;
                setShowStickyCTA(prev => prev === shouldShow ? prev : shouldShow);
            });
        }
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    // Fetch related series if not provided server-side
    useEffect(() => {
        if (initialRelated && initialRelated.length > 0) return;
        if (!series?.id) return;
        async function fetchRelated() {
            try {
                const res = await fetch(`/api/series/similar?id=${series.id}&limit=6`);
                const data = await res.json();
                setRelatedSeries(data.similar || []);
            } catch { }
        }
        fetchRelated();
    }, [series?.id, initialRelated]);

    useEffect(() => {
        if (user && series?.id) {
            checkFavorite(series.id);
            checkReadingList(series.id);
        }
    }, [user, series?.id]);

    useEffect(() => {
        if (!showListDropdown) return;
        function handleClick(e) {
            if (!e.target.closest('.reading-list-dropdown-wrapper')) setShowListDropdown(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showListDropdown]);

    function handleAgeAccept() {
        try { localStorage.setItem('adult_age_verified', '1'); } catch {}
        setAgeVerified(true);
        setShowAgeGate(false);
    }

    function handleAgeDecline() {
        setAgeDeclined(true);
        setShowAgeGate(false);
    }

    async function checkFavorite(numericId) {
        try {
            const res = await authFetch(`/api/favorites?seriesId=${numericId}`);
            const data = await res.json();
            setIsFavorite(data.isFavorite);
        } catch { }
    }

    async function checkReadingList(numericId) {
        try {
            const res = await authFetch(`/api/reading-list?status=all`);
            if (!res) return;
            const data = await res.json();
            const entry = (data.list || []).find(item => item.series_id === numericId);
            setReadingListStatus(entry?.status || null);
        } catch { }
    }

    async function updateReadingList(status) {
        if (!user || !series?.id) return;
        setShowListDropdown(false);
        try {
            if (status === null) {
                await authFetch(`/api/reading-list?seriesId=${series.id}`, { method: 'DELETE' });
                setReadingListStatus(null);
            } else {
                await authFetch('/api/reading-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seriesId: series.id, status })
                });
                setReadingListStatus(status);
            }
        } catch (err) { console.error(err); }
    }

    async function toggleFavorite() {
        if (!series?.id) return;
        if (!user) {
            // Önceden burada hiçbir geri bildirim yoktu — buton görsel olarak
            // tıklanabilir duruyordu ama giriş yapılmadığında sessizce hiçbir
            // şey yapmıyordu, bu da "buton çalışmıyor" izlenimi veriyordu.
            setFavoriteMsg('Takip etmek için giriş yapın');
            setTimeout(() => setFavoriteMsg(''), 2500);
            return;
        }
        // Aynı anda birden fazla tıklamanın (çift istek) state'i tutarsız
        // hale getirmesini önlemek için istek sürerken butonu kilitle.
        if (favoriteLoading) return;
        setFavoriteLoading(true);
        try {
            const res = await authFetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seriesId: series.id })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Takip durumu güncellenemedi');
            setIsFavorite(data.isFavorite);
        } catch (err) {
            console.error(err);
            setFavoriteMsg(err.message || 'Takip durumu güncellenemedi');
            setTimeout(() => setFavoriteMsg(''), 2500);
        } finally {
            setFavoriteLoading(false);
        }
    }

    // Fetch user's existing rating for this series
    useEffect(() => {
        if (!series?.id) return;
        // authFetch varsa (giriş yapılmışsa) onu kullan; yoksa anonim fetch
        const fetcher = authFetch || fetch;
        fetcher(`/api/series/rate?seriesId=${series.id}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setUserRating(d.user_rating);
                    if (d.avg_rating) setAvgRating(d.avg_rating);
                    if (d.vote_count !== undefined) setRatingVoteCount(d.vote_count);
                }
            })
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [series?.id, user?.id]);

    async function submitRating(value) {
        if (!user) { setRatingMsg('Puan vermek için giriş yapın'); setTimeout(() => setRatingMsg(''), 2500); return; }
        if (ratingLoading) return;
        setRatingLoading(true);
        try {
            const res = await authFetch('/api/series/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seriesId: series.id, rating: value })
            });
            const data = await res.json();
            if (data.success) {
                setUserRating(data.user_rating);
                setAvgRating(data.avg_rating);
                setRatingVoteCount(data.vote_count);
                setRatingMsg('Puanınız kaydedildi!');
            } else {
                setRatingMsg(data.error || 'Puan gönderilemedi');
            }
        } catch { setRatingMsg('Bir hata oluştu'); }
        setRatingLoading(false);
        setTimeout(() => setRatingMsg(''), 2500);
    }

    function shareSeries() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const fmtNum = useCallback((n) => {
        if (!n) return '0';
        return trFormatter.format(n);
    }, []);

    const genres = useMemo(() =>
        Array.isArray(series.genres) ? series.genres : (() => { try { return JSON.parse(series.genres || '[]'); } catch { return []; } })()
    , [series.genres]);
    const palette = useMemo(() => generateAdaptivePalette(dominantColor), [dominantColor]);
    const adaptiveStyles = useMemo(() => palette ? {
        '--accent': palette.accent,
        '--accent-light': palette.accentLight,
        '--accent-glow': palette.accentGlow,
        '--gradient-hero': palette.gradientHero,
        '--gradient-primary': palette.gradientPrimary
    } : {}, [palette]);

    const LIST_OPTIONS = LIST_OPTIONS_BASE.map(o => ({ ...o, label: appSettings[o.labelKey] || o.fallback }));
    const descText = series.description || (appSettings.lang_no_synopsis || 'Bu seri için özet mevcut değil.');
    const isLongDesc = descText.length > 250;

    const sortedChapters = useMemo(() =>
        [...chapters].sort((a, b) => sortDesc ? b.chapter_number - a.chapter_number : a.chapter_number - b.chapter_number),
    [chapters, sortDesc]);
    const filteredChapters = useMemo(() => chapterSearch.trim()
        ? sortedChapters.filter(ch => {
            const q = chapterSearch.toLowerCase();
            return String(ch.chapter_number).includes(q) || (ch.title || '').toLowerCase().includes(q);
        })
        : sortedChapters,
    [sortedChapters, chapterSearch]);

    // Her chapter için pahalı hesaplamaları (tarih parse, isNew, chNum, hasTitle) tek seferinde memoize et
    // Böylece render sırasında her satır için tekrar hesaplanmaz
    const now = useMemo(() => Date.now(), []);
    const processedChapters = useMemo(() => filteredChapters.map(ch => {
        const raw = String(ch.created_at || '');
        const normalized = raw.includes('T') ? (raw.endsWith('Z') ? raw : raw + 'Z') : raw.replace(' ', 'T') + 'Z';
        const ts = new Date(normalized).getTime();
        const dateStr = isNaN(ts) ? '' : new Date(normalized).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' });
        const isNew = !isNaN(ts) && (now - ts) < 24 * 60 * 60 * 1000;
        const chNum = Number(ch.chapter_number) % 1 === 0 ? Math.floor(ch.chapter_number) : ch.chapter_number;
        const hasTitle = ch.title && !isDefaultTitle(ch.title, ch.chapter_number);
        return { ...ch, _dateStr: dateStr, _isNew: isNew, _chNum: chNum, _hasTitle: hasTitle };
    }), [filteredChapters, now]);

    // visibleChapters: scroll modunda tüm bölümler gösterilir, expanded modunda da tümü
    const hasMore = false; // artık sayfalama yok — scroll veya expanded

    const currentListLabel = readingListStatus
        ? (LIST_OPTIONS.find(o => o.value === readingListStatus)?.label || (appSettings.lang_add_to_list || 'Listeye Ekle'))
        : (appSettings.lang_add_to_list || 'Listeye Ekle');

    const firstChapter = sortedChapters[sortedChapters.length - 1];
    const lastChapter = sortedChapters[0];

    const designClass = appSettings.series_detail_design ? appSettings.series_detail_design.replace('_', '-') : 'detail-style1';

    // Adult series — guest visitors: show login wall
    if (isAdult && !user) {
        return (
            <div className="page-container fade-in" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 440 }}>
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
                        Yetişkin İçeriği
                    </h2>
                    <div style={{
                        width: 120, height: 170, borderRadius: 10, overflow: 'hidden',
                        margin: '0 auto 20px', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                    }}>
                        <img src={series.cover_url || '/demo/cover1.jpg'} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px)', transform: 'scale(1.1)' }} decoding="async" />
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: 'rgba(0,0,0,0.45)'
                        }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 8, lineHeight: 1.6 }}>
                        <strong style={{ filter: 'blur(5px)', userSelect: 'none' }}>{series.title}</strong>
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>
                        Bu seri yetişkin içeriği barındırmaktadır. Görüntülemek için lütfen giriş yapın veya kayıt olun.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/login" style={{
                            padding: '10px 28px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
                            fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem',
                            display: 'inline-flex', alignItems: 'center', gap: 8
                        }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                                <polyline points="10 17 15 12 10 7"/>
                                <line x1="15" y1="12" x2="3" y2="12"/>
                            </svg>
                            Giriş Yap
                        </a>
                        <a href="/register" style={{
                            padding: '10px 28px', borderRadius: 8, background: 'transparent',
                            border: '1px solid var(--border)', color: 'var(--text-primary)',
                            fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem'
                        }}>
                            Kayıt Ol
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Adult series — age declined
    if (isAdult && ageDeclined) {
        return (
            <div className="page-container fade-in" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Erişim Reddedildi</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                        Bu içeriği görüntülemek için 18 yaşında veya daha büyük olmanız gerekmektedir.
                    </p>
                    <a href="/seri" style={{
                        padding: '10px 24px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
                        fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem'
                    }}>← Serilere Dön</a>
                </div>
            </div>
        );
    }

    const fullpageBgEnabled = appSettings.sd_fullpage_bg === '1';
    const fullpageBgBlur = appSettings.sd_fullpage_bg_blur ? parseInt(appSettings.sd_fullpage_bg_blur) : 28;
    const fullpageBgOverlay = appSettings.sd_fullpage_bg_overlay ? parseFloat(appSettings.sd_fullpage_bg_overlay) : 0.72;

    return (
        <div
            className={`page-container fade-in sd-page ${designClass}${fullpageBgEnabled ? ' sd-has-fullpage-bg' : ''}${isAdult && !ageVerified ? ' adult-content-blur' : ''}`}
            style={{
                position: 'relative',
                ...adaptiveStyles,
                ...(fullpageBgEnabled ? { '--sd-bg-blur': `${fullpageBgBlur}px`, '--sd-bg-overlay-opacity': fullpageBgOverlay } : {})
            }}
        >
            {/* ── Age Gate Modal — rendered via Portal to escape blur filter context ── */}
            {mounted && isAdult && showAgeGate && !ageVerified && createPortal(
                <div className="age-gate-backdrop">
                    <div className="age-gate-modal">
                        {/* Icon Badge */}
                        <div className="age-gate-badge">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <div className="age-gate-label">18+</div>
                        <h2 className="age-gate-title">Yetişkin İçeriği</h2>
                        <p className="age-gate-subtitle">Bu seri <strong>18+ yaş</strong> içeriği barındırmaktadır.</p>

                        <div className="age-gate-disclaimer">
                            <p>
                                Bu seri cinsel içerik, şiddet veya yetişkinlere yönelik temalar içerebilir.
                                Devam ederek aşağıdaki koşulları kabul etmiş sayılırsınız:
                            </p>
                            <ul>
                                <li>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>
                                    18 yaşında veya daha büyük olduğunuzu beyan edersiniz.
                                </li>
                                <li>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>
                                    Bulunduğunuz bölgede bu tür içeriklere erişimin yasal olduğunu onaylarsınız.
                                </li>
                                <li>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>
                                    Bu içeriğe kendi isteğinizle eriştiğinizi kabul edersiniz.
                                </li>
                            </ul>
                            <p className="age-gate-disclaimer-note">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                Sorumluluk Reddi: Bu platformun yöneticileri, kullanıcıların bu içeriğe erişiminden doğabilecek herhangi bir zarardan sorumlu tutulamaz.
                            </p>
                        </div>

                        <div className="age-gate-actions">
                            <button className="age-gate-btn-accept" onClick={handleAgeAccept}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Evet, 18 Yaşında veya Büyüğüm
                            </button>
                            <button className="age-gate-btn-decline" onClick={handleAgeDecline}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Hayır, Geri Dön
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Tam Sayfa Sabit Arka Plan (sd_fullpage_bg ayarı aktifse) ── */}
            {fullpageBgEnabled && series.cover_url && mounted && createPortal(
                <>
                    <div className="sd-fullpage-bg-layer">
                        <div
                            className="sd-fullpage-bg-layer-inner"
                            style={{
                                backgroundImage: `url(${series.cover_url})`,
                                filter: `blur(${fullpageBgBlur}px)`,
                            }}
                        />
                    </div>
                    <div className="sd-fullpage-bg-overlay" style={{ background: `rgba(0,0,0,${fullpageBgOverlay})` }} />
                </>,
                document.body
            )}

            {/* Parallax Background */}
            <div className="sd-parallax-wrapper">
                <div 
                    className="sd-parallax-banner" 
                    style={{ backgroundImage: `url(${series.cover_url || '/demo/cover1.jpg'})` }} 
                />
                <div className="sd-parallax-overlay" />
            </div>

            {/* ── Breadcrumb (SEO iç link) ── */}
            <Breadcrumb items={[
                { label: 'Ana Sayfa', href: '/' },
                { label: 'Seriler', href: '/series' },
                { label: series.title },
            ]} />

            {/* ── Main Header ── */}
            <div className="sd-header">
                <div className="sd-header-content">
                    {/* Cover */}
                    <div className="sd-cover-col">
                        <div className="sd-cover-wrap" style={{ cursor: 'zoom-in' }} onClick={() => setCoverLightboxOpen(true)} title="Büyütmek için tıklayın">
                            <img
                                src={series.cover_url || '/demo/cover1.jpg'}
                                alt={`${series.title} manga cover`}
                                className="sd-cover-img"
                                crossOrigin="anonymous"
                                onLoad={(e) => setDominantColor(getDominantColor(e.target))}
                                width={460}
                                height={650}
                                decoding="async"
                                fetchPriority="high"
                            />
                            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#fff', pointerEvents: 'none' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                Büyüt
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="sd-info-col">
                        {/* Title */}
                        <h1 className="sd-title">{series.title}</h1>
                        {series.alt_names && series.alt_names.trim() && (
                            <div className="sd-alt-names-subtitle" title="Diğer Alternatif İsimler">
                                {series.alt_names}
                            </div>
                        )}

                        {/* Description */}
                        <div className="sd-desc-wrap">
                            <p className="sd-desc" style={isLongDesc && !descExpanded ? {
                                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            } : {}}>
                                {descText}
                            </p>
                            {isLongDesc && (
                                <button className="sd-desc-toggle" onClick={() => setDescExpanded(v => !v)}>
                                    {descExpanded ? (appSettings.lang_show_less || 'Daralt ▲') : (appSettings.lang_show_more || 'Devamını Göster ▼')}
                                </button>
                            )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="sd-actions" style={{ position: 'relative' }}>
                            <button
                                className={`sd-btn ${isFavorite ? 'sd-btn-active' : 'sd-btn-outline'}`}
                                onClick={toggleFavorite}
                                disabled={favoriteLoading}
                                aria-busy={favoriteLoading}
                                style={favoriteLoading ? { opacity: 0.7, cursor: 'default' } : undefined}
                            >
                                {favoriteLoading
                                    ? <span className="spinner" style={{ width: 14, height: 14 }} />
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
                                {isFavorite ? (appSettings.lang_bookmarked || 'Takip Ediliyor') : (appSettings.lang_favorite || 'Takip Et')}
                            </button>
                            {favoriteMsg && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {favoriteMsg}
                                </div>
                            )}
                            {firstChapter && (
                                <Link href={`/seri/${series.slug || series.id}/bolum/${firstChapter.chapter_number}`} className="sd-btn sd-btn-outline">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    {capitalizeFirst(appSettings.lang_first_chapter || 'İlk Bölüm')}
                                </Link>
                            )}
                            {lastChapter && lastChapter.id !== firstChapter?.id && (
                                <Link href={`/seri/${series.slug || series.id}/bolum/${lastChapter.chapter_number}`} className="sd-btn sd-btn-outline">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    {capitalizeFirst(appSettings.lang_latest_chapter || 'Son Bölüm')}
                                </Link>
                            )}
                            {continueChapter && continueChapter.id !== firstChapter?.id && (
                                <Link
                                    href={`/seri/${series.slug || series.id}/bolum/${continueChapter.chapter_number}`}
                                    className="sd-btn sd-btn-continue"
                                    title={`Bölüm ${continueChapter.chapter_number}'den devam et`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/>
                                    </svg>
                                    Devam Et · Bölüm {Number(continueChapter.chapter_number) % 1 === 0 ? Math.floor(continueChapter.chapter_number) : continueChapter.chapter_number}
                                </Link>
                            )}
                        </div>

                                                                                                {/* Big Stats */}

                        <div className="neo-stats-card" id="rating-section">
                            {/* 1. The Rating Block */}
                            <div className="neo-rating-block">
                                <div className="neo-rating-score">
                                    {avgRating ? Number(avgRating).toFixed(1) : (series.rating?.toFixed(1) || '0.0')}
                                </div>
                                <div className="neo-rating-info">
                                    <div className="neo-stars-display">
                                        {[1,2,3,4,5].map(v => (
                                            <svg key={v} viewBox="0 0 24 24" fill={v <= Math.round(avgRating || series.rating || 0) ? "currentColor" : "rgba(255,255,255,0.1)"} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                        ))}
                                    </div>
                                    <div className="neo-votes-text">{ratingVoteCount} İnceleme</div>
                                </div>
                            </div>

                            {/* 2. The Metrics Block */}
                            {(() => {
                                // Toplam okunma: tüm bölümlerin read_count değerlerinin toplamı
                                const totalReads = chapters.reduce((sum, ch) => sum + (Number(ch.read_count) || 0), 0);
                                return (
                                    <div className="neo-metrics-block">
                                        <div className="neo-metric">
                                            <div className="neo-metric-icon chapters">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                                            </div>
                                            <div>
                                                <span className="neo-metric-val">{chapters.length}</span>
                                                <span className="neo-metric-lbl">Bölüm</span>
                                            </div>
                                        </div>
                                        <div className="neo-metric">
                                            <div className="neo-metric-icon views">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            </div>
                                            <div>
                                                <span className="neo-metric-val">{fmtNum(totalReads)}</span>
                                                <span className="neo-metric-lbl">Okunma</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 3. The Interactive Rating Component — 5 yıldız (1-5 skala) */}
                            <div className="neo-interactive-rating" onMouseLeave={() => setHoverRating(null)}>
                                <div className="neo-ir-title">
                                    {user ? (userRating ? `Puanın: ${userRating}/5` : (appSettings.lang_rate_series || 'Puanla')) : (appSettings.lang_rate_series || 'Giriş Yap')}
                                </div>
                                <div className="neo-ir-stars">
                                    {[1,2,3,4,5].map(v => {
                                        // v = 1-5 yıldız; DB'de 1-5 olarak saklanır
                                        const ratingVal = v;
                                        const activeThreshold = hoverRating !== null ? hoverRating : (userRating || 0);
                                        const isActive = v <= activeThreshold;
                                        return (
                                            <button
                                                key={v}
                                                className={`neo-ir-star-btn ${isActive ? 'active' : ''}`}
                                                onClick={() => submitRating(ratingVal)}
                                                onMouseEnter={() => setHoverRating(v)}
                                                title={`${v}/5`}
                                                disabled={ratingLoading}
                                            >
                                                <svg viewBox="0 0 24 24" fill={isActive ? '#f59e0b' : 'rgba(255,255,255,0.2)'} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                            </button>
                                        );
                                    })}
                                </div>
                                {ratingMsg && <div style={{fontSize:'0.7rem', color:'#34d399', fontWeight:600}}>{ratingMsg}</div>}
                            </div>
                        </div>

                        {/* Meta details */}
                        <div className="sd-meta-grid" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                            <div className="sd-meta-row">
                                <span className="sd-meta-key">{capitalizeFirst(appSettings.lang_status || 'Durum')}</span>
                                <span className="sd-meta-val">
                                    <span className={`sd-status-dot ${series.status === 'ongoing' ? 'ongoing' : series.status === 'current' ? 'current' : series.status === 'hiatus' ? 'hiatus' : series.status === 'cancelled' ? 'cancelled' : 'completed'}`} />
                                    {STATUS_TR[series.status] || (series.status ? capitalizeFirst(series.status) : '')}
                                </span>
                            </div>
                            {series.type && (
                                <div className="sd-meta-row">
                                    <span className="sd-meta-key">{capitalizeFirst(appSettings.lang_type || 'Tür')}</span>
                                    <span className="sd-meta-val">
                                        <span className="sd-status-dot" style={{ background: '#818cf8' }} />
                                        {formatType(series.type)}
                                    </span>
                                </div>
                            )}
                            {series.author && (
                                <div className="sd-meta-row">
                                    <span className="sd-meta-key">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        {capitalizeFirst(appSettings.lang_author || 'Yazar')}
                                    </span>
                                    <span className="sd-meta-val">{series.author}</span>
                                </div>
                            )}
                            {series.artist && series.artist !== series.author && (
                                <div className="sd-meta-row">
                                    <span className="sd-meta-key">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                                        {capitalizeFirst(appSettings.lang_artist || 'Çizer')}
                                    </span>
                                    <span className="sd-meta-val">{series.artist}</span>
                                </div>
                            )}
                        </div>

                        {/* Genres */}
                        {genres.length > 0 && (
                            <>
                                <div className="sd-genres-new">
                                    {genres.map((g, i) => (
                                        <Link key={i} href={`/tur/${genreToSlug(g)}`} className="sd-genre-tag-new">
                                            <span>#</span>{GENRE_TR[g] || g}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Share + Add to List */}
                        <div className="sd-bottom-actions">
                            {user && (
                                <div className="reading-list-dropdown-wrapper sd-reading-list-wrapper">
                                    <button
                                        className={`sd-btn ${readingListStatus ? 'sd-btn-list-active' : 'sd-btn-outline'}`}
                                        onClick={() => setShowListDropdown(v => !v)}
                                        style={{ gap: 8 }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                        {currentListLabel}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: showListDropdown ? 'rotate(180deg)' : 'none' }}><path d="m6 9 6 6 6-6"/></svg>
                                    </button>
                                    {showListDropdown && (
                                        <div className="reading-list-dropdown">
                                            {LIST_OPTIONS.map(opt => (
                                                <button key={opt.value} onClick={() => updateReadingList(opt.value)} className={`rld-item ${readingListStatus === opt.value ? 'active' : ''}`}>
                                                    <opt.Icon />
                                                    <span>{opt.label}</span>
                                                    {readingListStatus === opt.value && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"/></svg>}
                                                </button>
                                            ))}
                                            {readingListStatus && (
                                                <button onClick={() => updateReadingList(null)} className="rld-item rld-remove">
                                                    <RemoveIcon /><span>Listeden Çıkar</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button className="sd-btn sd-btn-outline sd-share-btn" onClick={shareSeries}>
                                {copied ? (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> {appSettings.lang_copied || 'Kopyalandı!'}</>
                                ) : (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> {appSettings.lang_share || 'Paylaş'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Chapter List ── */}
            <div className="sd-chapters-section">
                <div className="sd-chapters-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 className="sd-chapters-title">{chapters.length} {appSettings.lang_chapters || 'Bölümler'}</h2>
                    </div>
                    {chapters.length > 1 && (
                        <button className="sd-sort-btn" onClick={() => setSortDesc(v => !v)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={sortDesc ? "M11 17l-4 4-4-4M7 21V3M21 3v18" : "M11 7l-4-4-4 4M7 3v18M21 21V3"}/></svg>
                            {sortDesc ? (appSettings.lang_newest || 'En Yeni') : (appSettings.lang_oldest || 'En Eski')}
                        </button>
                    )}
                </div>

                {/* Search */}
                {chapters.length > 5 && (
                    <div className="sd-chapter-search-wrap">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sd-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            type="text"
                            className="sd-chapter-search"
                            placeholder={appSettings.lang_search_chapters || 'Bölüm ara...'}
                            value={chapterSearch}
                            onChange={e => setChapterSearch(e.target.value)}
                        />
                        {chapterSearch && (
                            <button className="sd-search-clear" onClick={() => setChapterSearch('')}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                    </div>
                )}

                {chapters.length === 0 ? (
                    <div className="sd-empty-chapters">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        {appSettings.lang_no_chapters || 'Henüz bölüm yok. Yakında tekrar kontrol edin!'}
                    </div>
                ) : processedChapters.length === 0 ? (
                    <div className="sd-empty-chapters">{appSettings.lang_no_chapters_match || 'Aramanızla eşleşen bölüm bulunamadı.'}</div>
                ) : (
                    <>
                        {/* ── Chapter list rows ── */}
                        <div
                            className={`sd-chapter-list-wrap${showAllChapters ? ' sd-chapter-list-wrap--expanded' : ''}`}
                            style={!showAllChapters ? { maxHeight: `${CHAPTERS_SCROLL_HEIGHT}px`, overflowY: 'auto' } : {}}
                        >
                            <div className="sd-chapter-list">
                                {processedChapters.map(ch => {
                                    const showThumb = appSettings.chapter_thumbnails_enabled === '1';
                                    const thumbSrc = ch.thumbnail_url || null;
                                    // Precomputed değerleri kullan — render sırasında tekrar hesaplamak yok
                                    const { _dateStr: dateStr, _isNew: isNew, _chNum: chNum, _hasTitle: hasTitle } = ch;
                                    return (
                                        <Link
                                            key={ch.id}
                                            href={`/seri/${series.slug || series.id}/bolum/${ch.chapter_number}`}
                                            className="sd-chapter-row"
                                        >
                                            {showThumb && (
                                                <div className="sd-chapter-row-thumb">
                                                    {thumbSrc ? (
                                                        <img src={thumbSrc} alt={`Bölüm ${chNum}`} loading="lazy" decoding="async" />
                                                    ) : (
                                                        <div className="sd-chapter-row-thumb-placeholder">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="sd-chapter-row-info">
                                                <div className="sd-chapter-row-top">
                                                    <span className="sd-chapter-row-num">Bölüm {chNum}</span>
                                                    {hasTitle && <span className="sd-chapter-row-title">{ch.title}</span>}
                                                    {isNew && <span className="sd-chapter-new-badge">YENİ</span>}
                                                    {ch.external_url && (
                                                        <span className="sd-chapter-external-badge" title="Bu bölüm başka bir siteye yönlendirir">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                                            Dış Bağlantı
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="sd-chapter-row-meta">
                                                    {ch.read_count > 0 && (
                                                        <span className="sd-chapter-row-reads">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                            {fmtNum(ch.read_count)}
                                                        </span>
                                                    )}
                                                    {ch.comment_count > 0 && (
                                                        <span className="sd-chapter-row-reads" style={{ color: 'var(--text-muted)' }}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                            {fmtNum(ch.comment_count)}
                                                        </span>
                                                    )}
                                                    <span className="sd-chapter-row-date">{dateStr}</span>
                                                </div>
                                            </div>
                                            <svg className="sd-chapter-row-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Toggle: Tümünü Göster / Scroll Modu ── */}
                        {filteredChapters.length > 0 && (
                            <button
                                className="sd-show-more-btn sd-show-all-toggle"
                                onClick={() => setShowAllChapters(v => !v)}
                                style={{ marginTop: 6 }}
                            >
                                {showAllChapters ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
                                        {appSettings.lang_show_less || 'Daralt'}
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                                        {appSettings.lang_show_all || 'Tümünü Göster'} ({processedChapters.length} bölüm)
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* ── Comments ── */}
            <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                <CommentSection seriesId={series?.id} />
            </div>

            {/* ── You May Also Like ── */}
            {relatedSeries.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <div className="section-header">
                        <h2 className="section-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
                                {appSettings.lang_you_may_also_like || 'Bunları da Beğenebilirsiniz'}
                            </h2>
                            <Link href="/seri" className="section-link">{appSettings.lang_view_all || 'Tümünü Gör'} →</Link>
                    </div>
                    <div className="series-grid">
                        {relatedSeries.map(s => <SeriesCard key={s.id} series={s} />)}
                    </div>
                </div>
            )}

            {/* ── SEO Etiketler — en altta ── */}
            <div className="sd-seo-tags-section glass-panel" style={{ marginTop: 40 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        Etiketler
                    </h2>
                </div>
                <div className="seo-tags-cloud">
                    <Link href={`/seri/${series.slug || series.id}`} className="seo-tag-pill seo-tag-pill--primary">
                        {series.title} Oku
                    </Link>
                    <Link href={`/seri/${series.slug || series.id}`} className="seo-tag-pill seo-tag-pill--primary">
                        {series.title} Türkçe Oku
                    </Link>
                    <Link href={`/seri/${series.slug || series.id}`} className="seo-tag-pill">
                        {series.title} Güncel Bölümler
                    </Link>
                    <Link href="/seri" className="seo-tag-pill">
                        Manga Oku
                    </Link>
                    <Link href="/seri" className="seo-tag-pill">
                        Türkçe Manga Oku
                    </Link>
                    {series.type && (
                        <Link href={`/seri?type=${series.type.toLowerCase()}`} className="seo-tag-pill seo-tag-pill--type">
                            En İyi {formatType(series.type)} Serileri
                        </Link>
                    )}
                    {genres.slice(0, 4).map(g => (
                        <Link key={g} href={`/tur/${genreToSlug(g)}`} className="seo-tag-pill seo-tag-pill--genre">
                            {GENRE_TR[g] || g} Mangaları
                        </Link>
                    ))}
                    {firstChapter && (
                        <Link href={`/seri/${series.slug || series.id}/bolum/${firstChapter.chapter_number}`} className="seo-tag-pill seo-tag-pill--chapter">
                            {series.title} 1. Bölüm
                        </Link>
                    )}
                    {series.alt_names && series.alt_names.trim() && series.alt_names.split(',').slice(0, 3).map((name, i) => name.trim() && (
                        <Link key={`alt-${i}`} href={`/seri/${series.slug || series.id}`} className="seo-tag-pill seo-tag-pill--alt">
                            {name.trim()} Oku
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Cover Lightbox ── */}
            {mounted && coverLightboxOpen && createPortal(
                <div
                    onClick={() => setCoverLightboxOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out', padding: 20,
                    }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <img
                            src={series.cover_url || '/demo/cover1.jpg'}
                            alt={series.title}
                            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} decoding="async" />
                        <button
                            onClick={() => setCoverLightboxOpen(false)}
                            style={{
                                position: 'absolute', top: -16, right: -16,
                                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '50%', width: 36, height: 36,
                                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 700,
                            }}
                        >×</button>
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{series.title}</span>
                    </div>
                </div>,
                document.body
            )}

            {/* Sticky CTA */}
            {mounted && createPortal(
                <div className={`sd-sticky-cta ${showStickyCTA ? 'visible' : ''}`}>
                    <div className="sd-sticky-cta-inner">
                        <img src={series.cover_url || '/demo/cover1.jpg'} alt={`${series.title} kapak görseli`} className="sd-sticky-img" decoding="async" />
                        <div className="sd-sticky-info">
                            <span className="sd-sticky-title">{series.title}</span>
                        </div>
                        {firstChapter && (
                            <Link href={`/seri/${series.slug || series.id}/bolum/${firstChapter.chapter_number}`} className="sd-btn sd-btn-primary" style={{ padding: '8px 24px', margin: 0, whiteSpace: 'nowrap' }}>
                                {appSettings.lang_read_now || 'Okumaya Başla'}
                            </Link>
                        )}
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}