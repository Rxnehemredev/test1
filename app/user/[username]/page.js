'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/components/SettingsProvider';
import { useAuth } from '@/components/AuthProvider';

const rankColors = {
    'user': '#9ca3af', 'team_member': '#3b82f6', 'moderator': '#8b5cf6',
    'manager': '#f59e0b', 'admin': '#ef4444',
};
const roleLabels = {
    'user': 'Üye', 'team_member': 'Çevirmen', 'moderator': 'Moderatör',
    'manager': 'Yönetici', 'admin': 'Admin',
};

const STATUS_TR = { reading: 'Okuyor', completed: 'Tamamladı', plan: 'Okuma Planı', dropped: 'Bıraktı' };

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const raw = String(dateStr);
    const normalized = raw.includes('T') ? (raw.endsWith('Z') ? raw : raw + 'Z') : raw.replace(' ', 'T') + 'Z';
    const diff = (Date.now() - new Date(normalized).getTime()) / 1000;
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(normalized).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username;
    const { settings: siteSettings } = useSettings() || {};
    const { user: currentUser, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState(null);
    const [recentComments, setRecentComments] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [readingList, setReadingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('library');
    const [rlFilter, setRlFilter] = useState('all');

    const pointsName = siteSettings?.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        if (!username) return;
        async function fetchProfile() {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
                const data = await res.json();
                if (!res.ok) { setError(data.error || 'Profil yüklenemedi'); setLoading(false); return; }
                setProfile(data.user);
                setRecentComments(data.recentComments || []);
                setFavorites(data.favorites || []);
                setReadingList(data.readingList || []);
                setLoading(false);
            } catch {
                setError('Profil yüklenemedi');
                setLoading(false);
            }
        }
        fetchProfile();
    }, [username]);

    // Redirect to own profile if viewing own profile
    useEffect(() => {
        if (!authLoading && profile && currentUser) {
            if (currentUser.username === username || currentUser.username === profile.username) {
                router.replace('/profile');
            }
        }
    }, [profile, currentUser, authLoading, username, router]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><div className="spinner" /></div>;
    if (error) return <div style={{ textAlign: 'center', padding: '80px 20px' }}><h2 style={{ marginBottom: 12 }}>{error}</h2><Link href="/" style={{ color: 'var(--accent)' }}>Ana sayfaya dön</Link></div>;
    if (!profile) return null;

    const roleColor = rankColors[profile.role] || '#9ca3af';

    const filteredReadingList = rlFilter === 'all' ? readingList : readingList.filter(r => r.status === rlFilter);
    const rlCounts = { all: readingList.length };
    ['reading', 'completed', 'plan', 'dropped'].forEach(s => { rlCounts[s] = readingList.filter(r => r.status === s).length; });

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
            {/* Header Kart */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden', marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Kapak */}
                <div style={{ height: 160, background: profile.cover_url ? `url(${profile.cover_url}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)', position: 'relative' }}>
                    {!profile.cover_url && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${roleColor}22 0%, transparent 100%)` }} />}
                </div>
                {/* Avatar & Info */}
                <div style={{ padding: '0 32px 28px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -50, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${roleColor}`, overflow: 'hidden', background: 'var(--bg-tertiary)', flexShrink: 0, boxShadow: `0 0 24px ${roleColor}40` }}>
                            {profile.avatar_url && profile.avatar_url !== '/default-avatar.png'
                                ? <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{profile.username?.[0]?.toUpperCase()}</div>
                            }
                        </div>
                        <div style={{ paddingBottom: 4 }}>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>{profile.username}</h1>
                            <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: `${roleColor}20`, border: `1px solid ${roleColor}50`, color: roleColor, fontWeight: 700, fontSize: '0.8rem' }}>
                                {roleLabels[profile.role] || 'Üye'}
                            </span>
                        </div>
                    </div>
                    {profile.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16, maxWidth: 600 }}>{profile.bio}</p>}
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                        {[
                            { label: pointsName, value: profile.yomi_points || 0 },
                            { label: 'Favori', value: profile.favoriteCount || 0 },
                            { label: 'Yorum', value: profile.commentCount || 0 },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{value.toLocaleString('tr-TR')}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
                            </div>
                        ))}
                        {profile.created_at && (
                            <div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {new Date(profile.created_at.includes('T') ? profile.created_at : profile.created_at + 'Z').toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} tarihinden beri üye
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 12, padding: 6, border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
                {[
                    { id: 'library', label: `Kütüphane (${readingList.length})` },
                    { id: 'favorites', label: `Favoriler (${favorites.length})` },
                    { id: 'comments', label: `Yorumlar (${recentComments.length})` },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                            background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                            color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Kütüphane Tab */}
            {activeTab === 'library' && (
                <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[['all', 'Tümü'], ['reading', 'Okuyor'], ['completed', 'Tamamladı'], ['plan', 'Okuma Planı'], ['dropped', 'Bıraktı']].map(([v, l]) => (
                            <button key={v} onClick={() => setRlFilter(v)}
                                style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${rlFilter === v ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, background: rlFilter === v ? 'var(--accent)' : 'transparent', color: rlFilter === v ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                {l} {rlCounts[v] > 0 && `(${rlCounts[v]})`}
                            </button>
                        ))}
                    </div>
                    {filteredReadingList.length === 0
                        ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Kütüphanede seri yok.</div>
                        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                            {filteredReadingList.map(item => (
                                <Link key={item.id} href={`/seri/${item.slug || item.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-tertiary)', position: 'relative' }}>
                                        {item.cover_url && <img src={item.cover_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />}
                                        <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{STATUS_TR[item.status] || item.status}</div>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                </Link>
                            ))}
                          </div>
                    }
                </div>
            )}

            {/* Favoriler Tab */}
            {activeTab === 'favorites' && (
                favorites.length === 0
                    ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Henüz favori yok.</div>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                        {favorites.map(s => (
                            <Link key={s.id} href={`/seri/${s.slug || s.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                                    {s.cover_url && <img src={s.cover_url} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />}
                                </div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                            </Link>
                        ))}
                      </div>
            )}

            {/* Yorumlar Tab */}
            {activeTab === 'comments' && (
                recentComments.length === 0
                    ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Henüz yorum yok.</div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentComments.map(c => (
                            <div key={c.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {c.series_title && (
                                            <Link href={`/seri/${c.series_slug || c.series_id}`} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                                                {c.series_title}
                                            </Link>
                                        )}
                                        {c.chapter_number != null && (
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Bölüm {c.chapter_number}</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(c.created_at)}</span>
                                </div>
                                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{c.content}</p>
                            </div>
                        ))}
                      </div>
            )}
        </div>
    );
}