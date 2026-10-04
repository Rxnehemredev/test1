'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { WHEEL_SEGMENTS, WHEEL_SEGMENT_ANGLE, segmentCenterAngle, WHEEL_MIN_BET, WHEEL_MAX_BET } from '@/lib/wheel';

function tierFor(m) {
    if (m >= 5) return { color: '#fbbf24', glow: 'rgba(251,191,36,0.55)' };
    if (m >= 2) return { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' };
    if (m > 1) return { color: '#2dce89', glow: 'rgba(45,206,137,0.45)' };
    if (m === 1) return { color: '#5e72e4', glow: 'rgba(94,114,228,0.4)' };
    return { color: '#f5365c', glow: 'rgba(245,54,92,0.45)' };
}

function Burst({ color, big }) {
    const particles = useMemo(() => Array.from({ length: big ? 22 : 14 }, (_, i) => {
        const angle = (i / (big ? 22 : 14)) * Math.PI * 2 + Math.random() * 0.4;
        const dist = (big ? 80 : 46) + Math.random() * (big ? 60 : 34);
        return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, size: 3 + Math.random() * 4, delay: Math.random() * 0.08 };
    }), [big]);
    return (
        <div className="wheel-burst" aria-hidden="true">
            {particles.map((p, i) => (
                <span key={i} className="wheel-particle" style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, width: p.size, height: p.size, background: color, animationDelay: `${p.delay}s` }} />
            ))}
        </div>
    );
}

export default function WheelPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');
    const [resultId, setResultId] = useState(0);
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';
    const spinTimerRef = useRef(null);

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
        return () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); };
    }, []);

    const gradient = useMemo(() => {
        let acc = 0;
        const stops = WHEEL_SEGMENTS.map(seg => {
            const from = acc; const to = acc + WHEEL_SEGMENT_ANGLE; acc = to;
            return `${seg.color} ${from}deg ${to}deg`;
        });
        return `conic-gradient(from 0deg, ${stops.join(', ')})`;
    }, []);

    const tier = tierFor(result?.multiplier ?? 1);

    async function spin() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < WHEEL_MIN_BET || betNum > WHEEL_MAX_BET) {
            setError(`Bahis ${WHEEL_MIN_BET} ile ${WHEEL_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setSpinning(true);
        setResult(null);
        try {
            const res = await authFetch('/api/games/wheel/spin', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Çevrilemedi'); setSpinning(false); return; }
            const extraSpins = 5 + Math.floor(Math.random() * 3);
            const baseline = rotation - (rotation % 360);
            const target = baseline + extraSpins * 360 + (360 - segmentCenterAngle(data.segmentIndex)) + (Math.random() * (WHEEL_SEGMENT_ANGLE * 0.6) - WHEEL_SEGMENT_ANGLE * 0.3);
            setRotation(target);
            spinTimerRef.current = setTimeout(() => {
                setSpinning(false);
                setResult({ multiplier: data.multiplier, payout: data.payout });
                setResultId(id => id + 1);
                setHistory(h => [{ id: Date.now(), bet: betNum, multiplier: data.multiplier, payout: data.payout }, ...h].slice(0, 12));
                refreshUser();
            }, 4200);
        } catch { setError('Bir hata oluştu'); setSpinning(false); }
    }

    const won = result && result.payout > 0;

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 720, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
                        Çark
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>Bahis yap, çarkı çevir — dilim çarpanınca puanın katlanır.</p>
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
                    <div className={`wheel-scene ${spinning ? 'is-spinning' : ''} ${won ? 'is-won' : ''}`} style={{ '--tier-color': tier.color, '--tier-glow': tier.glow }}>
                        <div className="wheel-glow" />
                        <div className="wheel-frame">
                            <div className="wheel-pointer" />
                            <div className="wheel-disc" style={{ background: gradient, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.1, 1)' : 'none' }}>
                                {WHEEL_SEGMENTS.map((seg, i) => (
                                    <div key={i} className="wheel-label" style={{ transform: `rotate(${segmentCenterAngle(i)}deg)` }}>
                                        <span>{seg.label}</span>
                                    </div>
                                ))}
                                {WHEEL_SEGMENTS.map((_, i) => (
                                    <div key={`d-${i}`} className="wheel-divider" style={{ transform: `rotate(${i * WHEEL_SEGMENT_ANGLE}deg)` }} />
                                ))}
                            </div>
                            <div className="wheel-hub">
                                {spinning ? <span className="wheel-hub-spin">●</span> : (result ? `${result.multiplier}x` : '?')}
                            </div>
                            {won && <Burst color={tier.color} key={`w${resultId}`} big={result.multiplier >= 3} />}
                        </div>
                        {result && (
                            <div className={`wheel-readout ${won ? 'is-win' : 'is-lose'}`} key={`r${resultId}`}>
                                {won ? `+${result.payout.toLocaleString()} ${pointsName}` : 'Bu sefer olmadı'}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="number" min={WHEEL_MIN_BET} max={WHEEL_MAX_BET} className="form-input" value={bet}
                                onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={spinning} />
                            <button className="btn btn-primary wheel-spin-btn" disabled={spinning} onClick={spin}>
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

                    {history.length > 0 && (
                        <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Geçmiş</h3>
                            <div className="wheel-history">
                                {history.map(h => (
                                    <div key={h.id} className={`wheel-history-row ${h.payout > 0 ? 'is-win' : 'is-lose'}`}>
                                        <span style={{ color: 'var(--text-muted)' }}>{h.bet.toLocaleString()} {pointsName}</span>
                                        <span className="wheel-history-result">{h.multiplier}x → {h.payout.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                .wheel-scene {
                    position: relative;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 18px;
                    padding: 44px 20px 36px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background:
                        radial-gradient(120% 70% at 50% 100%, color-mix(in srgb, var(--tier-color) 14%, transparent) 0%, transparent 60%),
                        linear-gradient(180deg, #0c0e18 0%, #14172a 60%, #1a1e38 100%);
                    box-shadow: inset 0 0 0 1px var(--border-color), var(--shadow);
                    transition: background 0.6s ease;
                }
                .wheel-glow {
                    position: absolute; inset: 0;
                    background: radial-gradient(closest-side, var(--tier-glow), transparent 70%);
                    opacity: 0.5;
                    transition: opacity 0.5s ease;
                    pointer-events: none;
                }
                .is-spinning .wheel-glow { opacity: 0.9; animation: wheel-pulse 1.4s ease-in-out infinite; }
                @keyframes wheel-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.95; } }
                .wheel-frame { position: relative; }
                .wheel-disc {
                    position: relative;
                    width: 280px; height: 280px;
                    border-radius: 50%;
                    box-shadow: 0 0 0 8px var(--bg-tertiary), 0 0 0 10px var(--border-color), 0 10px 40px rgba(0,0,0,0.5), 0 0 50px var(--tier-glow);
                    transition: box-shadow 0.5s ease;
                }
                .wheel-divider { position: absolute; inset: 0; transform-origin: 50% 50%; }
                .wheel-divider::after { content: ''; position: absolute; top: 0; left: 50%; width: 1px; height: 50%; background: rgba(0,0,0,0.25); }
                .wheel-label { position: absolute; inset: 0; display: flex; justify-content: center; transform-origin: 50% 50%; }
                .wheel-label span { margin-top: 14px; font-weight: 800; font-size: 0.85rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
                .wheel-pointer {
                    position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
                    width: 0; height: 0; z-index: 5;
                    border-left: 12px solid transparent; border-right: 12px solid transparent;
                    border-top: 20px solid var(--tier-color);
                    filter: drop-shadow(0 2px 6px var(--tier-glow));
                    transition: border-top-color 0.5s ease;
                }
                .wheel-hub {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 64px; height: 64px; border-radius: 50%;
                    background: var(--bg-card);
                    border: 3px solid var(--tier-color);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 1rem; color: var(--tier-color);
                    box-shadow: 0 0 24px var(--tier-glow);
                    transition: border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease;
                }
                .wheel-hub-spin { display: inline-block; animation: wheel-hub-fade 0.8s ease-in-out infinite; }
                @keyframes wheel-hub-fade { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                .wheel-burst { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
                .wheel-particle { position: absolute; left: 0; top: 0; border-radius: 50%; animation: wheel-particle-burst 0.8s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
                @keyframes wheel-particle-burst { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
                .wheel-readout { font-weight: 800; font-size: 1.15rem; padding: 6px 18px; border-radius: 999px; animation: wheel-readout-pop 0.35s ease-out; }
                @keyframes wheel-readout-pop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
                .wheel-readout.is-win { color: var(--success); text-shadow: 0 0 16px rgba(45,206,137,0.5); }
                .wheel-readout.is-lose { color: var(--danger); }
                .wheel-spin-btn { min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .wheel-history { display: flex; flex-direction: column; gap: 6px; }
                .wheel-history-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 8px 10px; border-radius: 8px; background: var(--bg-tertiary); border-left: 3px solid transparent; }
                .wheel-history-row.is-win { border-left-color: var(--success); }
                .wheel-history-row.is-lose { border-left-color: var(--danger); }
                .wheel-history-result { font-weight: 700; }
                .is-win .wheel-history-result { color: var(--success); }
                .is-lose .wheel-history-result { color: var(--danger); }
                @media (prefers-reduced-motion: reduce) {
                    .wheel-glow, .wheel-hub-spin, .wheel-readout { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
