'use client';
import { useState, useEffect, useRef, Suspense, useCallback, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// CommentSection heavy bir bileşen - dynamic import ile lazy load
const CommentSection = lazy(() => import('@/components/CommentSection'));
import { useAuth } from '@/components/AuthProvider';
import { sanitizeBlogHtml } from '@/lib/sanitize-html';

// ── Görsel optimizasyonu yardımcıları ──
// Sayfa görselleri imgbb (i.ibb.co) üzerinden veya yerel /uploads yolundan geliyor.
// next.config.mjs bu domain için remotePattern + AVIF/WebP dönüşümü zaten tanımlı;
// next/image kullanarak cihaz genişliğine göre otomatik küçültülmüş, modern formatta
// (AVIF/WebP) varyantlar servis ediyoruz — bu, orijinal ~1200px genişlikteki dosyayı
// olduğu gibi indirmekten çok daha az veri anlamına gelir (özellikle mobilde).
// Next Image optimizer sadece next.config.mjs'de tanımlı domainlerde çalışabildiği
// için, tanınmayan/harici bir host görürsek güvenli şekilde normal <img>'e düşüyoruz.
const NEXT_IMAGE_OPTIMIZABLE_HOSTS = new Set(['i.ibb.co']);
function isOptimizableImageSrc(url) {
    if (!url) return false;
    // /api/img path'leri CDN tarafından cache'leniyor.
    // /_next/image üzerinden tekrar proxy'lemek bandwidth'i ikiye katlar — muaf tut.
    if (url.startsWith('/api/img')) return false;
    // Diğer yerel path'ler (/uploads/ vb.) next/image'dan geçebilir.
    if (url.startsWith('/')) return true;
    try {
        return NEXT_IMAGE_OPTIMIZABLE_HOSTS.has(new URL(url).hostname);
    } catch {
        return false;
    }
}

// Bölüm sayfası görseli — next/image optimizer URL'i üzerinden (AVIF/WebP +
// boyut küçültme, veri tasarrufu için) yüklenir, sonra TEK bir <img>/<canvas>
// olarak DOM'a konmak yerine yatay şeritlere bölünüp ayrı <canvas>'lara
// çizilir. Amaç: "sağ tık > resmi kaydet", sürükle-bırak veya basit bir
// tarayıcı eklentisinin (bulk image downloader) sayfayı TEK bir dosya olarak
// yakalamasını zorlaştırmak.
//
// DÜRÜST SINIR: Bu, Network sekmesinden ham response body'yi (veya proxy
// üzerinden gelen tek görseli) yakalayan birini durdurmaz — sadece "gör,
// sağ-tıkla, kaydet" seviyesindeki kopyalamayı ve genel amaçlı toplu indirme
// eklentilerini büyük ölçüde etkisiz kılar. /api/img proxy'si + kısa ömürlü
// imzalı token (bkz. lib/imageProxyToken.js) ile birlikte, art arda scraping
// yapmayı da (her istek için geçerli bir chapter-API çağrısı + taze token
// gerektirdiğinden) belirgin şekilde zorlaştırır.
const OPTIMIZED_WIDTH = 1200;

function buildOptimizedSrc(src) {
    // Sadece kendi originimizden gelen (proxy'lenmiş) veya yerel /uploads
    // görsellerinde next/image optimizer endpoint'ini manuel çağırıyoruz —
    // format negotiation (AVIF/WebP) Accept header'a göre otomatik çalışır.
    if (!src || !src.startsWith('/')) return src;
    return `/_next/image?url=${encodeURIComponent(src)}&w=${OPTIMIZED_WIDTH}&q=80`;
}

// Token expire olduğunda sayfaları yenilemek için ReaderContent'ten set edilir.
let _refreshPagesCallback = null;

function ReaderPageImage({ page, retryToken, priority, className, style, onLoadDone, onErrorDone, seriesTitle, chapterNumber }) {
    const [activeSrc, setActiveSrc] = useState(null);
    const triedRefreshRef = useRef(false);

    const baseSrc = page.image_url || page.display_image;
    const rawSrc = retryToken ? `${baseSrc}?retry=${retryToken}` : baseSrc;
    const hasDims = Number(page.width) > 0 && Number(page.height) > 0;
    const canOptimize = isOptimizableImageSrc(baseSrc);
    const computedSrc = hasDims && canOptimize ? buildOptimizedSrc(rawSrc) : rawSrc;
    const loadSrc = activeSrc || computedSrc;
    // Google Görseller SEO: jenerik "Sayfa 3" yerine seri/bölüm bağlamı içeren
    // alt text — görsel arama sonuçlarında bu sayfaların çıkma ihtimalini artırır.
    const alt = seriesTitle
        ? `${seriesTitle}${chapterNumber ? ` Bölüm ${chapterNumber}` : ''} — Sayfa ${page.page_number}`
        : `Sayfa ${page.page_number}`;

    // baseSrc değişince (yeni token gelince) override'ı temizle
    useEffect(() => {
        setActiveSrc(null);
        triedRefreshRef.current = false;
    }, [baseSrc]);

    return (
        <img
            src={loadSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={className}
            style={{
                width: '100%',
                display: 'block',
                aspectRatio: hasDims ? String(page.width / page.height) : undefined,
                background: 'rgba(255,255,255,0.03)',
                ...style,
            }}
            onLoad={onLoadDone}
            onError={async (e) => {
                const img = e.currentTarget;

                // 1) Optimize src başarısız → ham proxy src dene
                if (img.src !== rawSrc && rawSrc !== loadSrc) {
                    img.src = rawSrc;
                    return;
                }

                // 2) Token expire olmuş olabilir (/api/img 403) → chapter'ı
                //    yeniden fetch edip taze token'lı URL'leri al, bir kez dene.
                if (!triedRefreshRef.current && _refreshPagesCallback) {
                    triedRefreshRef.current = true;
                    try {
                        const freshUrl = await _refreshPagesCallback(page.page_number);
                        if (freshUrl && freshUrl !== baseSrc) {
                            setActiveSrc(freshUrl);
                            return;
                        }
                    } catch { /* yenileme başarısız, aşağıya düş */ }
                }

                // 3) Her şey başarısız → hata göster
                onErrorDone?.();
            }}
        />
    );
}

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
        `chapter ${cleanNum}`, `ch. ${cleanNum}`, `ch.${cleanNum}`,
        `bölüm ${cleanNum}`, `böl. ${cleanNum}`, `böl.${cleanNum}`,
        `${cleanNum}. bölüm`, `bölüm: ${cleanNum}`, cleanNum
    ];
    return defaults.includes(normalized);
}

export function ReaderContent({ chapterId: propChapterId, initialData } = {}) {
    const params = useParams();
    const chapterId = propChapterId || params.chapterId;
    const router = useRouter();
    
    // Core Data
    // SSR'dan initialData geldiyse (canonical /seri/.../bolum/... rotası),
    // ilk render'da doğrudan onunla başla — aksi halde bir an için boş/loading
    // gösterip hemen ardından aynı veriyi state'e yazmış oluruz (gereksiz
    // spinner flaşı).
    const [data, setData] = useState(initialData || null);
    const [allChapters, setAllChapters] = useState([]);
    const [loading, setLoading] = useState(!initialData);
    const [failedPages, setFailedPages] = useState({});
    const [appSettings, setAppSettings] = useState({});

    // Webtoon modunda sayfaları hep birden değil, sırayla (kontrollü eşzamanlılıkla) yüklemek için.
    // İlk WEBTOON_INITIAL_LOAD sayfa hemen açılır, kalanlar bir öncekinin yüklenmesini (veya hata vermesini)
    // bekleyerek sırayla açılır. Böylece tarayıcı onlarca resmi aynı anda indirmeye çalışıp
    // bant genişliğini bölmek yerine, sayfalar art arda ve daha hızlı görünür hale gelir.
    const WEBTOON_INITIAL_LOAD = 3;
    const [webtoonUnlockedCount, setWebtoonUnlockedCount] = useState(WEBTOON_INITIAL_LOAD);
    const unlockNextWebtoonPage = useCallback((pagesLength) => {
        setWebtoonUnlockedCount(prev => Math.min(prev + 1, pagesLength));
    }, []);

    // Yukarı çık butonu
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Auth & Gamification
    const { user, authFetch, refreshUser } = useAuth();
    const [readTriggered, setReadTriggered] = useState(false);
    
    // Reader Settings
    const [readingMode, setReadingMode] = useState('webtoon'); // 'webtoon' or 'manga'
    const [mangaDirection, setMangaDirection] = useState('rtl'); // 'rtl' (Right-to-Left) or 'ltr'
    const [seamlessMode, setSeamlessMode] = useState(true);
    const [theaterMode, setTheaterMode] = useState(false);
    const [tapToScroll, setTapToScroll] = useState(false); // Dokunarak Kaydır
    const [fontSize, setFontSize] = useState(100);
    const [brightness, setBrightness] = useState(100);
    
    // Novel Mode State
    const [novelTheme, setNovelTheme] = useState('dark'); // 'dark', 'light', 'sepia'
    const [novelFontFamily, setNovelFontFamily] = useState('sans-serif'); // 'sans-serif', 'serif'
    const [novelFontSize, setNovelFontSize] = useState(18); // px
    const [novelLineHeight, setNovelLineHeight] = useState(1.8);
    const [novelTextAlign, setNovelTextAlign] = useState('left'); // 'left', 'justify'
    
    // TTS State
    const [ttsPlaying, setTtsPlaying] = useState(false);
    const [ttsPaused, setTtsPaused] = useState(false);
    const [ttsRate, setTtsRate] = useState(1.0);

    // Manga Mode State
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const mangaNavCooldownRef = useRef(false); // rapid-tap debounce
    
    // HUD State
    const [hudVisible, setHudVisible] = useState(true);
    const [activePanel, setActivePanel] = useState(null); // 'settings', 'chapters', null
    const [readingProgress, setReadingProgress] = useState(0);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Bug Report Modal State
    const [showBugModal, setShowBugModal] = useState(false);
    const [bugDescription, setBugDescription] = useState('');
    const [bugSubmitting, setBugSubmitting] = useState(false);
    const [bugSuccess, setBugSuccess] = useState(false);
    const [bugError, setBugError] = useState('');

    // Scroll restore prompt ("Kaldığınız yere götürelim mi?")
    const [scrollRestorePos, setScrollRestorePos] = useState(null); // saved Y position
    const [showScrollPrompt, setShowScrollPrompt] = useState(false);
    
    const lastScrollY = useRef(0);
    // Track live scroll Y in a ref so unmount cleanup can save it synchronously
    const currentScrollYRef = useRef(0);
    const hudTimerRef = useRef(null);
    const isMangaMode = readingMode === 'manga' && data?.series?.type !== 'novel';
    const isNovelMode = data?.series?.type === 'novel';

    // Adult content gate
    const isAdult = !!data?.series?.is_adult;
    const [ageVerified, setAgeVerified] = useState(false);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [ageDeclined, setAgeDeclined] = useState(false);

    useEffect(() => {
        if (!data || !data.series) return;
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
    }, [isAdult, user, data]);

    function handleAgeAccept() {
        try { localStorage.setItem('adult_age_verified', '1'); } catch {}
        setAgeVerified(true);
        setShowAgeGate(false);
    }

    function handleAgeDecline() {
        setAgeDeclined(true);
        setShowAgeGate(false);
    }

    // 1. INIT SETTINGS
    useEffect(() => {
        const _mode = localStorage.getItem('yt_reading_mode') || 'webtoon';
        const _dir = localStorage.getItem('yt_manga_dir') || 'rtl';
        const _theater = localStorage.getItem('yt_theater_mode') === 'true';
        // Varsayılan: boşluksuz (seamless) mod AÇIK. Kullanıcı daha önce
        // elle kapattıysa (localStorage'da 'false' olarak kayıtlıysa) o tercih korunur.
        const _seamlessRaw = localStorage.getItem('yt_seamless_mode');
        const _seamless = _seamlessRaw === null ? true : _seamlessRaw === 'true';
        const _tapScroll = localStorage.getItem('yt_tap_to_scroll') === 'true';
        const _fs = localStorage.getItem('yt_font_size');
        const _br = localStorage.getItem('yt_brightness');

        setReadingMode(_mode);
        setMangaDirection(_dir);
        setTheaterMode(_theater);
        setSeamlessMode(_seamless);
        setTapToScroll(_tapScroll);
        if (_fs) setFontSize(Number(_fs));
        if (_br) setBrightness(Number(_br));

        const _nTheme = localStorage.getItem('yt_novel_theme') || 'dark';
        const _nFont = localStorage.getItem('yt_novel_font') || 'sans-serif';
        const _nFs = localStorage.getItem('yt_novel_fontsize');
        const _nLh = localStorage.getItem('yt_novel_lineheight');
        const _nAlign = localStorage.getItem('yt_novel_textalign') || 'left';
        const _ttsRate = localStorage.getItem('yt_tts_rate');

        setNovelTheme(_nTheme);
        setNovelFontFamily(_nFont);
        if (_nFs) setNovelFontSize(Number(_nFs));
        if (_nLh) setNovelLineHeight(Number(_nLh));
        setNovelTextAlign(_nAlign);
        if (_ttsRate) setTtsRate(Number(_ttsRate));

        fetch('/api/settings').then(r => r.json()).then(d => setAppSettings(d.settings || {})).catch(() => {});
        setMounted(true);
    }, []);

    // 2. FETCH DATA
    // ÖNEMLİ: chapterId hızlı değişirse (kullanıcı bölümler arasında hızlı
    // geçiş yaparsa) birden fazla fetch aynı anda uçabilir. Eskisini iptal
    // etmezsek ve geç dönen cevap eski bölüme aitse, state'e yazılıp yanlış
    // bölümün sayfalarının ekranda görünmesine (hatta güncel URL'nin
    // bölümüyle karışmasına) yol açar. AbortController + "bu hâlâ güncel
    // istek mi" kontrolü ile bunu engelliyoruz.
    // Bölüm verisini state'e yazan + yan etkileri (son okunan bölüm, scroll
    // pozisyonu geri yükleme) uygulayan ortak fonksiyon. Hem client fetch'i
    // (fetchChapter) hem de SSR'dan gelen initialData (bkz. aşağıdaki effect)
    // aynı yolu kullanır.
    const applyChapterResult = useCallback((result, requestedChapterId) => {
        setData(result);
        setCurrentPageIndex(0); // reset manga page on load

        // Save last read chapter for this series to localStorage
        if (result?.series?.id && result?.chapter) {
            try {
                localStorage.setItem(
                    `yt_series_lastchapter_${result.series.id}`,
                    JSON.stringify({ id: result.chapter.id, chapter_number: result.chapter.chapter_number })
                );
            } catch { /* ignore */ }
        }

        // Always start from the top when opening a chapter
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Scroll restore prompt for webtoon & novel modes (not manga)
        const isNovel = result?.series?.type === 'novel';
        const scrollKey = isNovel
            ? `yt_novel_scroll_${requestedChapterId}`
            : `yt_scroll_${requestedChapterId}`;
        try {
            const savedScroll = localStorage.getItem(scrollKey);
            if (savedScroll && Number(savedScroll) > 200) {
                setScrollRestorePos(Number(savedScroll));
                // Show prompt after content renders (top scroll already done)
                setTimeout(() => setShowScrollPrompt(true), 900);
            }
        } catch { /* ignore */ }
    }, []);

    const fetchChapter = useCallback(async (requestedChapterId, signal) => {
        setLoading(true);
        setShowScrollPrompt(false);
        setScrollRestorePos(null);
        try {
            const res = await fetch(`/api/chapters/${requestedChapterId}`, { signal });
            const result = await res.json();

            // Bu cevap beklerken chapterId değiştiyse (yeni bir istek zaten
            // başladıysa) bu artık bayat bir cevaptır — state'e yazma.
            if (signal.aborted) return;

            applyChapterResult(result, requestedChapterId);
        } catch (err) {
            if (err?.name === 'AbortError') return; // iptal edilen eski istek — sessizce yok say
            console.error(err);
        }
        finally { if (!signal.aborted) setLoading(false); }
    }, [applyChapterResult]);

    useEffect(() => {
        setReadTriggered(false); setFailedPages({}); setWebtoonUnlockedCount(WEBTOON_INITIAL_LOAD);

        // SSR (canonical /seri/[id]/bolum/[chapterNumber] rotası) bu bölümün
        // verisini initialData olarak zaten getirdiyse, AYNI veriyi tekrar
        // /api/chapters/{id} çağırarak çekmiyoruz — gereksiz client-side fetch
        // + DB yükü olurdu (bkz. DEVAM-NOTU.md). Server component her
        // navigasyonda initialData'yı yeniden hesaplayıp gönderdiği için bu,
        // sadece ilk yüklemede değil bölümler arası geçişte de geçerli.
        if (initialData && initialData.chapter?.id === chapterId) {
            setShowScrollPrompt(false);
            setScrollRestorePos(null);
            applyChapterResult(initialData, chapterId);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        fetchChapter(chapterId, controller.signal);
        return () => controller.abort();
    }, [chapterId, initialData, fetchChapter, applyChapterResult]);

    // Token expire olduğunda ReaderPageImage bileşeninin çağırabileceği callback.
    // Mevcut chapter'ı yeniden fetch eder ve ilgili sayfanın taze display_image URL'sini döner.
    useEffect(() => {
        _refreshPagesCallback = async (pageNumber) => {
            const res = await fetch(`/api/chapters/${chapterId}`);
            if (!res.ok) return null;
            const result = await res.json();
            if (result?.pages) {
                // State'i de güncelle ki diğer sayfalar da taze URL'leri kullansın
                setData(prev => prev ? { ...prev, pages: result.pages } : prev);
                const p = result.pages.find(pg => pg.page_number === pageNumber);
                return p?.display_image || p?.image_url || null;
            }
            return null;
        };
        return () => { _refreshPagesCallback = null; };
    }, [chapterId]);
    
    // Reset TTS on unmount or chapter change
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, [chapterId]);

    useEffect(() => {
        if (!data?.series?.id) return;
        fetch(`/api/series/${data.series.id}`).then(r => r.json()).then(d => { if (d.chapters) setAllChapters(d.chapters); }).catch(() => {});
    }, [data?.series?.id]);

    useEffect(() => {
        if (!data?.series || !data?.chapter) return;
        const slug = data.series.slug || data.series.id;
        const chNum = data.chapter.chapter_number;
        window.history.replaceState(null, '', `/seri/${slug}/bolum/${chNum}`);
    }, [data]);

    // 3. SCROLL PROGRESS (WEBTOON & NOVEL)
    useEffect(() => {
        if (isMangaMode) return;
        let scrollTimeout;
        function handleScroll() {
            const currentY = window.scrollY;
            currentScrollYRef.current = currentY; // sync ref for unmount save

            // Hide HUD on scroll down, show on scroll up
            if (currentY > lastScrollY.current + 15 && currentY > 100) {
                setHudVisible(false);
                setActivePanel(null);
            } else if (currentY < lastScrollY.current - 15 || currentY < 100) {
                setHudVisible(true);
            }
            lastScrollY.current = currentY;

            const totalHeight = document.body.scrollHeight - window.innerHeight;
            const progress = totalHeight > 0 ? (currentY / totalHeight) * 100 : 0;
            setReadingProgress(Math.min(100, Math.max(0, progress)));

            // Yukarı çık butonunu 300px'den sonra göster
            setShowScrollTop(currentY > 300);

            // Save scroll position (debounced)
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const key = isNovelMode
                    ? `yt_novel_scroll_${chapterId}`
                    : `yt_scroll_${chapterId}`;
                try { localStorage.setItem(key, currentY); } catch {}
            }, 400);
        }
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
            // Save synchronously on unmount so navigating away doesn't lose position
            const y = currentScrollYRef.current;
            if (y > 100) {
                const key = isNovelMode
                    ? `yt_novel_scroll_${chapterId}`
                    : `yt_scroll_${chapterId}`;
                try { localStorage.setItem(key, y); } catch {}
            }
        };
    }, [isMangaMode, isNovelMode, chapterId]);

    // MANGA PROGRESS
    useEffect(() => {
        if (!isMangaMode || !data?.pages) return;
        const total = data.pages.length;
        if (total === 0) return;
        setReadingProgress(Math.min(100, ((currentPageIndex + 1) / total) * 100));
    }, [isMangaMode, currentPageIndex, data]);

    // MANGA SAYFA ÖN-YÜKLEME: bir sonraki 2 sayfayı arka planda indirmeye başlar,
    // böylece kullanıcı "ileri" tıkladığında görsel zaten tarayıcı cache'inde olur
    // ve sayfa çevirme anında (bekleme olmadan) gerçekleşir.
    useEffect(() => {
        if (!isMangaMode || !data?.pages) return;
        const upcoming = data.pages.slice(currentPageIndex + 1, currentPageIndex + 3);
        const preloaded = upcoming.map((p) => {
            const url = p.image_url || p.display_image;
            if (!url) return null;
            const img = new window.Image();
            img.src = url;
            return img;
        });
        return () => { preloaded.length = 0; }; // referansları bırak, indirme devam eder (tarayıcı cache'ler)
    }, [isMangaMode, currentPageIndex, data]);

    // 4. NAVIGATION LOGIC
    function buildReadUrl(chapter) { return chapter ? `/read/${chapter.id}` : null; }
    
    const navigateTo = useCallback((chapter) => {
        if (!chapter) return;
        window.scrollTo({ top: 0, behavior: 'instant' });
        setHudVisible(true);
        setActivePanel(null);
        router.push(buildReadUrl(chapter));
    }, [router]);

    const goNextPage = useCallback(() => {
        if (!data?.pages) return;
        if (mangaNavCooldownRef.current) return; // debounce rapid taps
        mangaNavCooldownRef.current = true;
        setTimeout(() => { mangaNavCooldownRef.current = false; }, 280);
        if (currentPageIndex < data.pages.length) {
            setCurrentPageIndex(prev => prev + 1);
        }
    }, [currentPageIndex, data]);

    const goPrevPage = useCallback(() => {
        if (mangaNavCooldownRef.current) return; // debounce rapid taps
        mangaNavCooldownRef.current = true;
        setTimeout(() => { mangaNavCooldownRef.current = false; }, 280);
        if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
        } else if (data?.prevChapter) {
            navigateTo(data.prevChapter);
        }
    }, [currentPageIndex, data, navigateTo]);

    // 5. KEYBOARD SHORTCUTS
    useEffect(() => {
        if (!data) return;
        function handleKeyDown(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (isMangaMode) {
                if (e.key === 'ArrowRight') {
                    mangaDirection === 'rtl' ? goPrevPage() : goNextPage();
                } else if (e.key === 'ArrowLeft') {
                    mangaDirection === 'rtl' ? goNextPage() : goPrevPage();
                }
            } else {
                if (e.key === 'ArrowLeft' && data.prevChapter) navigateTo(data.prevChapter);
                else if (e.key === 'ArrowRight' && data.nextChapter) navigateTo(data.nextChapter);
                else if (e.key === 'w' || e.key === 'W') {
                    window.scrollBy({ top: -window.innerHeight * 0.7, behavior: 'smooth' });
                } else if (e.key === 's' || e.key === 'S' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data, isMangaMode, mangaDirection, goNextPage, goPrevPage, navigateTo]);

    // 6. INTERACTIONS (TAPS & CLICKS)
    function handleReaderTap(e) {
        if (e.target.closest('button, a, input, select, textarea, .rh-topbar, .rh-bottombar, .rh-panel, #comments-section')) return;

        // Dokunarak Kaydır (Tap to Scroll): webtoon modunda ekranın üst/alt
        // bölgelerine dokunmak sayfayı kaydırır, orta bölge HUD'u aç/kapat yapar.
        if (tapToScroll && !isMangaMode) {
            const viewportH = window.innerHeight;
            const tapY = e.clientY;
            const topZoneEnd = viewportH * 0.3;
            const bottomZoneStart = viewportH * 0.7;

            if (tapY < topZoneEnd) {
                window.scrollBy({ top: -viewportH * 0.75, behavior: 'smooth' });
                return;
            }
            if (tapY > bottomZoneStart) {
                window.scrollBy({ top: viewportH * 0.75, behavior: 'smooth' });
                return;
            }
            // Orta bölge: HUD aç/kapat davranışına düşer (aşağıda devam eder)
        }

        setHudVisible(v => !v);
        if (activePanel) setActivePanel(null);
    }

    function togglePanel(panelName) {
        if (activePanel === panelName) setActivePanel(null);
        else setActivePanel(panelName);
    }

    // Bug Report submit handler
    async function handleBugSubmit(e) {
        e.preventDefault();
        if (!bugDescription.trim()) return;
        setBugSubmitting(true);
        setBugError('');
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapterId: chapter?.id || null,
                    seriesId: series?.id || null,
                    description: bugDescription.trim(),
                    userId: user?.id || null,
                }),
            });
            const result = await res.json();
            if (result.success) {
                setBugSuccess(true);
                setBugDescription('');
            } else {
                setBugError(result.error || 'Gönderim başarısız');
            }
        } catch {
            setBugError('Bağlantı hatası, lütfen tekrar deneyin');
        } finally {
            setBugSubmitting(false);
        }
    }

    function openBugModal() {
        setBugSuccess(false);
        setBugError('');
        setBugDescription('');
        setShowBugModal(true);
    }

    function closeBugModal() {
        setShowBugModal(false);
        setBugSuccess(false);
        setBugError('');
        setBugDescription('');
    }

    // 7. SETTINGS CHANGERS
    const updateSetting = (key, value, setter) => {
        setter(value);
        localStorage.setItem(`yt_${key}`, String(value));
    };

    // 8. POINTS GAMIFICATION
    useEffect(() => {
        if (!user || !authFetch || readTriggered) return;
        if (readingProgress > 70) {
            authFetch('/api/users/read-chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterId }) })
              .then(() => { if (refreshUser) refreshUser(); })
              .catch(() => {});
            setReadTriggered(true);
        }
    }, [readingProgress, user, authFetch, chapterId, readTriggered, refreshUser]);

    // 9. SITE-STAY HEARTBEAT (her 1 dakikada bir site kalma puan takibi)
    useEffect(() => {
        if (!user || !authFetch) return;
        const sendHeartbeat = () => {
            authFetch('/api/users/site-stay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: 1 })
            }).catch(() => {});
        };
        const interval = setInterval(sendHeartbeat, 60 * 1000);
        return () => clearInterval(interval);
    }, [user, authFetch]);

    // Selection Tooltip
    const [tooltipStyle, setTooltipStyle] = useState({ display: 'none', top: 0, left: 0, text: '' });
    
    useEffect(() => {
        if (!isNovelMode) return;
        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            if (text && text.length > 0 && text.length < 150) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setTooltipStyle({
                    display: 'flex',
                    top: rect.top - 40 + window.scrollY,
                    left: rect.left + rect.width / 2,
                    text
                });
            } else {
                setTooltipStyle({ display: 'none' });
            }
        };
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, [isNovelMode]);


    if (loading) return <div className="page-loading"><div className="spinner" /></div>;
    if (!data || !data.chapter) {
        return (
            <div className="page-container page-section" style={{ textAlign: 'center' }}>
                <h2>{data?.error || appSettings.lang_chapter_not_found || 'Bölüm bulunamadı'}</h2>
                <Link href="/seri" className="btn btn-ghost" style={{ marginTop: 16 }}>{appSettings.lang_back_to_browse || 'Kataloğa Dön'}</Link>
            </div>
        );
    }

    const { chapter, series, pages, prevChapter, nextChapter } = data;
    const seriesSlug = series.slug || series.id;
    const showEndCard = isMangaMode && currentPageIndex >= (pages?.length || 0);

    // Dış bağlantılı bölüm: sayfa içeriği yok, kaynağa yönlendirme uyarısı göster
    if (chapter.external_url) {
        const redirectMessage = chapter.external_note
            || appSettings.external_redirect_message
            || 'Bu bölüm başka bir ekip tarafından hazırlanmıştır. Onları desteklemek için ilgili siteye yönlendiriliyorsunuz. Eğer ekibin sitesi kapandıysa, en az reklam barındıran alternatif bir kaynağa yönlendiriliyorsunuz.';
        const redirectButtonText = appSettings.external_redirect_button_text || 'Siteye Git';
        return (
            <div className="page-container fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 460, background: 'var(--bg-secondary)', padding: '40px 30px', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', border: '2px solid rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                            </svg>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>Bu Bölüm Başka Bir Kaynakta</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 28, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{redirectMessage}</p>
                    <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                        <a
                            href={chapter.external_url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            style={{ padding: '12px', borderRadius: 8, background: '#38bdf8', color: '#0c1220', fontWeight: 800, textDecoration: 'none', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            {redirectButtonText}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                        </a>
                        <Link href={`/seri/${seriesSlug}`} style={{ padding: '12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>Geri Dön</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Adult content check
    if (isAdult && !user) {
        return (
            <div className="page-container fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 440 }}>
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>Yetişkin İçeriği</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 24, lineHeight: 1.6 }}>Bu bölüm yetişkin içeriği barındırmaktadır. Görüntülemek için lütfen giriş yapın veya kayıt olun.</p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/login" style={{ padding: '10px 28px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>Giriş Yap</a>
                        <Link href={`/seri/${seriesSlug}`} style={{ padding: '10px 28px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>Geri Dön</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isAdult && showAgeGate) {
        return (
            <div className="page-container fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 440, background: 'var(--bg-secondary)', padding: '40px 30px', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>18+</span>
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>Yaş Doğrulaması</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 30, lineHeight: 1.6 }}>Bu bölüm yetişkinler içindir. Devam etmek için 18 yaşında veya daha büyük olduğunuzu onaylamalısınız.</p>
                    <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                        <button onClick={handleAgeAccept} style={{ padding: '12px', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>Evet, 18 yaşından büyüğüm</button>
                        <Link href={`/seri/${seriesSlug}`} style={{ padding: '12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>Hayır, geri dön</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isAdult && ageDeclined) {
        return (
            <div className="page-container fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 16 }}>Erişim Reddedildi</h2>
                    <Link href={`/seri/${seriesSlug}`} className="btn btn-primary">Seriye Dön</Link>
                </div>
            </div>
        );
    }

    // TTS functions
    const toggleTts = () => {
        if (!window.speechSynthesis) return;
        
        if (ttsPlaying && !ttsPaused) {
            window.speechSynthesis.pause();
            setTtsPaused(true);
        } else if (ttsPlaying && ttsPaused) {
            window.speechSynthesis.resume();
            setTtsPaused(false);
        } else {
            const textToSpeak = chapter?.content?.replace(/<[^>]+>/g, '') || '';
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.rate = ttsRate;
            utterance.lang = 'tr-TR';
            utterance.onend = () => { setTtsPlaying(false); setTtsPaused(false); };
            
            window.speechSynthesis.speak(utterance);
            setTtsPlaying(true);
            setTtsPaused(false);
        }
    };
    
    const stopTts = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        setTtsPlaying(false);
        setTtsPaused(false);
    };

    const getRootBackground = () => {
        if (isNovelMode) {
            if (novelTheme === 'light') return '#f5f5f5';
            if (novelTheme === 'sepia') return '#f4ecd8';
            return '#121212';
        }
        return theaterMode ? '#000' : 'var(--bg-primary)';
    };

    const paragraphs = isNovelMode ? (chapter?.content || '').split('\n').filter(p => p.trim() !== '') : [];

    return (
        <div className={theaterMode && !isNovelMode ? 'theater-mode' : ''} style={{ background: getRootBackground(), minHeight: '100vh', transition: 'background-color 0.3s ease' }}>

            {/* ── Yukarı Çık Butonu ── */}
            {mounted && showScrollTop && createPortal(
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="Yukarı Çık"
                    aria-label="Yukarı çık"
                    style={{
                        position: 'fixed',
                        bottom: '80px', /* HUD bottom bar üzerinde */
                        right: '16px',
                        zIndex: 9000,
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(var(--accent-rgb,94,114,228),0.85)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(var(--accent-rgb,94,114,228),0.5)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        animation: 'scrollBtnFadeIn 0.3s ease both',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.08)'; e.currentTarget.style.background = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'rgba(var(--accent-rgb,94,114,228),0.85)'; }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6"/>
                    </svg>
                </button>,
                document.body
            )}

            {/* ── Scroll Restore Prompt ── */}
            {mounted && showScrollPrompt && !isMangaMode && createPortal(
                <div className="scroll-restore-prompt">
                    {/* Icon */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    {/* Text */}
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.2 }}>
                        Kaldığın yerden devam mı?
                    </span>
                    {/* Devam et button */}
                    <button
                        onClick={() => {
                            setShowScrollPrompt(false);
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    window.scrollTo({ top: scrollRestorePos, behavior: 'smooth' });
                                });
                            });
                        }}
                        style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'rgba(52,211,153,0.18)',
                            border: '1px solid rgba(52,211,153,0.35)',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        Evet
                    </button>
                    {/* Close / no button */}
                    <button
                        onClick={() => setShowScrollPrompt(false)}
                        aria-label="Kapat"
                        style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        Hayır
                    </button>
                </div>,
                document.body
            )}

            {/* Selection Tooltip */}
            {tooltipStyle.display !== 'none' && (
                <div style={{
                    position: 'absolute',
                    top: tooltipStyle.top,
                    left: tooltipStyle.left,
                    transform: 'translateX(-50%)',
                    background: '#1a1a1a',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    fontSize: '0.85rem'
                }}>
                    <a href={`https://translate.google.com/?sl=auto&tl=tr&text=${encodeURIComponent(tooltipStyle.text)}&op=translate`} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>Çevir</a>
                    <span style={{ width: 1, background: '#444' }} />
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(tooltipStyle.text)}`} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>Ara</a>
                </div>
            )}

            {/* ── HUD (Heads-Up Display) ── */}
            {mounted && createPortal(
                <div className={`reader-hud ${hudVisible ? 'visible' : 'hidden'}`}>
                    
                    {/* Top Bar */}
                    <div className="rh-topbar">
                        <div className="rh-title-group">
                            <Link href={`/seri/${seriesSlug}`} className="rh-back-btn" title="Seriye Dön">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                            </Link>
                            <div className="rh-title-text">
                                <h1 className="rh-series-title" title={series.title}>{series.title}</h1>
                                <h2 className="rh-chapter-title">
                                    {appSettings.lang_chapter_prefix || 'Bölüm'} {chapter.chapter_number}
                                    {chapter.title && !isDefaultTitle(chapter.title, chapter.chapter_number) ? ` — ${chapter.title}` : ''}
                                </h2>
                            </div>
                        </div>
                        <div className="rh-nav-group">
                            <button className="rh-btn" onClick={openBugModal} title="Hata Bildir">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <span>Hata Bildir</span>
                            </button>
                            <button className={`rh-btn ${activePanel === 'settings' ? 'active' : ''}`} onClick={() => togglePanel('settings')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                                <span>Ayarlar</span>
                            </button>
                        </div>
                    </div>

                    {/* Panels */}
                    <div className={`rh-panel ${activePanel === 'settings' ? 'open' : ''}`}>
                        <div className="rh-panel-title">Okuyucu Ayarları</div>

                        {isNovelMode ? (
                            <>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Tema</span>
                                    <div className="rh-mode-toggle">
                                        <button className={`rh-mode-btn ${novelTheme === 'dark' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'dark', setNovelTheme)}>Koyu</button>
                                        <button className={`rh-mode-btn ${novelTheme === 'light' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'light', setNovelTheme)}>Açık</button>
                                        <button className={`rh-mode-btn ${novelTheme === 'sepia' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'sepia', setNovelTheme)}>Sepya</button>
                                    </div>
                                </div>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Yazı Tipi</span>
                                    <div className="rh-mode-toggle">
                                        <button className={`rh-mode-btn ${novelFontFamily === 'sans-serif' ? 'active' : ''}`} onClick={() => updateSetting('novel_font', 'sans-serif', setNovelFontFamily)}>Sans-Serif</button>
                                        <button className={`rh-mode-btn ${novelFontFamily === 'serif' ? 'active' : ''}`} onClick={() => updateSetting('novel_font', 'serif', setNovelFontFamily)}>Serif</button>
                                    </div>
                                </div>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Metin Boyutu</span>
                                    <div className="rh-setting-control">
                                        <input type="range" min="14" max="36" step="1" value={novelFontSize} onChange={e => updateSetting('novel_fontsize', Number(e.target.value), setNovelFontSize)} className="rh-slider" />
                                        <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{novelFontSize}px</span>
                                    </div>
                                </div>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Hizalama</span>
                                    <div className="rh-mode-toggle">
                                        <button className={`rh-mode-btn ${novelTextAlign === 'left' ? 'active' : ''}`} onClick={() => updateSetting('novel_textalign', 'left', setNovelTextAlign)}>Sola</button>
                                        <button className={`rh-mode-btn ${novelTextAlign === 'justify' ? 'active' : ''}`} onClick={() => updateSetting('novel_textalign', 'justify', setNovelTextAlign)}>İki Yana</button>
                                    </div>
                                </div>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Satır Aralığı</span>
                                    <div className="rh-mode-toggle">
                                        <button className={`rh-mode-btn ${novelLineHeight === 1.5 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 1.5, setNovelLineHeight)}>Dar</button>
                                        <button className={`rh-mode-btn ${novelLineHeight === 1.8 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 1.8, setNovelLineHeight)}>Normal</button>
                                        <button className={`rh-mode-btn ${novelLineHeight === 2.2 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 2.2, setNovelLineHeight)}>Geniş</button>
                                    </div>
                                </div>
                                <div className="rh-setting-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                                    <span className="rh-setting-label">Sesli Okuma (TTS)</span>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <button className="btn btn-sm btn-primary" onClick={toggleTts}>
                                            {ttsPlaying && !ttsPaused ? 'Duraklat' : 'Oynat'}
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={stopTts} disabled={!ttsPlaying}>Durdur</button>
                                    </div>
                                </div>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Okuma Hızı</span>
                                    <div className="rh-setting-control">
                                        <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={e => updateSetting('tts_rate', Number(e.target.value), setTtsRate)} className="rh-slider" />
                                        <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{ttsRate}x</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="rh-setting-row">
                                    <span className="rh-setting-label">Okuma Modu</span>
                                    <div className="rh-mode-toggle">
                                        <button className={`rh-mode-btn ${!isMangaMode ? 'active' : ''}`} onClick={() => updateSetting('reading_mode', 'webtoon', setReadingMode)}>Webtoon</button>
                                        <button className={`rh-mode-btn ${isMangaMode ? 'active' : ''}`} onClick={() => updateSetting('reading_mode', 'manga', setReadingMode)}>Manga</button>
                                    </div>
                                </div>

                        {isMangaMode && (
                            <div className="rh-setting-row">
                                <span className="rh-setting-label">Yön</span>
                                <div className="rh-mode-toggle">
                                    <button className={`rh-mode-btn ${mangaDirection === 'rtl' ? 'active' : ''}`} onClick={() => updateSetting('manga_dir', 'rtl', setMangaDirection)}>Sağdan Sola</button>
                                    <button className={`rh-mode-btn ${mangaDirection === 'ltr' ? 'active' : ''}`} onClick={() => updateSetting('manga_dir', 'ltr', setMangaDirection)}>Soldan Sağa</button>
                                </div>
                            </div>
                        )}

                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Resim Genişliği</span>
                            <div className="rh-setting-control">
                                <input type="range" min="50" max="100" step="5" value={fontSize} onChange={e => updateSetting('font_size', Number(e.target.value), setFontSize)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{fontSize}%</span>
                            </div>
                        </div>

                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Parlaklık</span>
                            <div className="rh-setting-control">
                                <input type="range" min="30" max="100" step="5" value={brightness} onChange={e => updateSetting('brightness', Number(e.target.value), setBrightness)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{brightness}%</span>
                            </div>
                        </div>

                                {!isMangaMode && (
                                    <div className="rh-setting-row">
                                        <span className="rh-setting-label">Boşluksuz Mod</span>
                                        <button className={`rsp-toggle ${seamlessMode ? 'on' : ''}`} onClick={() => updateSetting('seamless_mode', !seamlessMode, setSeamlessMode)}>
                                            <span className="rsp-toggle-knob" />
                                        </button>
                                    </div>
                                )}

                                {!isMangaMode && (
                                    <div className="rh-setting-row">
                                        <span className="rh-setting-label">Dokunarak Kaydır</span>
                                        <button className={`rsp-toggle ${tapToScroll ? 'on' : ''}`} onClick={() => updateSetting('tap_to_scroll', !tapToScroll, setTapToScroll)}>
                                            <span className="rsp-toggle-knob" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Sinema Modu (Koyu)</span>
                            <button className={`rsp-toggle ${theaterMode ? 'on' : ''}`} onClick={() => updateSetting('theater_mode', !theaterMode, setTheaterMode)}>
                                <span className="rsp-toggle-knob" />
                            </button>
                        </div>
                    </div>

                    <div className={`rh-panel ${activePanel === 'chapters' ? 'open' : ''}`}>
                        <div className="rh-panel-title">Bölüm Seçici</div>
                        <div className="rh-chapter-list">
                            {[...allChapters].sort((a,b) => b.chapter_number - a.chapter_number).map(ch => (
                                <button key={ch.id} className={`rh-chapter-item ${String(ch.id) === String(chapterId) ? 'current' : ''}`} onClick={() => navigateTo(ch)}>
                                    {appSettings.lang_chapter_prefix || 'Bölüm'} {ch.chapter_number}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div style={{ position: 'relative' }}>
                        <div className="hud-progress-container">
                            <div className="hud-progress-bar" style={{ width: `${readingProgress}%` }} />
                        </div>
                        <div className="rh-bottombar">
                            <button className="rh-btn" onClick={() => navigateTo(prevChapter)} disabled={!prevChapter} title="Önceki Bölüm">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                                <span>Önceki</span>
                            </button>
                            
                            <button className="rh-chapter-selector" onClick={() => togglePanel('chapters')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                Bölüm {chapter.chapter_number}
                                {isMangaMode && <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: 4 }}>({currentPageIndex + 1}/{pages.length})</span>}
                            </button>

                            <button className="rh-btn" onClick={() => navigateTo(nextChapter)} disabled={!nextChapter} title="Sonraki Bölüm">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                <span>Sonraki</span>
                            </button>
                        </div>
                    </div>

                </div>,
                document.body
            )}

            {/* ── Bug Report Modal ── */}
            {mounted && showBugModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeBugModal(); }}
                >
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 16,
                        padding: '28px 28px 24px',
                        width: '100%', maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Hata Bildir</h3>
                            </div>
                            <button onClick={closeBugModal} aria-label="Kapat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        {/* Chapter info */}
                        <div style={{ background: 'var(--bg-tertiary,rgba(255,255,255,0.05))', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{series?.title}</div>
                            <div>Bölüm {chapter?.chapter_number}{chapter?.title && !isDefaultTitle(chapter.title, chapter.chapter_number) ? ` — ${chapter.title}` : ''}</div>
                        </div>

                        {bugSuccess ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '1rem' }}>Teşekkürler!</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>Hata bildiriminiz alındı. İnceleyip en kısa sürede düzelteceğiz.</p>
                                <button onClick={closeBugModal} style={{ padding: '9px 24px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Kapat</button>
                            </div>
                        ) : (
                            <form onSubmit={handleBugSubmit}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    Hata Açıklaması <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={bugDescription}
                                    onChange={(e) => setBugDescription(e.target.value)}
                                    placeholder="Gördüğünüz hatayı kısaca açıklayın... (örn: 3. sayfadan sonra resimler yüklenmiyor)"
                                    rows={5}
                                    required
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: 'var(--bg-primary,#0d0d0d)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 8, color: 'var(--text-primary)',
                                        fontSize: '0.9rem', padding: '10px 12px',
                                        resize: 'vertical', outline: 'none',
                                        fontFamily: 'inherit', lineHeight: 1.5,
                                        minHeight: 100,
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                                />
                                {bugError && (
                                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.82rem' }}>
                                        {bugError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={closeBugModal} style={{ padding: '9px 20px', borderRadius: 8, background: 'var(--bg-tertiary,rgba(255,255,255,0.06))', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.88rem' }}>
                                        İptal
                                    </button>
                                    <button type="submit" disabled={bugSubmitting || !bugDescription.trim()} style={{ padding: '9px 22px', borderRadius: 8, background: bugSubmitting || !bugDescription.trim() ? 'rgba(239,68,68,0.4)' : '#ef4444', color: '#fff', fontWeight: 700, border: 'none', cursor: bugSubmitting || !bugDescription.trim() ? 'not-allowed' : 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
                                        {bugSubmitting ? (
                                            <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Gönderiliyor...</>
                                        ) : (
                                            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Gönder</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ── OKUYUCU MODLARI ── */}
            {isNovelMode ? (
                <div 
                    className={`novel-mode-container novel-theme-${novelTheme}`}
                    style={{ 
                        fontFamily: novelFontFamily === 'serif' ? 'Georgia, serif' : 'Inter, system-ui, sans-serif',
                        fontSize: `${novelFontSize}px`,
                        lineHeight: novelLineHeight,
                        textAlign: novelTextAlign,
                        filter: brightness < 100 ? `brightness(${brightness}%)` : undefined,
                        minHeight: '100vh',
                        paddingBottom: 100,
                    }}
                >
                    <div className="novel-content" onClick={handleReaderTap}>
                        {paragraphs.map((pText, i) => (
                            <div key={i} id={`p-${i}`} className="novel-paragraph" style={{ position: 'relative' }}>
                                {/* GÜVENLİK DÜZELTMESİ: chapter.content hiçbir temizlemeden basılıyordu —
                                    upload_chapters yetkisine sahip bir hesap (veya ele geçirilmiş hesap)
                                    <script>/onerror= gibi payload'lar gömerse her okuyucuda çalışırdı. */}
                                <div dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(pText) }} />
                                <button 
                                    className="inline-comment-btn" 
                                    title="Bu paragrafa yorum yap"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        window.dispatchEvent(new CustomEvent('inline-comment', { detail: { paragraphIndex: i } }));
                                        const sec = document.getElementById('comments-section');
                                        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 60, padding: '0 20px', maxWidth: 800, margin: '60px auto 0' }}>
                        <ReaderSupportCard appSettings={appSettings} />
                        <EndChapterCard series={series} seriesSlug={seriesSlug} nextChapter={nextChapter} navigateTo={navigateTo} appSettings={appSettings} />
                    </div>
                    <div id="comments-section" className="page-container" style={{ marginTop: 40, maxWidth: 800, margin: '40px auto 0', paddingBottom: 120 }}>
                        <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Yorumlar yükleniyor...</div>}>
                            <CommentSection chapterId={chapterId} seriesId={series.id} />
                        </Suspense>
                    </div>
                </div>
            ) : isMangaMode ? (
                <div className="manga-mode-container" style={{ filter: brightness < 100 ? `brightness(${brightness}%)` : undefined, position: 'relative' }}>
                    {showEndCard ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <EndChapterCard series={series} seriesSlug={seriesSlug} nextChapter={nextChapter} navigateTo={navigateTo} appSettings={appSettings} goPrevPage={goPrevPage} />
                        </div>
                    ) : (
                        <div className="manga-viewport" onClick={handleReaderTap}>
                            {/* Navigation Touch Zones
                                RTL manga: Story flows RIGHT→LEFT, so:
                                  - Clicking LEFT area = advance story (goNextPage)
                                  - Clicking RIGHT area = go back (goPrevPage)
                                LTR manga: Story flows LEFT→RIGHT, so:
                                  - Clicking LEFT area = go back (goPrevPage)
                                  - Clicking RIGHT area = advance story (goNextPage)
                            */}
                            <div className="manga-nav-area left" onClick={(e) => { e.stopPropagation(); mangaDirection === 'rtl' ? goNextPage() : goPrevPage(); }} />
                            <div className="manga-nav-area right" onClick={(e) => { e.stopPropagation(); mangaDirection === 'rtl' ? goPrevPage() : goNextPage(); }} />
                            <div className="manga-nav-area center" onClick={handleReaderTap} />
                            
                            {pages[currentPageIndex] && (
                                failedPages[pages[currentPageIndex].id] ? (
                                    <div className="reader-error-placeholder" style={{ margin: 'auto' }}>
                                        <svg className="reader-error-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        <span style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Resim Yüklenemedi</span>
                                        <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setFailedPages(prev => ({...prev, [pages[currentPageIndex].id]: false, [`${pages[currentPageIndex].id}_retry`]: Date.now()})); }}>Tekrar Dene</button>
                                    </div>
                                ) : (
                                    <ReaderPageImage
                                        page={pages[currentPageIndex]}
                                        retryToken={failedPages[`${pages[currentPageIndex].id}_retry`]}
                                        priority
                                        className="manga-page-img"
                                        style={{ width: 'auto', maxWidth: `${fontSize}%` }}
                                        onErrorDone={() => { setFailedPages(prev => ({...prev, [pages[currentPageIndex].id]: true})); }}
                                        seriesTitle={series?.title}
                                        chapterNumber={chapter?.chapter_number}
                                    />
                                )
                            )}
                        </div>
                    )}
                    {!showEndCard && (
                        <div id="comments-section" className="page-container" style={{ marginTop: 40, maxWidth: 800, margin: '40px auto 0', padding: '0 20px', paddingBottom: 120 }}>
                            <ReaderSupportCard appSettings={appSettings} />
                            <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Yorumlar yükleniyor...</div>}>
                                <CommentSection chapterId={chapterId} seriesId={series.id} />
                            </Suspense>
                        </div>
                    )}
                </div>
            ) : (

            /* ── WEBTOON MODE (DİKEY OKUMA) ── */
                <div 
                    className="reader-container" 
                    style={{ filter: brightness < 100 ? `brightness(${brightness}%)` : undefined, display: 'flex', flexDirection: 'column', gap: seamlessMode ? 0 : 4, paddingBottom: 100 }}
                    onClick={handleReaderTap}
                >
                    {pages.map((page, index) => (
                        <div key={page.id} style={{ maxWidth: `${fontSize}%`, margin: seamlessMode ? '0 auto' : '0 auto 4px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {failedPages[page.id] ? (
                                <div className="reader-error-placeholder" style={{ margin: seamlessMode ? 0 : undefined }}>
                                    <svg className="reader-error-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    <span style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Resim Yüklenemedi</span>
                                    <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setFailedPages(prev => ({...prev, [page.id]: false, [`${page.id}_retry`]: Date.now()})); }}>Tekrar Dene</button>
                                </div>
                            ) : index < webtoonUnlockedCount ? (
                                <ReaderPageImage
                                    page={page}
                                    retryToken={failedPages[`${page.id}_retry`]}
                                    priority={index < 3}
                                    className="webtoon-page-img"
                                    onLoadDone={() => unlockNextWebtoonPage(pages.length)}
                                    onErrorDone={() => { setFailedPages(prev => ({...prev, [page.id]: true})); unlockNextWebtoonPage(pages.length); }}
                                    seriesTitle={series?.title}
                                    chapterNumber={chapter?.chapter_number}
                                />
                            ) : (
                                <div className="reader-page-skeleton" style={{ width: '100%' }} aria-label={`Sayfa ${page.page_number} yükleniyor`} />
                            )}
                        </div>
                    ))}

                    <div style={{ marginTop: 60, padding: '0 20px' }}>
                        <ReaderSupportCard appSettings={appSettings} />
                        <EndChapterCard series={series} seriesSlug={seriesSlug} nextChapter={nextChapter} navigateTo={navigateTo} appSettings={appSettings} />
                    </div>

                    <div id="comments-section" className="page-container" style={{ marginTop: 40, paddingBottom: 120 }}>
                        <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Yorumlar yükleniyor...</div>}>
                            <CommentSection chapterId={chapterId} seriesId={series.id} />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── OKUYUCU DESTEK KARTI ──
function ReaderSupportCard({ appSettings }) {
    if (appSettings.reader_support_enabled !== '1') return null;
    const text = appSettings.reader_support_text || 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.';
    const btnText = appSettings.reader_support_button_text || 'Destek Ol';
    const btnUrl = appSettings.reader_support_url || '#';
    return (
        <div style={{
            margin: '40px auto 12px',
            maxWidth: 500,
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            padding: '2px',
            background: 'rgba(30, 30, 35, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
            {/* Dekoratif arka plan blob'ları */}
            <div style={{
                position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
            }}>
                <div style={{
                    position: 'absolute', top: -30, left: -20, width: 160, height: 160,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
                    filter: 'blur(24px)',
                }}/>
                <div style={{
                    position: 'absolute', bottom: -20, right: -10, width: 130, height: 130,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                }}/>
            </div>
            {/* Cam gövdesi */}
            <div style={{
                position: 'relative', zIndex: 1,
                borderRadius: 22,
                padding: '32px 28px 28px',
                background: 'rgba(20, 20, 25, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                textAlign: 'center',
            }}>
                {/* İkon */}
                <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
                    flexShrink: 0,
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </div>

                {/* Başlık çizgisi */}
                <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#ef4444',
                }}>Destek</div>

                {/* Metin */}
                <p style={{
                    color: '#d1d5db',
                    fontSize: '0.91rem',
                    lineHeight: 1.75,
                    margin: 0,
                    fontWeight: 400,
                    maxWidth: 380,
                }}>
                    {text}
                </p>

                {/* Ayırıcı */}
                <div style={{
                    width: '40%',
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}/>

                {/* Buton */}
                <a
                    href={btnUrl}
                    target={btnUrl !== '#' ? '_blank' : undefined}
                    rel={btnUrl !== '#' ? 'noopener noreferrer' : undefined}
                    onClick={e => e.stopPropagation()}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 32px',
                        borderRadius: 50,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {btnText}
                </a>
            </div>
        </div>
    );
}

// ── BÖLÜM SONU KARTI (Next Chapter) ──
function EndChapterCard({ series, seriesSlug, nextChapter, navigateTo, appSettings, goPrevPage }) {
    const [navigating, setNavigating] = useState(false);
    const router = useRouter();

    return (
        <div className="reader-end-card">
            <div className="rec-bg" style={{ backgroundImage: `url(${series.cover_url || '/demo/cover1.jpg'})` }} />
            <div className="rec-content">
                {nextChapter ? (
                    <>
                        <div className="rec-label">{appSettings.lang_next_up || 'SIRADAKİ BÖLÜM'}</div>
                        <div className="rec-title">{appSettings.lang_chapter_prefix || 'Bölüm'} {nextChapter.chapter_number}</div>
                        <button 
                            className="rec-btn" 
                            disabled={navigating}
                            onClick={(e) => { 
                                e.stopPropagation();
                                setNavigating(true);
                                try { navigateTo(nextChapter); }
                                catch (err) { console.error('Bölüm navigasyon hatası:', err); setNavigating(false); }
                            }}
                        >
                            {navigating ? (
                                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                            ) : (
                                <>
                                    {appSettings.lang_read_chapter || 'Hemen Oku'}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="rec-label" style={{ color: 'var(--success)' }}>{appSettings.lang_up_to_date || 'GÜNCELSİNİZ'}</div>
                        <div className="rec-title">{appSettings.lang_no_more_chapters || 'Şimdilik Başka Bölüm Yok'}</div>
                    </>
                )}

                {/* Navigasyon butonları — her zaman göster */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    <Link
                        href={`/seri/${seriesSlug}`}
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.12)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.18)',
                            textDecoration: 'none', padding: '7px 16px',
                            borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        {appSettings.lang_back_to_series || 'Seriye Dön'}
                    </Link>
                    <button
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            textDecoration: 'none', padding: '7px 16px',
                            borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
                            whiteSpace: 'nowrap', cursor: 'pointer',
                        }}
                        onClick={e => { e.stopPropagation(); window.scrollTo(0, 0); router.push('/'); }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        {appSettings.lang_go_home || 'Ana Sayfa'}
                    </button>
                </div>

                {goPrevPage && (
                    <button style={{ marginTop: 8, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => { e.stopPropagation(); goPrevPage(); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg> Önceki Sayfaya Dön
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ReaderPage({ chapterId } = {}) {
    return (
        <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
            <ReaderContent chapterId={chapterId} />
        </Suspense>
    );
}
