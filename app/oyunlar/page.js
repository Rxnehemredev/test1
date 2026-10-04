'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

const GAMES = [
    {
        href: '/oyunlar/cark', title: 'Çark', desc: 'Bahis yap, çarkı çevir — dilim çarpanınca puanın katlanır.',
        color: '#fbbf24',
        icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>,
    },
    {
        href: '/oyunlar/xox', title: 'XOX', desc: 'Bota karşı klasik XOX — kazanırsan 1.8x, berabere bahsin geri döner.',
        color: '#2dce89',
        icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>,
    },
    {
        href: '/oyunlar/mayin', title: 'Mayın Tarlası', desc: '36 kare, 6 mayın — her güvenli kare çarpanı artırır.',
        color: '#f5365c',
        icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></svg>,
    },
    {
        href: '/oyunlar/slot', title: 'Slot 777', desc: '3 makara, 3 aynı sembol büyük ödül — 7️⃣ jackpot!',
        color: '#8b5cf6',
        icon: <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>🎰</span>,
    },
    {
        href: '/oyunlar/blackjack', title: 'Blackjack', desc: '21\'i geçmeden krupiyeyi geç — blackjack 2.5x öder.',
        color: '#0ea5e9',
        icon: <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>🃏</span>,
    },
];

export default function OyunlarHubPage() {
    const { user } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 960, padding: '24px 16px' }}>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Oyunlar</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>{pointsName} ile oyna, kazan, biriktir.</p>
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(94,114,228,0.12)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        <strong style={{ color: 'var(--accent)' }}>{(user.yomi_points || 0).toLocaleString()}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pointsName}</span>
                    </div>
                )}
            </div>

            <div className="games-grid">
                {GAMES.map(g => (
                    <Link key={g.href} href={g.href} className="game-card">
                        <div className="game-card-icon" style={{ color: g.color, background: `${g.color}18`, boxShadow: `0 0 0 1px ${g.color}40` }}>
                            {g.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{g.title}</h3>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>{g.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <style jsx>{`
                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 16px;
                }
                .game-card {
                    display: flex; align-items: flex-start; gap: 14px;
                    padding: 20px; border-radius: var(--radius-lg);
                    background: var(--bg-card); border: 1px solid var(--border-color);
                    text-decoration: none; color: inherit;
                    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .game-card:hover {
                    transform: translateY(-3px);
                    border-color: var(--accent);
                    box-shadow: var(--shadow);
                }
                .game-card-icon {
                    width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
            `}</style>
        </div>
    );
}
