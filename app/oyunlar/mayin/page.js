'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { MINES_GRID_SIZE, MINES_MINE_COUNT, MINES_MIN_BET, MINES_MAX_BET, minesMultiplier, round2 } from '@/lib/mines';

function tierFor(m) {
    if (m >= 5) return { color: '#fbbf24', glow: 'rgba(251,191,36,0.55)' };
    if (m >= 2.5) return { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' };
    if (m >= 1.5) return { color: '#2dce89', glow: 'rgba(45,206,137,0.45)' };
    return { color: '#5e72e4', glow: 'rgba(94,114,228,0.4)' };
}

function Burst({ color, big }) {
    const particles = useMemo(() => Array.from({ length: big ? 20 : 12 }, (_, i) => {
        const angle = (i / (big ? 20 : 12)) * Math.PI * 2 + Math.random() * 0.4;
        const dist = (big ? 60 : 38) + Math.random() * (big ? 40 : 26);
        return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, size: 3 + Math.random() * 3, delay: Math.random() * 0.06 };
    }), [big]);
    return (
        <div className="mines-burst" aria-hidden="true">
            {particles.map((p, i) => (
                <span key={i} className="mines-particle" style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, width: p.size, height: p.size, background: color, animationDelay: `${p.delay}s` }} />
            ))}
        </div>
    );
}

export default function MinesPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [round, setRound] = useState(null);
    const [revealed, setRevealed] = useState([]);
    const [mines, setMines] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [lastReveal, setLastReveal] = useState(null);
    const [bustCell, setBustCell] = useState(null);
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    const currentMultiplier = round2(minesMultiplier(revealed.length, MINES_GRID_SIZE, MINES_MINE_COUNT));
    const potentialPayout = round ? Math.floor(round.betAmount * currentMultiplier) : 0;
    const playing = !!round;
    const tier = tierFor(currentMultiplier);

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < MINES_MIN_BET || betNum > MINES_MAX_BET) {
            setError(`Bahis ${MINES_MIN_BET} ile ${MINES_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/mines/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                setRound({ roundId: data.roundId, betAmount: betNum });
                setRevealed([]);
                setMines([]);
                setResult(null);
                setLastReveal(null);
                setBustCell(null);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function revealCell(idx) {
        if (!round || busy || revealed.includes(idx)) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/mines/reveal', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId, cell: idx }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Açılamadı'); setBusy(false); return; }
            if (data.hitMine) {
                setBustCell(idx);
                setMines(data.minePositions);
                setRevealed(data.revealed);
                setResult({ type: 'busted', payout: 0 });
                setRound(null);
                refreshUser();
            } else {
                setLastReveal(idx);
                setRevealed(data.revealed);
                if (data.cleared) {
                    setMines(data.minePositions);
                    setResult({ type: 'cashed', payout: data.potentialPayout, multiplier: data.multiplier, cleared: true });
                    setRound(null);
                    refreshUser();
                }
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function cashOut() {
        if (!round || revealed.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const res = await authFetch('/api/games/mines/cashout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId }),
            });
            const data = await res.json();
            if (data.success) {
                setMines(data.minePositions);
                setResult({ type: 'cashed', payout: data.payout, multiplier: data.multiplier });
                setRound(null);
                refreshUser();
            } else {
                setError(data.error || 'Çekilemedi');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    const won = result?.type === 'cashed';
    const busted = result?.type === 'busted';

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 600, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></svg>
                        Mayın Tarlası
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>36 kare, 6 mayın — her güvenli kare çarpanı artırır. İstediğin an çek!</p>
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
                    <div className={`mines-scene glass-panel ${busted ? 'is-busted' : ''}`} style={{ '--tier-color': tier.color, '--tier-glow': tier.glow }}>
                        {(playing || revealed.length > 0) && (
                            <div className="mines-readout">
                                <div className="mines-readout-item">
                                    <span className="mines-readout-label">Çarpan</span>
                                    <span className="mines-readout-value" style={{ color: tier.color, textShadow: `0 0 14px ${tier.glow}` }}>{currentMultiplier.toFixed(2)}x</span>
                                </div>
                                <div className="mines-readout-item" style={{ alignItems: 'flex-end' }}>
                                    <span className="mines-readout-label">Olası ödül</span>
                                    <span className="mines-readout-value" style={{ color: 'var(--success)' }}>{potentialPayout.toLocaleString()} {pointsName}</span>
                                </div>
                            </div>
                        )}
                        <div className="mines-grid">
                            {Array.from({ length: MINES_GRID_SIZE }).map((_, i) => {
                                const isRevealed = revealed.includes(i);
                                const isMine = mines.includes(i);
                                const showMine = isMine && (result?.type === 'busted' || result?.cleared);
                                const isBustCell = bustCell === i;
                                return (
                                    <button
                                        key={i}
                                        className={`mines-cell ${isRevealed ? 'is-revealed' : ''} ${showMine ? 'is-mine' : ''} ${isBustCell ? 'is-bust' : ''} ${lastReveal === i ? 'is-fresh' : ''}`}
                                        disabled={!playing || busy || isRevealed}
                                        onClick={() => revealCell(i)}
                                    >
                                        {showMine ? '💣' : (isRevealed ? '💎' : '')}
                                        {isBustCell && <Burst color="#f5365c" big />}
                                    </button>
                                );
                            })}
                        </div>

                        {result && (
                            <div className={`mines-result ${won ? 'is-win' : 'is-lose'}`}>
                                {won
                                    ? `${result.cleared ? 'Tüm kareler açıldı!' : 'Çekildi!'} +${result.payout.toLocaleString()} ${pointsName} (${result.multiplier}x)`
                                    : 'Mayına bastın — bahis yandı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

                        {playing ? (
                            <button className="btn btn-primary mines-cashout-btn" disabled={busy || revealed.length === 0} onClick={cashOut}>
                                {busy ? '...' : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v14M6 10l6 6 6-6" /><path d="M4 20h16" /></svg>
                                        ÇEK — {potentialPayout.toLocaleString()} {pointsName}
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={MINES_MIN_BET} max={MINES_MAX_BET} className="form-input" value={bet}
                                        onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                    <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={busy} onClick={startGame}>
                                        {busy ? '...' : 'Başla'}
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
                .mines-scene {
                    position: relative;
                    padding: 20px;
                    background: linear-gradient(180deg, #10131f 0%, #171b2c 100%);
                    transition: box-shadow 0.4s ease;
                }
                .mines-scene.is-busted { animation: mines-shake 0.4s ease-in-out; }
                @keyframes mines-shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-3px); }
                    80% { transform: translateX(2px); }
                }
                .mines-readout { display: flex; justify-content: space-between; margin-bottom: 14px; }
                .mines-readout-item { display: flex; flex-direction: column; gap: 2px; }
                .mines-readout-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
                .mines-readout-value { font-size: 1.15rem; font-weight: 900; font-variant-numeric: tabular-nums; transition: color 0.4s ease; }
                .mines-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
                .mines-cell {
                    position: relative;
                    aspect-ratio: 1; border-radius: 8px;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.15rem;
                    cursor: pointer; transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
                }
                .mines-cell:not(:disabled):hover { background: var(--bg-card); border-color: var(--tier-color, var(--accent)); transform: scale(1.05); }
                .mines-cell:disabled { cursor: default; }
                .mines-cell.is-revealed { background: rgba(45,206,137,0.15); border-color: rgba(45,206,137,0.4); }
                .mines-cell.is-fresh { animation: mines-reveal-pop 0.3s ease-out; }
                @keyframes mines-reveal-pop { 0% { transform: scale(0.5) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
                .mines-cell.is-mine { background: rgba(245,54,92,0.18); border-color: rgba(245,54,92,0.5); }
                .mines-cell.is-bust { animation: mines-bust-pop 0.35s ease-out; }
                @keyframes mines-bust-pop { 0% { transform: scale(1.4); } 100% { transform: scale(1); } }
                .mines-burst { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
                .mines-particle { position: absolute; left: 0; top: 0; border-radius: 50%; animation: mines-particle-burst 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
                @keyframes mines-particle-burst { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
                .mines-result { text-align: center; margin-top: 16px; font-weight: 800; font-size: 1.05rem; animation: mines-result-pop 0.35s ease-out; }
                @keyframes mines-result-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .mines-result.is-win { color: var(--success); text-shadow: 0 0 16px rgba(45,206,137,0.5); }
                .mines-result.is-lose { color: var(--danger); }
                .mines-cashout-btn { width: 100%; font-size: 1.05rem; padding: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                @media (prefers-reduced-motion: reduce) {
                    .mines-scene.is-busted, .mines-cell.is-fresh, .mines-cell.is-bust, .mines-result { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
