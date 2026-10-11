'use client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSettings } from '@/components/SettingsProvider';
import { getCultivationData } from '@/lib/gamification';
import BadgeIcon from '@/components/BadgeIcon';

import ProfileOverviewTab from '@/components/profile/ProfileOverviewTab';
import ProfileLibraryTab from '@/components/profile/ProfileLibraryTab';
import ProfileStatsTab from '@/components/profile/ProfileStatsTab';
import ProfileBadgesTab from '@/components/profile/ProfileBadgesTab';
import ProfileSettingsTab from '@/components/profile/ProfileSettingsTab';

// Rank icon mapper (SVG ikonlar, emoji yok) — havacılık/gökyüzü rütbe ikonları
function RankIcon({ icon, size = 16, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'rocket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
    );
    if (icon === 'compass') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
    );
    if (icon === 'send') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
    );
    if (icon === 'wind') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
        </svg>
    );
    if (icon === 'cloud') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
    );
    if (icon === 'sun') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    );
    if (icon === 'globe') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    );
    if (icon === 'shield') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    );
    if (icon === 'star') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    );
    return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    );
}

export default function ProfilePage() {
    const { user, loading, authFetch, updateUser, refreshUser } = useAuth();
    const router = useRouter();
    const { settings: siteSettings } = useSettings() || {};
    const pointsName = siteSettings?.points_name || 'Asteria Yıldızı';

    // Site-stay heartbeat: her 1 dakikada bir puan için API'ye bildirim gönder
    useEffect(() => {
        if (!user) return;
        const sendHeartbeat = async () => {
            try {
                await authFetch('/api/users/site-stay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ minutes: 1 })
                });
            } catch {}
        };
        // İlk ziyarette görev tamamla
        authFetch('/api/users/site-stay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: 1 })
        }).catch(() => {});
        const interval = setInterval(sendHeartbeat, 60 * 1000);
        return () => clearInterval(interval);
    }, [user, authFetch]);

    const [tab, setTab] = useState('overview');
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState('success');

    // Favorites
    const [favorites, setFavorites] = useState([]);
    const [loadingFavs, setLoadingFavs] = useState(true);

    // Stats
    const [detailedStats, setDetailedStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Quests
    const [quests, setQuests] = useState([]);
    const [claimingQuest, setClaimingQuest] = useState(null);

    // Reading List
    const [readingList, setReadingList] = useState([]);
    const [loadingReadingList, setLoadingReadingList] = useState(false);

    // Library view state (merged favorites + reading list)
    const [favoritesView, setFavoritesView] = useState('favorites');

    // Badges
    const [badges, setBadges] = useState([]);
    const [customBadges, setCustomBadges] = useState([]);
    const [loadingBadges, setLoadingBadges] = useState(false);

    // Reading history (for overview tab)
    const [readingHistory, setReadingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchFavorites();
            fetchQuests();
            fetchDetailedStats();
            fetchReadingList();
            fetchBadges();
            fetchReadingHistory();
        }
    }, [user]);

    async function fetchFavorites() {
        try {
            const res = await authFetch('/api/favorites/list');
            if (!res) return;
            const data = await res.json();
            setFavorites(data.favorites || []);
        } catch {}
        finally { setLoadingFavs(false); }
    }

    async function fetchQuests() {
        try {
            const res = await authFetch('/api/users/quests');
            if (!res) return;
            const data = await res.json();
            setQuests(data.quests || []);
        } catch {}
    }

    async function fetchReadingHistory() {
        setLoadingHistory(true);
        try {
            const res = await authFetch('/api/history?limit=10');
            if (!res) return;
            const data = await res.json();
            setReadingHistory(data.history || []);
        } catch {}
        finally { setLoadingHistory(false); }
    }

    async function fetchDetailedStats() {
        setLoadingStats(true);
        try {
            const res = await authFetch('/api/users/stats');
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                setDetailedStats(data.stats);
            }
        } catch {}
        finally { setLoadingStats(false); }
    }

    async function fetchReadingList() {
        setLoadingReadingList(true);
        try {
            const res = await authFetch('/api/reading-list');
            if (!res) return;
            const data = await res.json();
            setReadingList(data.list || []);
        } catch {}
        finally { setLoadingReadingList(false); }
    }

    async function fetchBadges() {
        setLoadingBadges(true);
        try {
            const res = await authFetch('/api/users/badges');
            if (!res) return;
            const data = await res.json();
            setBadges(data.badges || []);
            setCustomBadges(data.customBadges || []);
        } catch {}
        finally { setLoadingBadges(false); }
    }

    async function removeFromReadingList(seriesId) {
        try {
            await authFetch(`/api/reading-list?seriesId=${seriesId}`, { method: 'DELETE' });
            setReadingList(prev => prev.filter(item => item.series_id !== seriesId));
        } catch {}
    }

    async function claimQuest(questId) {
        setClaimingQuest(questId);
        try {
            const res = await authFetch('/api/users/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                show(`${data.message}`, 'success');
                await fetchQuests();
                if (refreshUser) await refreshUser();
            } else {
                show(data.error || 'Başarısız oldu', 'error');
            }
        } catch (err) { show(err.message, 'error'); }
        finally { setClaimingQuest(null); }
    }

    function show(text, type = 'success') {
        setMsg(text); setMsgType(type);
        setTimeout(() => setMsg(''), 4000);
    }

    function getMemberDays() {
        if (!user?.created_at) return 0;
        return Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
    }

    if (loading || !user) return <div className="page-loading"><div className="spinner" /></div>;

    const tabs = [
        { id: 'overview', label: 'Genel Bakış', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
        { id: 'favorites', label: 'Kütüphane', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
        { id: 'stats', label: 'İstatistikler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
        { id: 'badges', label: 'Rozetler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
        { id: 'settings', label: 'Ayarlar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
    ];

    const cultivation = getCultivationData(user.yomi_points);

    return (
        <div className="page-container page-section fade-in glass-page-container" style={{ paddingTop: 0 }}>

            {/* ── Banner ── */}
            <div className={`prf-banner${user.cover_url ? ' prf-banner-has-cover' : ''}`} style={user.cover_url ? {
                backgroundImage: `url(${encodeURI(user.cover_url)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : {
                background: `linear-gradient(135deg, ${cultivation.color}18 0%, rgba(15,15,20,1) 100%)`,
            }}>
                <div className="prf-banner-overlay" />
                <div style={{ position:'absolute', top:'-30%', right:'-5%', width:320, height:320, background:`radial-gradient(circle, ${cultivation.color}22 0%, transparent 65%)`, filter:'blur(50px)', pointerEvents:'none', zIndex:0 }} />
            </div>

            {/* ── Avatar + Bilgi Satırı ── */}
            <div className="prf-identity">
                {/* Avatar */}
                <div className="prf-avatar-wrap" style={{ borderColor: cultivation.color, boxShadow: `0 0 0 3px ${cultivation.color}40` }}>
                    {(!user.avatar_url || user.avatar_url === '/default-avatar.png') ? (
                        <div style={{ width:'100%', height:'100%', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-tertiary)', color:cultivation.color, fontSize:'2.8rem', fontWeight:800 }}>
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                    ) : (
                        <img src={user.avatar_url} alt="Avatar" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} decoding="async" />
                    )}
                </div>

                {/* İsim + Badges + Rütbe */}
                <div className="prf-identity-info">
                    <h1 className="prf-username">
                        {user.username}
                    </h1>

                    <div className="prf-meta-row">
                        <span className="prf-rank-badge" style={{ background:`${cultivation.color}1a`, color:cultivation.color, borderColor:`${cultivation.color}40` }}>
                            {cultivation.icon && <RankIcon icon={cultivation.icon} size={13} color={cultivation.color} />}
                            {cultivation.title}
                        </span>
                        <span className="prf-days-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {getMemberDays()} Gün Aktif
                        </span>
                        {customBadges.map(b => (
                            <span key={b.id} title={b.label} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:700, padding:'2px 8px', borderRadius:10, background:`${b.color}1a`, border:`1px solid ${b.color}40`, color:b.color }}>
                                <BadgeIcon name={b.icon} size={12} color={b.color} /> {b.label}
                            </span>
                        ))}
                    </div>

                    {/* XP Bar */}
                    <div className="prf-xp-row">
                        <span className="prf-xp-label">{user.yomi_points || 0} {pointsName}</span>
                        <span className="prf-xp-next">{cultivation.nextRank ? `${cultivation.nextRank.title} için ${cultivation.nextRank.minPoints - (user.yomi_points||0)} ${pointsName}` : 'Max. Rütbe'}</span>
                    </div>
                    <div className="prf-xp-bar">
                        <div className="prf-xp-fill" style={{ width:`${cultivation.progressPercent}%`, background:cultivation.progressColor }} />
                    </div>
                </div>

                {/* Hızlı İstatistikler — sağ taraf */}
                <div className="prf-quick-stats">
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('favorites')}>
                        <span className="prf-qs-num" style={{ color:'#f87171' }}>{favorites.length}</span>
                        <span className="prf-qs-lbl">Favori</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('stats')}>
                        <span className="prf-qs-num" style={{ color:'#818cf8' }}>{user.yomi_points || 0}</span>
                        <span className="prf-qs-lbl">{pointsName}</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => { setFavoritesView('all'); setTab('favorites'); }}>
                        <span className="prf-qs-num" style={{ color:'#4ade80' }}>{readingList.length}</span>
                        <span className="prf-qs-lbl">Listede</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('badges')}>
                        <span className="prf-qs-num" style={{ color:'#fbbf24' }}>{badges.filter(b => b.earned).length}</span>
                        <span className="prf-qs-lbl">Rozet</span>
                    </button>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="prf-tabs">
                {tabs.map(t => (
                    <button key={t.id} className={`prf-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {msg && <div className={`alert ${msgType === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>{msg}</div>}

            {/* Tab Contents */}
            {tab === 'overview' && (
                <ProfileOverviewTab
                    readingHistory={readingHistory}
                    loadingHistory={loadingHistory}
                    quests={quests}
                    pointsName={pointsName}
                    claimQuest={claimQuest}
                    claimingQuest={claimingQuest}
                />
            )}

            {tab === 'favorites' && (
                <ProfileLibraryTab
                    favoritesView={favoritesView}
                    setFavoritesView={setFavoritesView}
                    favorites={favorites}
                    readingList={readingList}
                    loadingFavs={loadingFavs}
                    loadingReadingList={loadingReadingList}
                    removeFromReadingList={removeFromReadingList}
                />
            )}

            {tab === 'stats' && (
                <ProfileStatsTab
                    loadingStats={loadingStats}
                    detailedStats={detailedStats}
                    fetchDetailedStats={fetchDetailedStats}
                />
            )}

            {tab === 'badges' && (
                <ProfileBadgesTab
                    customBadges={customBadges}
                    badges={badges}
                    loadingBadges={loadingBadges}
                />
            )}

            {tab === 'settings' && (
                <ProfileSettingsTab
                    user={user}
                    authFetch={authFetch}
                    updateUser={updateUser}
                    refreshUser={refreshUser}
                    show={show}
                />
            )}
        </div>
    );
}
