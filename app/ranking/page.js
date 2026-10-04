'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getCultivationData } from '@/lib/gamification';

// SVG Icons
const GiftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const MapPinIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);

const TrophyIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
);

const ZapIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

// Crown for 1st place
const CrownIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M2 19h20l-2-10-5 5-3-8-3 8-5-5L2 19z"/>
        <rect x="2" y="20" width="20" height="2" rx="1"/>
    </svg>
);

// Medal for 2nd / 3rd
const MedalIcon = ({ size = 20, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="0.5">
        <path d="M8 2h8l2 5H6L8 2z" opacity="0.7"/>
        <circle cx="12" cy="16" r="6" fill={color} stroke="none"/>
        <path d="M9 3h6M8.5 7l3.5 2 3.5-2" stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
        <text x="12" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" stroke="none">
            {color === '#9ca3af' ? '2' : '3'}
        </text>
    </svg>
);

export default function RankingPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [toast, setToast] = useState(null);
    const [dailyClaimed, setDailyClaimed] = useState(false);
    const [rewardAnimation, setRewardAnimation] = useState(null);
    const [appSettings, setAppSettings] = useState({});
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchRanking();
        fetch('/api/settings').then(r => r.json()).then(d => setAppSettings(d.settings || {})).catch(() => {});
    }, []);

    async function fetchRanking() {
        try {
            const res = await fetch('/api/users/ranking?limit=100');
            const data = await res.json();
            if (data.ranking) setUsers(data.ranking);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }

    async function handleDailyLogin() {
        if (!user) {
            showToast(appSettings.lang_must_be_logged_in || 'Günlük ödülü almak için giriş yapmalısınız!', 'error');
            return;
        }
        setClaiming(true);
        try {
            const res = await authFetch('/api/users/daily-login', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Talep edilemedi', 'error');
            } else {
                setDailyClaimed(true);
                const yp = appSettings.points_short || 'YP';
                setRewardAnimation(`+${data.reward} ${yp}`);
                setTimeout(() => setRewardAnimation(null), 3000);
                showToast(`${data.message}`, 'success');
                await fetchRanking();
                if (refreshUser) await refreshUser();
            }
        } catch (err) {
            showToast(appSettings.lang_error_claiming || 'Puan alınırken hata oluştu.', 'error');
        } finally {
            setClaiming(false);
        }
    }

    function getInitial(username) {
        return username?.[0]?.toUpperCase() || '?';
    }

    function renderAvatar(u, size = 40, forPodium = false) {
        if (u.avatar_url && u.avatar_url !== '/default-avatar.png') {
            return <img src={u.avatar_url} alt={u.username} style={forPodium ? { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' } : { width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} decoding="async" />;
        }
        return (
            <div style={{
                width: forPodium ? '100%' : size,
                height: forPodium ? '100%' : size,
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: forPodium ? size * 0.38 : size * 0.42,
                flexShrink: 0,
            }}>
                {getInitial(u.username)}
            </div>
        );
    }

    if (loading) return <div className="page-loading"><div className="spinner" /></div>;

    const top3 = users.slice(0, 3);
    const filteredRest = users.slice(3).filter(u =>
        !search.trim() || u.username.toLowerCase().includes(search.trim().toLowerCase())
    );
    const myRank = user ? users.findIndex(u => u.id === user.id) + 1 : null;
    const yp = appSettings.points_short || 'YP';

    return (
        <div className="page-container page-section fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
            {toast && (
                <div className={`toast ${toast.type}`}>{toast.msg}</div>
            )}

            {/* Reward animation popup */}
            {rewardAnimation && (
                <div style={{
                    position: 'fixed', bottom: '40px', right: '20px',
                    background: 'rgba(0,0,0,0.92)', border: '2px solid var(--accent)',
                    borderRadius: 16, padding: '24px 40px', zIndex: 1000,
                    textAlign: 'center', animation: 'toastSlideIn 0.4s ease',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#f59e0b' }}>
                        <GiftIcon />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-light)', letterSpacing: 1 }}>{rewardAnimation}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.82rem' }}>{appSettings.lang_daily_login_reward_claimed || 'Günlük Giriş Ödülü Alındı!'}</div>
                </div>
            )}

            {/* Header */}
            <div className="ranking-header">
                <div>
                    <h1 className="ranking-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TrophyIcon size={28} />
                        {appSettings.lang_ranking_title || 'Onur Listesi'}
                    </h1>
                    <p className="ranking-subtitle">{appSettings.lang_ranking_subtitle || `Diyarların en sadık okuyucuları — ${appSettings.points_name || 'Asteria Yıldızı'}na göre sıralandı.`}</p>
                    {myRank && myRank > 0 && (
                        <p style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPinIcon />
                            {appSettings.lang_your_rank || 'Sıralamanız'}: #{myRank} — {user.yomi_points || 0} {yp}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <button
                        className={`btn ${dailyClaimed ? 'btn-ghost' : 'btn-primary'} btn-lg daily-login-btn`}
                        onClick={handleDailyLogin}
                        disabled={claiming || dailyClaimed}
                        style={dailyClaimed ? { borderColor: '#22c55e', color: '#22c55e' } : {}}
                    >
                        {claiming ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                {appSettings.lang_claiming || 'Talep Ediliyor...'}
                            </>
                        ) : dailyClaimed ? (
                            <><CheckIcon /> {appSettings.lang_claimed_today || 'Bugün Alındı'}</>
                        ) : (
                            <><GiftIcon /> {appSettings.lang_claim_daily_reward || 'Günlük Ödülü Al'} (+10 {yp})</>
                        )}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{appSettings.lang_daily_login_hint || `Ücretsiz ${appSettings.points_name || 'Asteria Yıldızı'} kazanmak için her gün giriş yapın!`}</span>
                </div>
            </div>

            {/* Top 3 Podium */}
            {top3.length > 0 && (
                <div className="podium-container">
                    {/* Position 2 */}
                    {top3[1] && (() => { const cult2 = getCultivationData(top3[1].yomi_points); return (
                        <div className="podium-item pos-2 glass-panel">
                            <Link href={`/user/${encodeURIComponent(top3[1].username)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
                            <div className="podium-avatar">
                                <span className="podium-rank" style={{ position: 'absolute', top: -10, right: -10, zIndex: 5, background: 'transparent', border: 'none', color: '#9ca3af', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MedalIcon size={22} color="#9ca3af" />
                                </span>
                                {renderAvatar(top3[1], 56, true)}
                            </div>
                            <div className="podium-name">{top3[1].username}</div>
                            </Link>
                            <div style={{ fontSize: '0.65rem', color: cult2.color, fontWeight: 700, marginBottom: 2, letterSpacing: 0.5 }}>{cult2.title}</div>
                            <div className="podium-points">
                                <ZapIcon size={12} /> {top3[1].yomi_points} {yp}
                            </div>
                        </div>
                    ); })()}
                    {/* Position 1 */}
                    {(() => { const cult1 = getCultivationData(top3[0].yomi_points); return (
                    <div className="podium-item pos-1 glass-panel">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ color: '#f59e0b', filter: 'drop-shadow(0 2px 6px #f59e0b88)' }}>
                                <CrownIcon size={28} />
                            </span>
                        </div>
                        <Link href={`/user/${encodeURIComponent(top3[0].username)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
                        <div className="podium-avatar" style={{ border: '3px solid #f59e0b', boxShadow: '0 0 20px #f59e0b55', width: 90, height: 90 }}>
                            <span style={{ position: 'absolute', top: -10, right: -10, zIndex: 5, background: '#f59e0b', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', color: 'white', border: '2px solid var(--bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>1</span>
                            {renderAvatar(top3[0], 90, true)}
                        </div>
                        <div className="podium-name" style={{ fontSize: '1.1rem', marginTop: 8 }}>{top3[0].username}</div>
                        </Link>
                        <div style={{ fontSize: '0.68rem', color: cult1.color, fontWeight: 700, marginBottom: 3, letterSpacing: 0.5 }}>{cult1.title}</div>
                        <div className="podium-points" style={{ color: '#f59e0b', fontWeight: 900 }}>
                            <ZapIcon size={13} /> {top3[0].yomi_points} {yp}
                        </div>
                    </div>
                    ); })()}
                    {/* Position 3 */}
                    {top3[2] && (() => { const cult3 = getCultivationData(top3[2].yomi_points); return (
                        <div className="podium-item pos-3 glass-panel">
                            <Link href={`/user/${encodeURIComponent(top3[2].username)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
                            <div className="podium-avatar">
                                <span style={{ position: 'absolute', top: -10, right: -10, zIndex: 5, background: 'transparent', border: 'none', color: '#cd7c38', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MedalIcon size={22} color="#cd7c38" />
                                </span>
                                {renderAvatar(top3[2], 56, true)}
                            </div>
                            <div className="podium-name">{top3[2].username}</div>
                            </Link>
                            <div style={{ fontSize: '0.65rem', color: cult3.color, fontWeight: 700, marginBottom: 2, letterSpacing: 0.5 }}>{cult3.title}</div>
                            <div className="podium-points">
                                <ZapIcon size={12} /> {top3[2].yomi_points} {yp}
                            </div>
                        </div>
                    ); })()}
                </div>
            )}

            {/* Search + Stats bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 10px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)',
                            fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {users.length} kullanıcı sıralanıyor
                </div>
            </div>

            {/* Ranking List */}
            <div className="ranking-list">
                {filteredRest.map((rUser) => {
                    const globalIndex = users.findIndex(u => u.id === rUser.id);
                    const cult = getCultivationData(rUser.yomi_points);
                    const isMe = user && rUser.id === user.id;
                    return (
                        <div key={rUser.id} className="ranking-row glass-panel glass-panel-hoverable" style={isMe ? { border: '1px solid var(--primary)', background: 'rgba(220,38,38,0.05)' } : {}}>
                            <div className="ranking-row-rank" style={{ fontVariantNumeric: 'tabular-nums' }}>#{globalIndex + 1}</div>
                            <Link href={`/user/${encodeURIComponent(rUser.username)}`} className="ranking-row-user" style={{ textDecoration: 'none', color: 'inherit' }}>
                                {renderAvatar(rUser, 34)}
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span className="ranking-row-name">
                                        {rUser.username}
                                        {isMe && <span style={{ color: 'var(--primary)', fontSize: '0.7rem', marginLeft: 6 }}>({appSettings.lang_you || 'Siz'})</span>}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: cult.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <ZapIcon size={10} /> {cult.title}
                                    </span>
                                </div>
                            </Link>
                            <div className="ranking-row-points" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-light)', fontVariantNumeric: 'tabular-nums' }}>
                                <ZapIcon size={12} />
                                {rUser.yomi_points} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>{yp}</span>
                            </div>
                        </div>
                    );
                })}
                {filteredRest.length === 0 && search.trim() && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        "<strong>{search}</strong>" için sonuç bulunamadı
                    </div>
                )}
            </div>

            {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <TrophyIcon size={48} />
                        <p style={{ marginTop: 16 }}>{appSettings.lang_no_users_ranking || `Henüz kullanıcı bulunamadı. ${appSettings.points_name || 'Asteria Yıldızı'} kazanmaya başlayan ilk kişi olun!`}</p>
                        <Link href="/" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>{appSettings.lang_start_reading || 'Okumaya Başla'}</Link>
                    </div>
            )}
        </div>
    );
}
