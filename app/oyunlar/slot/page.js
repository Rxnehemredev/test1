'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { SLOT_SYMBOLS, SLOT_MIN_BET, SLOT_MAX_BET, symbolById } from '@/lib/slots';

const REEL_STOP_DELAYS = [800, 1150, 1500];

function Burst({ color, big }) {
    const particles = useMemo(() => Array.from({ length: big ? 24 : 14 }, (_, i) => {
        const angle = (i / (big ? 24 : 14)) * Math.PI * 2 + Math.random() * 0.4;
        const dist = (big ? 90 : 50) + Math.random() * (big ? 60 : 34);
        return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, size: 3 + Math.random() * 4, delay: Math.random() * 0.08 };
    }), [big]);
    return (
        <div className="slot-burst" aria-hidden="true">
            {particles.map((p, i) => (
                <span key={i} className="slot-particle" style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, width: p.size, height: p.size, background: color, animationDelay: `${p.delay}s` }} />
            ))}
        </div>
    );
}

function Reel({ spinning, finalId, stopDelay, isWinning }) {
    const [shownId, setShownId] = useState(finalId || SLOT_SYMBOLS[0].id);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (spinning) {
            intervalRef.current = setInterval(() => {
                setShownId(SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].id);
            }, 70);
            const stopTimer = setTimeout(() => {
                clearInterval(intervalRef.current);
                setShownId(finalId);
            }, stopDelay);
            return () => { clearInterval(intervalRef.current); clearTimeout(stopTimer); };
        }
    }, [spinning, finalId, stopDelay]);

    return (
        <div className={`slot-reel ${spinning ? 'is-spinning' : ''} ${isWinning ? 'is-win' : ''}`}>
            <div className="slot-reel-inner">
                <span className="slot-symbol">{symbolById(shownId).emoji}</span>
            </div>
        </div>
    );
}

export default function SlotPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [spinning, setSpinning] = useState(false);
    const [reels, setReels] = useState([SLOT_SYMBOLS[0].id, SLOT_SYMBOLS[0].id, SLOT_SYMBOLS[0].id]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [resultId, setResultId] = useState(0);
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    async function spin() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < SLOT_MIN_BET || betNum > SLOT_MAX_BET) {
            setError(`Bahis ${SLOT_MIN_BET} ile ${SLOT_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setSpinning(true);
        setResult(null);
        try {
            const res = await authFetch('/api/games/slots/spin', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Çevrilemedi');
                setSpinning(false);
                return;
            }
            setReels(data.symbols);
            setTimeout(() => {
                setSpinning(false);
                setResult({ multiplier: data.multiplier, payout: data.payout });
                setResultId(id => id + 1);
                refreshUser();
            }, REEL_STOP_DELAYS[2] + 150);
        } catch {
            setError('Bir hata oluştu');
            setSpinning(false);
        }
    }

    const jackpot = result && reels[0] === 'seven' && reels[1] === 'seven' && reels[2] === 'seven';
    const won = result && result.payout > 0;
    const bigWin = won && result.multiplier >= 10;

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 560, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <span style={{ fontSize: '1.4rem' }}>🎰</span> Slot 777
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>3 aynı sembol büyük ödül, 2 aynı sembol bahsini geri verir.</p>
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
                    <div className={`slot-scene glass-panel ${bigWin ? 'is-bigwin' : ''}`}>
                        <div className="slot-cabinet">
                            <div className="slot-marquee">
                                {[...Array(10)].map((_, i) => <span key={i} className="slot-bulb" style={{ animationDelay: `${i * 0.12}s` }} />)}
                            </div>
                            <div className="slot-machine">
                                {reels.map((id, i) => (
                                    <Reel key={i} spinning={spinning} finalId={id} stopDelay={REEL_STOP_DELAYS[i]} isWinning={won && !spinning} />
                                ))}
                                {won && !spinning && <Burst color={jackpot ? '#fbbf24' : '#2dce89'} big={bigWin} key={`w${resultId}`} />}
                            </div>
                        </div>
                        {result && (
                            <div className={`slot-result ${won ? 'is-win' : 'is-lose'} ${jackpot ? 'is-jackpot' : ''}`}>
                                {jackpot ? `JACKPOT! 🎉 +${result.payout.toLocaleString()} ${pointsName}` :
                                    result.payout > 0 ? `+${result.payout.toLocaleString()} ${pointsName} (${result.multiplier}x)` : 'Bu sefer olmadı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="number" min={SLOT_MIN_BET} max={SLOT_MAX_BET} className="form-input" value={bet}
                                onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={spinning} />
                            <button className="btn btn-primary slot-spin-btn" disabled={spinning} onClick={spin}>
                                {spinning ? 'Dönüyor…' : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
                                        Çevir
                                    </>
                                )}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {[50, 100, 250, 500].map(v => (
                                <button key={v} className="btn btn-ghost btn-sm" disabled={spinning} onClick={() => setBet(v)}>{v}</button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Ödeme Tablosu (3 aynı)</h3>
                        <div className="slot-paytable">
                            {SLOT_SYMBOLS.map(s => (
                                <div key={s.id} className={`slot-pay-row ${s.id === 'seven' ? 'is-jackpot-row' : ''}`}>
                                    <span>{s.emoji}{s.emoji}{s.emoji}</span>
                                    <strong>{s.threeMult}x</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                .slot-scene {
                    position: relative;
                    padding: 24px;
                    background: linear-gradient(180deg, #10131f 0%, #171b2c 100%);
                    transition: box-shadow 0.4s ease;
                }
                .slot-scene.is-bigwin { animation: slot-shake 0.5s ease-in-out; }
                @keyframes slot-shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-5px); }
                    40% { transform: translateX(5px); }
                    60% { transform: translateX(-3px); }
                    80% { transform: translateX(3px); }
                }
                .slot-cabinet {
                    border-radius: 16px;
                    padding: 14px 16px 18px;
                    background: linear-gradient(180deg, #2a1a3d 0%, #1c1130 100%);
                    box-shadow: inset 0 0 0 2px rgba(251,191,36,0.25), 0 10px 30px rgba(0,0,0,0.4);
                }
                .slot-marquee { display: flex; justify-content: space-between; padding: 0 4px 12px; }
                .slot-bulb {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #fbbf24;
                    box-shadow: 0 0 6px #fbbf24;
                    animation: slot-bulb-blink 1.2s ease-in-out infinite;
                }
                @keyframes slot-bulb-blink { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
                .slot-machine {
                    position: relative;
                    display: flex; gap: 10px; justify-content: center;
                    padding: 16px; border-radius: 12px;
                    background: linear-gradient(180deg, #0c1024 0%, #1c2246 100%);
                    box-shadow: inset 0 0 0 1px var(--border-color), inset 0 4px 12px rgba(0,0,0,0.4);
                }
                .slot-reel {
                    width: 84px; height: 100px; border-radius: 10px;
                    background: var(--bg-card);
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden;
                    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.06);
                    transition: box-shadow 0.4s ease;
                }
                .slot-reel.is-win {
                    box-shadow: inset 0 0 0 2px #fbbf24, 0 0 20px rgba(251,191,36,0.5);
                    animation: slot-win-pulse 0.9s ease-in-out infinite;
                }
                @keyframes slot-win-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
                .slot-reel-inner { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
                .slot-symbol { font-size: 2.6rem; line-height: 1; }
                .slot-reel.is-spinning .slot-symbol { filter: blur(1.5px); }
                .slot-burst { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
                .slot-particle { position: absolute; left: 0; top: 0; border-radius: 50%; animation: slot-particle-burst 0.8s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
                @keyframes slot-particle-burst { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
                .slot-result { text-align: center; margin-top: 18px; font-weight: 800; font-size: 1.05rem; animation: slot-result-pop 0.35s ease-out; }
                @keyframes slot-result-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .slot-result.is-win { color: var(--success); text-shadow: 0 0 16px rgba(45,206,137,0.5); }
                .slot-result.is-lose { color: var(--danger); }
                .slot-result.is-jackpot { color: #fbbf24; font-size: 1.2rem; text-shadow: 0 0 22px rgba(251,191,36,0.7); }
                .slot-spin-btn { min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .slot-paytable { display: flex; flex-direction: column; gap: 6px; }
                .slot-pay-row {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 1rem; padding: 6px 10px; border-radius: 8px;
                    background: var(--bg-tertiary);
                }
                .slot-pay-row.is-jackpot-row { background: rgba(251,191,36,0.1); box-shadow: inset 0 0 0 1px rgba(251,191,36,0.3); }
                .slot-pay-row.is-jackpot-row strong { color: #fbbf24; }
                @media (prefers-reduced-motion: reduce) {
                    .slot-scene.is-bigwin, .slot-bulb, .slot-reel.is-win, .slot-result { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
