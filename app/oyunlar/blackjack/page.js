'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { handValue, BJ_MIN_BET, BJ_MAX_BET, BJ_BLACKJACK_PAYOUT, BJ_WIN_PAYOUT } from '@/lib/blackjack';

function Card({ card, hidden }) {
    if (hidden) return <div className="bj-card bj-card-back" />;
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
        <div className={`bj-card ${isRed ? 'is-red' : ''}`}>
            <span>{card.rank}</span>
            <span className="bj-suit">{card.suit}</span>
        </div>
    );
}

const STATUS_TEXT = {
    won: 'Kazandın!',
    lost: 'Kaybettin',
    push: 'Berabere',
    blackjack: 'BLACKJACK! 🎉',
    dealer_blackjack: 'Krupiyede Blackjack',
};

export default function BlackjackPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [round, setRound] = useState(null); // { roundId, betAmount }
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [dealerHiddenCount, setDealerHiddenCount] = useState(0);
    const [status, setStatus] = useState(null);
    const [payout, setPayout] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    const playing = round && status === 'active';
    const playerVal = playerHand.length ? handValue(playerHand).value : 0;
    const dealerVal = dealerHand.length ? handValue(dealerHand.slice(0, dealerHand.length - dealerHiddenCount)).value : 0;

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < BJ_MIN_BET || betNum > BJ_MAX_BET) {
            setError(`Bahis ${BJ_MIN_BET} ile ${BJ_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/blackjack/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                setRound({ roundId: data.roundId, betAmount: betNum });
                setPlayerHand(data.playerHand);
                setDealerHand(data.dealerHand);
                setDealerHiddenCount(data.dealerHiddenCount);
                setStatus(data.status);
                setPayout(data.payout);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function hit() {
        if (!playing || busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/blackjack/hit', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Hamle yapılamadı'); setBusy(false); return; }
            setPlayerHand(data.playerHand);
            setDealerHand(data.dealerHand);
            setDealerHiddenCount(data.dealerHiddenCount);
            setStatus(data.status);
            if (data.status !== 'active') { setPayout(data.payout); refreshUser(); }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function stand() {
        if (!playing || busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/blackjack/stand', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Durulamadı'); setBusy(false); return; }
            setPlayerHand(data.playerHand);
            setDealerHand(data.dealerHand);
            setDealerHiddenCount(data.dealerHiddenCount);
            setStatus(data.status);
            setPayout(data.payout);
            refreshUser();
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    function newRound() {
        setRound(null);
        setPlayerHand([]);
        setDealerHand([]);
        setStatus(null);
        setPayout(null);
    }

    const resolved = status && status !== 'active';

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 620, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <span style={{ fontSize: '1.3rem' }}>🃏</span> Blackjack
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>21'i geçmeden krupiyeyi geç. Blackjack {BJ_BLACKJACK_PAYOUT}x, normal kazanç {BJ_WIN_PAYOUT}x öder.</p>
                </div>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(94,114,228,0.12)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        <strong style={{ color: 'var(--accent)' }}>{(user.yomi_points || 0).toLocaleString()}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pointsName}</span>
                    </div>
                )}
            </div>

            {!user ? (
                <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>Oynamak için giriş yapmalısın.</p>
                    <Link href="/login" className="btn btn-primary">Giriş Yap</Link>
                </div>
            ) : (
                <>
                    <div className="glass-panel bj-table">
                        <div className="bj-row">
                            <div className="bj-row-label">Krupiye {dealerHiddenCount === 0 && dealerHand.length > 0 ? `(${handValue(dealerHand).value})` : ''}</div>
                            <div className="bj-cards">
                                {dealerHand.map((c, i) => <Card key={i} card={c} hidden={dealerHiddenCount > 0 && i === dealerHand.length - 1} />)}
                            </div>
                        </div>
                        <div className="bj-row">
                            <div className="bj-row-label">Sen {playerHand.length > 0 ? `(${playerVal})` : ''}</div>
                            <div className="bj-cards">
                                {playerHand.map((c, i) => <Card key={i} card={c} />)}
                            </div>
                        </div>

                        {resolved && (
                            <div className="bj-result" style={{ color: payout > 0 ? (status === 'push' ? 'var(--text-secondary)' : 'var(--success)') : 'var(--danger)' }}>
                                {STATUS_TEXT[status] || status}
                                {payout > 0 && ` — +${payout.toLocaleString()} ${pointsName}`}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

                        {playing && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={hit}>Kart Çek</button>
                                <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={stand}>Dur</button>
                            </div>
                        )}

                        {resolved && (
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={newRound}>Yeni Tur</button>
                        )}

                        {!round && (
                            <>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={BJ_MIN_BET} max={BJ_MAX_BET} className="form-input" value={bet}
                                        onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                    <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={busy} onClick={startGame}>
                                        {busy ? '...' : 'Dağıt'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    {[50, 100, 250, 500].map(v => (
                                        <button key={v} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setBet(v)}>{v}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <style jsx>{`
                .bj-table {
                    padding: 24px 20px;
                    background: linear-gradient(180deg, #0d3b26 0%, #0a2a1b 100%);
                }
                .bj-row { margin-bottom: 18px; }
                .bj-row:last-of-type { margin-bottom: 0; }
                .bj-row-label { color: rgba(255,255,255,0.75); font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; }
                .bj-cards { display: flex; gap: 8px; flex-wrap: wrap; min-height: 78px; }
                .bj-card {
                    width: 52px; height: 74px; border-radius: 8px;
                    background: #fff; color: #111;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 1.1rem;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                }
                .bj-card.is-red { color: #d92030; }
                .bj-suit { font-size: 1.2rem; }
                .bj-card-back {
                    background: repeating-linear-gradient(45deg, #5e72e4, #5e72e4 4px, #4c5fd6 4px, #4c5fd6 8px);
                    border: 2px solid rgba(255,255,255,0.3);
                }
                .bj-result { text-align: center; margin-top: 14px; font-weight: 800; font-size: 1.1rem; color: #fff; }
            `}</style>
        </div>
    );
}
