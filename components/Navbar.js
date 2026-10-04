'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useSettings } from './SettingsProvider';
import TurnstileWidget from './TurnstileWidget';
import { genreToSlug } from '@/lib/genreSlug';
import { safeHref } from '@/lib/security/safeUrl';

export default function Navbar({ siteSettings = {} }) {
    const router = useRouter();
    const { user, logout, loading, authFetch, login, register } = useAuth();
    const { settings } = useSettings() || {};
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [liveResults, setLiveResults] = useState([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [hidden, setHidden] = useState(false);
    const debounceRef = useRef(null);
    const lastScrollY = useRef(0);

    // "Göz At" (/series) üstüne gelince açılan tür (genre) mega-menüsü.
    // Genre listesi PUBLIC /api/genres endpoint'inden çekiliyor.
    // ÖNCEDEN /api/admin/genres kullanılıyordu — bu endpoint admin
    // middleware korumasına (IP allowlist + admin rate limiter) tabi
    // olduğundan misafir kullanıcılarda 403 alınıyor ve menü boş
    // geliyordu. Düzeltme: /api/genres (public, 5dk cache'li) kullanılıyor.
    // Sadece ilk hover'da (lazy) çekiliyor.
    const [genreMenuOpen, setGenreMenuOpen] = useState(false);
    const [genreList, setGenreList] = useState(null); // null = henüz çekilmedi
    const genreMenuCloseTimer = useRef(null);

    function openGenreMenu() {
        clearTimeout(genreMenuCloseTimer.current);
        setGenreMenuOpen(true);
        if (genreList === null) {
            fetch('/api/genres')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data.genres)) {
                        setGenreList(data.genres.map(g => ({
                            name: g.name,
                            name_tr: g.name_tr || g.name,
                            slug: genreToSlug(g.name),
                        })));
                    } else {
                        setGenreList([]);
                    }
                })
                .catch(() => setGenreList([]));
        }
    }

    function closeGenreMenuDelayed() {
        clearTimeout(genreMenuCloseTimer.current);
        genreMenuCloseTimer.current = setTimeout(() => setGenreMenuOpen(false), 180);
    }

    useEffect(() => () => clearTimeout(genreMenuCloseTimer.current), []);

    // Navbar linkleri — masaüstü ve mobil AYNI kaynaktan (siteSettings.navbar_menu)
    // besleniyor. Önceden mobil menüler (hem giriş yapmış hem misafir için, iki
    // ayrı yerde) 4 öğeyi elle sabit kodluyordu; admin panelden navbar_menu'ye
    // yeni bir link (ör. Blog) eklendiğinde bu sadece masaüstünde görünüyordu,
    // mobilde hiç ulaşılamıyordu. Artık tek kaynak (navMenuItems) her ikisinde
    // de kullanılıyor.
    const baseNavItems = (siteSettings.navbar_menu || [
        { label: 'Ana Sayfa', url: '/' },
        { label: 'Göz At', url: '/series' },
        { label: 'Blog', url: '/blog' },
        { label: 'Sıralama', url: '/ranking' },
        { label: 'İstekler', url: '/requests' },
    ]).map(item => ({
        ...item,
        label: {
            '/': 'Ana Sayfa',
            '/series': 'Göz At',
            '/seri': 'Göz At',
            '/ranking': 'Sıralama',
            '/requests': 'İstekler',
            '/blog': 'Blog',
        }[item.url] || item.label,
    }));

    // Blog linki HER ZAMAN görünsün: navbar_menu admin panelden/DB'den özelleştirilmişse
    // varsayılan liste hiç kullanılmaz ve /blog eksik kalırdı. Yoksa Göz At'ın
    // hemen arkasına eklenir; admin kendi menüsüne zaten
    // /blog koyduysa dokunulmaz.
    const navMenuItems = baseNavItems.some(it => it.url === '/blog' || it.url === '/blog/')
        ? baseNavItems
        : (() => {
            // Göz At'ın hemen yanına (yoksa Ana Sayfa'nın, o da yoksa en başa) ekle
            let idx = baseNavItems.findIndex(it => it.url === '/series' || it.url === '/seri');
            if (idx === -1) idx = baseNavItems.findIndex(it => it.url === '/');
            const blogItem = { label: 'Blog', url: '/blog' };
            if (idx === -1) return [blogItem, ...baseNavItems];
            return [...baseNavItems.slice(0, idx + 1), blogItem, ...baseNavItems.slice(idx + 1)];
        })();

    // Bilinen url'ler için özel ikon, bilinmeyenler (ör. /blog gibi sonradan
    // eklenen linkler) için jenerik bir ikon — mobil listede ikon hep dolu olsun.
    function navItemIcon(url) {
        switch (url) {
            case '/':
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
            case '/series':
            case '/seri':
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
            case '/ranking':
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
            case '/requests':
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
            case '/blog':
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="12" y1="6" x2="12" y2="12" /><line x1="9" y1="9" x2="15" y2="9" /></svg>;
            default:
                return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
        }
    }

    // Notification state
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);
    const userMenuRef = useRef(null);

    // Auth modal state
    const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authUsername, setAuthUsername] = useState('');
    const [authConfirmPassword, setAuthConfirmPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [authMounted, setAuthMounted] = useState(false);
    // Bildirim silme inline onay state'i (native confirm() yerine)
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [authTurnstileToken, setAuthTurnstileToken] = useState('');
    useEffect(() => { setAuthMounted(true); }, []);

    // Logo URL'sini stabilize et — Date.now() her render'da yeni değer üretir,
    // bu da img'nin tekrar yüklenmesine ve gereksiz re-render'a yol açar
    const logoUrl = useMemo(() => {
        if (!siteSettings.logo_url) return '/logo.png';
        return `${siteSettings.logo_url}${siteSettings.logo_url.includes('?') ? '&' : '?'}v=1`;
    }, [siteSettings.logo_url]);

    // Logonun yanındaki marka yazısı. Admin panelinden site adı değiştirilirse o görünür.
    const brandName = siteSettings.site_name || 'Asteria Scans';

    // Esc ile modal kapat + body scroll kilidi
    useEffect(() => {
        if (!authModal) {
            document.body.style.overflow = '';
            return;
        }
        document.body.style.overflow = 'hidden';
        function handleEsc(e) { if (e.key === 'Escape') closeAuthModal(); }
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [authModal]);

    function openAuthModal(type) {
        setAuthModal(type);
        setAuthError('');
        setAuthEmail(''); setAuthPassword('');
        setAuthUsername(''); setAuthConfirmPassword('');
        setAuthTurnstileToken('');
    }
    function closeAuthModal() {
        setAuthModal(null);
        setAuthError('');
        setAuthTurnstileToken('');
    }

    async function handleAuthLogin(e) {
        e.preventDefault();
        setAuthError('');
        // Check turnstile if configured (skip if disabled via env)
        const turnstileSiteKey = settings?.turnstile_site_key;
        const turnstileDisabled = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE === '1';
        if (turnstileSiteKey && !authTurnstileToken && !turnstileDisabled) {
            setAuthError('Lütfen insan doğrulamasını tamamlayın.');
            return;
        }
        setIsFormSubmitting(true);
        try {
            await login(authEmail, authPassword, authTurnstileToken);
            closeAuthModal();
            router.push('/');
        } catch (err) {
            setAuthError(err.message);
            setAuthTurnstileToken('');
        } finally {
            setIsFormSubmitting(false);
        }
    }

    async function handleAuthRegister(e) {
        e.preventDefault();
        setAuthError('');
        if (authPassword !== authConfirmPassword) { setAuthError('Şifre eşleşmiyor'); return; }
        if (authPassword.length < 6) { setAuthError('Şifre en az 6 karakter olmalıdır'); return; }
        // Check turnstile if configured (skip if disabled via env)
        const turnstileSiteKey = settings?.turnstile_site_key;
        const turnstileDisabled = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE === '1';
        if (turnstileSiteKey && !authTurnstileToken && !turnstileDisabled) {
            setAuthError('Lütfen insan doğrulamasını tamamlayın.');
            return;
        }
        setIsFormSubmitting(true);
        try {
            await register(authUsername, authEmail, authPassword, authTurnstileToken);
            closeAuthModal();
            router.push('/');
        } catch (err) {
            setAuthError(err.message);
            setAuthTurnstileToken('');
        } finally {
            setIsFormSubmitting(false);
        }
    }

    // Custom roles for admin panel visibility check
    const [customRoles, setCustomRoles] = useState([]);

    // Custom roles — yalnızca yönetici rollerine sahip kullanıcılar için çek
    // Normal kullanıcılar için gereksiz authenticated request önlenir
    useEffect(() => {
        if (!user) return;
        // Açıkça normal kullanıcıysa custom role fetch yapmaya gerek yok
        if (user.role === 'user') return;
        async function fetchCustomRoles() {
            try {
                const res = await authFetch('/api/admin/users?action=list-custom-roles');
                const data = await res.json();
                if (data.roles) setCustomRoles(data.roles);
            } catch {}
        }
        fetchCustomRoles();
    }, [user, authFetch]);

    // Fetch notifications
    useEffect(() => {
        if (!user) return;
        async function fetchNotifs() {
            try {
                const res = await authFetch('/api/notifications');
                const data = await res.json();
                if (data.notifications) {
                    setNotifications(data.notifications);
                    setUnreadCount(data.notifications.filter(n => !n.is_read).length);
                }
            } catch {}
        }
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000);
        return () => clearInterval(interval);
    }, [user, authFetch]);

    // Okuma geçmişi artık ayrı /gecmis sayfasında gösteriliyor

    useEffect(() => {
        let rafId = null;
        function handleScroll() {
            // rAF throttle — her scroll event'te state güncellemesi yerine
            // sadece bir sonraki frame'de işlem yap, jank önler
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const currentY = window.scrollY;
                if (currentY > lastScrollY.current && currentY > 100) {
                    setHidden(true);
                } else if (currentY < lastScrollY.current || currentY <= 100) {
                    setHidden(false);
                }
                lastScrollY.current = currentY;
            });
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Close mobile menu on logout; never force-close user dropdown on refreshUser()
    useEffect(() => {
        setMobileMenuOpen(false);
        if (!user) setUserMenuOpen(false);
    }, [user]);

    // Close mobile menu when navbar is hidden (scrolled down)
    useEffect(() => {
        if (hidden) {
            setMobileMenuOpen(false);
        }
    }, [hidden]);

    async function markAllRead() {
        try {
            await authFetch('/api/notifications', { method: 'PUT' });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch {}
    }

    async function markAsRead(e, id) {
        e.preventDefault();
        e.stopPropagation();
        try {
            await authFetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {}
    }

    async function deleteNotification(e, id) {
        e.preventDefault();
        e.stopPropagation();
        try {
            await authFetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => {
                const isUnread = notifications.find(n => n.id === id)?.is_read === 0;
                return isUnread ? Math.max(0, prev - 1) : prev;
            });
        } catch {}
    }

    async function deleteAllNotifications() {
        if (!confirmDeleteAll) {
            setConfirmDeleteAll(true);
            // 4 saniye sonra onay state'ini sıfırla
            setTimeout(() => setConfirmDeleteAll(false), 4000);
            return;
        }
        setConfirmDeleteAll(false);
        try {
            await authFetch(`/api/notifications`, { method: 'DELETE' });
            setNotifications([]);
            setUnreadCount(0);
        } catch {}
    }

    // Live search with debounce
    function handleSearchChange(e) {
        const val = e.target.value;
        setSearchQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val.trim()) { setLiveResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLiveLoading(true);
            try {
                const res = await fetch(`/api/series?search=${encodeURIComponent(val.trim())}&limit=5`);
                const data = await res.json();
                setLiveResults(data.series || []);
            } catch { setLiveResults([]); }
            finally { setLiveLoading(false); }
        }, 300);
    }

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/seri?search=${encodeURIComponent(searchQuery.trim())}`;
            setSearchOpen(false);
            setLiveResults([]);
        }
    };

    function timeAgo(d) {
        if (!d) return '';
        const utcStr = typeof d === 'string' && !d.endsWith('Z') ? d + 'Z' : d;
        const m = Math.floor((Date.now() - new Date(utcStr).getTime()) / 60000);
        if (m < 60) return `${Math.max(1, m)} dk önce`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} sa önce`;
        return `${Math.floor(h / 24)} gün önce`;
    }

    function parseGenres(g) {
        try { return Array.isArray(g) ? g : JSON.parse(g || '[]'); } catch { return []; }
    }

    function closeMobileMenu() {
        setMobileMenuOpen(false);
    }

    return (
        <>
            <nav className={`navbar ${hidden ? 'hidden' : ''}`}>
                <div className="navbar-inner">
                    {/* Sadece logo: yazı kaldırıldı. Varsayılan logo (dairesel illüstrasyon, kare ve merkezi
                        kırpılmış) dönen renkli halka + parlama ile öne çıkarılır ve orb içinde tam simetrik
                        ortalanır; admin panelinden özel logo yüklenirse olduğu gibi (oranı bozulmadan) gösterilir.
                        Marka adı alt/aria-label'da kalır. */}
                    <Link href="/" className="navbar-logo" aria-label={brandName} title={brandName}>
                        {!siteSettings.logo_url ? (
                            <span className="navbar-logo-halo">
                                <span className="navbar-logo-orb">
                                    <img src={logoUrl} alt={brandName} decoding="async" fetchPriority="high" />
                                </span>
                            </span>
                        ) : (
                            <img
                                src={logoUrl}
                                alt={brandName}
                                className="navbar-logo-custom"
                                decoding="async" />
                        )}
                    </Link>

                    <div className="navbar-links">
                        {navMenuItems.map((item, i) => (
                            item.url === '/series' ? (
                                <div
                                    key={i}
                                    className="nav-item-group"
                                    onMouseEnter={openGenreMenu}
                                    onMouseLeave={closeGenreMenuDelayed}
                                >
                                    <Link href={safeHref(item.url, '/')} className="nav-link nav-link-with-caret">
                                        {item.label}
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="nav-caret-icon">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </Link>
                                    {genreMenuOpen && (
                                        <div className="nav-genre-menu" onMouseEnter={openGenreMenu} onMouseLeave={closeGenreMenuDelayed}>
                                            {genreList === null ? (
                                                <div className="nav-genre-menu-loading">Yükleniyor…</div>
                                            ) : genreList.length === 0 ? (
                                                <div className="nav-genre-menu-loading">Tür bulunamadı</div>
                                            ) : (
                                                <div className="nav-genre-menu-grid">
                                                    {genreList.map(g => (
                                                        <Link key={g.slug} href={`/tur/${g.slug}`} className="nav-genre-menu-item" onClick={() => setGenreMenuOpen(false)}>
                                                            {g.name_tr}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                            <Link href="/seri" className="nav-genre-menu-all" onClick={() => setGenreMenuOpen(false)}>
                                                Tüm Serilere Göz At →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link key={i} href={safeHref(item.url)} className="nav-link">{item.label}</Link>
                            )
                        ))}
                    </div>

                    <div className="navbar-actions">
                        <button className="nav-icon-btn" onClick={() => { setSearchOpen(!searchOpen); setLiveResults([]); }} aria-label="Search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        </button>

                        {/* Notification Bell – only when logged in */}
                        {!loading && user && (
                            <div className="notif-bell-wrapper" ref={notifRef}>
                                <button className="nav-icon-btn" onClick={() => { setNotifOpen(!notifOpen); }} aria-label="Notifications">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                    {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </button>
                                {notifOpen && (
                                    <div className="notif-dropdown">
                                        <div className="notif-dropdown-header">
                                            <span>Bildirimler</span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {unreadCount > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Tümünü okundu işaretle</button>}
                                                {notifications.length > 0 && (
                                                    <button
                                                        onClick={deleteAllNotifications}
                                                        style={{
                                                            background: confirmDeleteAll ? 'rgba(245,54,92,0.15)' : 'none',
                                                            border: confirmDeleteAll ? '1px solid rgba(245,54,92,0.4)' : 'none',
                                                            borderRadius: 4,
                                                            color: 'var(--danger)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            padding: confirmDeleteAll ? '2px 6px' : '0',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        {confirmDeleteAll ? 'Emin misin? Evet →' : 'Tümünü Sil'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {notifications.length === 0 ? (
                                            <div className="notif-empty">Henüz bildiriminiz yok</div>
                                        ) : (
                                            notifications.slice(0, 15).map(n => (
                                                <div key={n.id} style={{ display: 'flex', alignItems: 'center' }} className={`notif-item-wrap ${!n.is_read ? 'unread' : ''}`}>
                                                    <a href={safeHref(n.link)} className={`notif-item`} onClick={() => setNotifOpen(false)} style={{ flex: 1 }}>
                                                        <div className="notif-icon">
                                                            {n.type === 'reply' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                            ) : n.type === 'new_chapter' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="12" y1="6" x2="12" y2="12" /><line x1="9" y1="9" x2="15" y2="9" /></svg>
                                                            ) : n.type === 'comment_reported' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                                            ) : n.type === 'comment_report_resolved' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><polyline points="20 6 9 17 4 12" /></svg>
                                                            ) : n.type === 'comment_report_rejected' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="15" y1="12" x2="9" y2="12" /></svg>
                                                            ) : n.type === 'mention' ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M16 12a4 4 0 1 0-4 4c1.1 0 2-.4 2.7-1M16 8v5a2 2 0 0 0 4 0v-1a10 10 0 1 0-3.9 7.9" /></svg>
                                                            ) : n.type.startsWith('bug_report') ? (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                                            ) : (
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                            )}
                                                        </div>
                                                        <div className="notif-text">
                                                            <span>{n.message}</span>
                                                            <span className="notif-time">{timeAgo(n.created_at)}</span>
                                                        </div>
                                                    </a>
                                                    <div className="notif-actions" style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 4, flexShrink: 0 }}>
                                                        {!n.is_read && (
                                                            <button onClick={(e) => markAsRead(e, n.id)} title="Okundu İşaretle" style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: 4 }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => deleteNotification(e, n.id)} title="Sil" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {!loading && (
                            user ? (
                                /* Logged-in: show avatar (with photo if set) — no hamburger */
                                <div className="user-menu" ref={userMenuRef}>
                                    <button className="user-avatar-btn" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-label="User menu" style={{ position: 'relative' }}>
                                        {user.avatar_url && user.avatar_url !== '/default-avatar.png' ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.username}
                                                className="avatar-img-sm" decoding="async" />
                                        ) : (
                                            <div className="avatar-circle">{user.username[0].toUpperCase()}</div>
                                        )}
                                    </button>
                                    {userMenuOpen && (
                                        <div className="dropdown-menu" onClick={() => setUserMenuOpen(false)}>
                                            <div className="dropdown-header">
                                                <div className="dropdown-avatar-preview">
                                                    {user.avatar_url && user.avatar_url !== '/default-avatar.png' ? (
                                                        <img src={user.avatar_url} alt={user.username} decoding="async" />
                                                    ) : (
                                                        user.username[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div className="dropdown-header-text">
                                                    <strong>{user.username}</strong>
                                                    {user.equipped?.title && (
                                                        <span style={{ color: user.equipped.title.title_color || 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}>{user.equipped.title.name}</span>
                                                    )}
                                                    <span>{user.email}</span>
                                                </div>
                                            </div>
                                            {/* Mobile-only nav links — navMenuItems'tan (bkz. yukarısı) */}
                                            {navMenuItems.map((item, i) => (
                                                <Link key={i} href={safeHref(item.url)} className="dropdown-item mobile-only-item">
                                                    {navItemIcon(item.url)}
                                                    {item.label}
                                                </Link>
                                            ))}
                                            <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                                            <Link href="/profile" className="dropdown-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                Profil
                                            </Link>
                                            <Link href="/ranking" className="dropdown-item desktop-only-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                                                Sıralama
                                            </Link>
                                            {(function() {
                                                const builtinRoles = ['admin', 'manager', 'moderator', 'team_member'];
                                                const customRoleNames = customRoles.map(r => r.name);
                                                return [...builtinRoles, ...customRoleNames].includes(user.role);
                                            })() && (
                                                <Link href="/admin-panel" className="dropdown-item">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    Yönetim Paneli
                                                </Link>
                                            )}

                                            <Link href="/gecmis" className="dropdown-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                Okuma Geçmişi
                                            </Link>
                                            <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                                            <Link href="/oyunlar" className="dropdown-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><circle cx="15" cy="13" r="1" /><circle cx="18" cy="11" r="1" /><rect x="2" y="6" width="20" height="12" rx="6" /></svg>
                                                Oyunlar
                                            </Link>
                                            <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                                            <button onClick={logout} className="dropdown-item danger">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                                Çıkış Yap
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Not logged-in: show auth buttons on desktop + hamburger on mobile */
                                <>
                                    <div className="auth-buttons">
                                        <button className="btn btn-ghost" onClick={() => openAuthModal('login')}>Giriş Yap</button>
                                        <button className="btn btn-primary" onClick={() => openAuthModal('register')}>Kayıt Ol</button>
                                    </div>
                                    <button
                                        className="nav-icon-btn mobile-menu-btn"
                                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                        aria-label="Menu"
                                        aria-expanded={mobileMenuOpen}
                                    >
                                        {mobileMenuOpen ? (
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        ) : (
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
                                        )}
                                    </button>
                                </>
                            )
                        )}
                    </div>
                </div>

                {searchOpen && (
                    <div className="search-overlay">
                        <div className="search-bar-container">
                            <form onSubmit={handleSearch} className="search-bar-expanded">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                <input
                                    type="text"
                                    placeholder="Manga serisi ara..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    autoFocus
                                />
                                <button type="button" onClick={() => { setSearchOpen(false); setLiveResults([]); }} className="search-close">✕</button>
                            </form>
                            {liveResults.length > 0 && (
                                <div className="live-search-dropdown">
                                    {liveResults.map(s => (
                                        <Link key={s.id} href={`/seri/${s.slug || s.id}`} className="live-search-item" onClick={() => { setSearchOpen(false); setLiveResults([]); }}>
                                            <img src={s.cover_url || '/demo/cover1.jpg'} alt={`${s.title || 'Seri'} kapak görseli`} decoding="async" />
                                            <div className="ls-info">
                                                <span className="ls-title">{s.title}</span>
                                                <span className="ls-meta">{parseGenres(s.genres).slice(0, 2).join(', ')} · {s.chapterCount || 0} bölüm</span>
                                            </div>
                                        </Link>
                                    ))}
                                    <Link href={`/seri?search=${encodeURIComponent(searchQuery)}`} className="live-search-item" style={{ justifyContent: 'center', fontWeight: 600, color: 'var(--primary)' }} onClick={() => { setSearchOpen(false); setLiveResults([]); }}>
                                        Tüm sonuçları görüntüle →
                                    </Link>
                                </div>
                            )}
                            {liveLoading && searchQuery.trim() && (
                                <div className="live-search-dropdown" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Aranıyor...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Mobile nav panel – only for non-logged-in users */}
            {mobileMenuOpen && !user && !loading && (
                <>
                    <div className="mobile-nav-overlay" onClick={closeMobileMenu} />
                    <div className="mobile-nav-panel">
                        <button
                            className="mobile-nav-close-btn"
                            onClick={closeMobileMenu}
                            aria-label="Menüyü kapat"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                        {/* navMenuItems'tan (bkz. yukarısı) — admin panelden eklenen her link (Blog dahil) burada da görünür */}
                        {navMenuItems.map((item, i) => (
                            <Link key={i} href={safeHref(item.url)} className="mobile-nav-item" onClick={closeMobileMenu}>
                                {navItemIcon(item.url)}
                                {item.label}
                            </Link>
                        ))}
                        <div className="mobile-nav-divider" />
                        <button className="mobile-nav-item" onClick={() => { closeMobileMenu(); openAuthModal('login'); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                            Giriş Yap
                        </button>
                        <button className="mobile-nav-item mobile-nav-signup" onClick={() => { closeMobileMenu(); openAuthModal('register'); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                            Kayıt Ol
                        </button>
                    </div>
                </>
            )}

            {/* Auth Modal - Glassmorphism Popup */}
            {authMounted && authModal && createPortal(
                <div
                    className="auth-modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
                >
                    <div className="auth-modal-card">
                        {/* Tab switcher */}
                        <div className="auth-modal-tabs">
                            <button
                                className={`auth-modal-tab ${authModal === 'login' ? 'active' : ''}`}
                                onClick={() => { setAuthModal('login'); setAuthError(''); setAuthTurnstileToken(''); }}
                            >Giriş Yap</button>
                            <button
                                className={`auth-modal-tab ${authModal === 'register' ? 'active' : ''}`}
                                onClick={() => { setAuthModal('register'); setAuthError(''); setAuthTurnstileToken(''); }}
                            >Kayıt Ol</button>
                        </div>

                        <button className="auth-modal-close" onClick={closeAuthModal} aria-label="Kapat">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>

                        {authError && (
                            <div
                                className="alert alert-error"
                                role="alert"
                                aria-live="polite"
                                style={{ marginBottom: 16, fontSize: '0.82rem' }}
                            >{authError}</div>
                        )}

                        {authModal === 'login' ? (
                            <form onSubmit={handleAuthLogin}>
                                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Tekrar Hoş Geldiniz</h2>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{settings?.auth_subtitle_login || 'Okumaya devam etmek için giriş yapın'}</p>
                                </div>
                                <div className="form-group">
                                    <label>E-posta</label>
                                    <input type="email" className="form-input" placeholder="eposta@adresiniz.com"
                                        value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="off" />
                                </div>
                                <div className="form-group">
                                    <label>Şifre</label>
                                    <input type="password" className="form-input" placeholder="••••••••"
                                        value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete="off" />
                                </div>
                                {settings?.turnstile_site_key && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' && (
                                    <TurnstileWidget
                                        siteKey={settings.turnstile_site_key}
                                        onVerify={(token) => setAuthTurnstileToken(token || '')}
                                        onError={() => setAuthError('Doğrulama hatası. Lütfen sayfayı yenileyin.')}
                                    />
                                )}
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isFormSubmitting || (settings?.turnstile_site_key && !authTurnstileToken && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1')}>
                                    {isFormSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                                </button>
                                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
                                    Hesabınız yok mu?{' '}
                                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
                                        onClick={() => { setAuthModal('register'); setAuthError(''); setAuthTurnstileToken(''); }}>
                                        Kayıt Ol
                                    </button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleAuthRegister}>
                                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Hesap Oluştur</h2>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{settings?.auth_subtitle_register || 'Dilediğiniz dilde manga okuyun'}</p>
                                </div>
                                <div className="form-group">
                                    <label>Kullanıcı Adı</label>
                                    <input type="text" className="form-input" placeholder="kullanici_adiniz"
                                        value={authUsername} onChange={e => setAuthUsername(e.target.value)} required minLength={3} autoComplete="off" />
                                </div>
                                <div className="form-group">
                                    <label>E-posta</label>
                                    <input type="email" className="form-input" placeholder="eposta@adresiniz.com"
                                        value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoComplete="off" />
                                </div>
                                <div className="form-group">
                                    <label>Şifre</label>
                                    <input type="password" className="form-input" placeholder="En az 6 karakter"
                                        value={authPassword} onChange={e => setAuthPassword(e.target.value)} required autoComplete="new-password" />
                                </div>
                                <div className="form-group">
                                    <label>Şifreyi Onayla</label>
                                    <input type="password" className="form-input" placeholder="••••••••"
                                        value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} required autoComplete="new-password" />
                                </div>
                                {settings?.turnstile_site_key && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1' && (
                                    <TurnstileWidget
                                        siteKey={settings.turnstile_site_key}
                                        onVerify={(token) => setAuthTurnstileToken(token || '')}
                                        onError={() => setAuthError('Doğrulama hatası. Lütfen sayfayı yenileyin.')}
                                    />
                                )}
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={isFormSubmitting || (settings?.turnstile_site_key && !authTurnstileToken && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== '1')}>
                                    {isFormSubmitting ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                                </button>
                                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
                                    Zaten hesabınız var mı?{' '}
                                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
                                        onClick={() => { setAuthModal('login'); setAuthError(''); setAuthTurnstileToken(''); }}>
                                        Giriş Yap
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
