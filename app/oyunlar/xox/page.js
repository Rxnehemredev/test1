'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { XOX_MIN_BET, XOX_MAX_BET, XOX_WIN_MULTIPLIER } from '@/lib/xox';

const EMPTY_BOARD = Array(9).fill(null);
const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

function winningLine(board) {
    for (const line of LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return { line, mark: board[a] };
    }
    return null;
}

export default function XoxPage() {
    const { user, authFetch, refreshUser } = useAuth();
    const [appSettings, setAppSettings] = useState({});
    const [bet, setBet] = useState(100);
    const [round, setRound] = useState(null);
    const [board, setBoard] = useState(EMPTY_BOARD);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [lastMove, setLastMove] = useState(null);
    const pointsName = appSettings.points_name || 'Asteria Yıldızı';

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setAppSettings(d.settings || {}); }).catch(() => {});
    }, []);

    const winInfo = useMemo(() => winningLine(board), [board]);

    async function startGame() {
        setError('');
        const betNum = Math.round(Number(bet));
        if (!Number.isFinite(betNum) || betNum < XOX_MIN_BET || betNum > XOX_MAX_BET) {
            setError(`Bahis ${XOX_MIN_BET} ile ${XOX_MAX_BET} arasında olmalı`);
            return;
        }
        if ((user?.yomi_points || 0) < betNum) { setError('Yetersiz puan'); return; }
        setBusy(true);
        try {
            const res = await authFetch('/api/games/xox/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ betAmount: betNum }),
            });
            const data = await res.json();
            if (data.success) {
                setRound({ roundId: data.roundId, betAmount: betNum });
                setBoard(data.board);
                setResult(null);
                setLastMove(null);
                refreshUser();
            } else {
                setError(data.error || 'Başlatılamadı');
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    async function playCell(idx) {
        if (!round || busy || board[idx] !== null) return;
        setBusy(true);
        setError('');
        setLastMove(idx);
        try {
            const res = await authFetch('/api/games/xox/move', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: round.roundId, cell: idx }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Hamle yapılamadı');
                setBusy(false);
                return;
            }
            setBoard(data.board);
            if (data.status !== 'active') {
                setResult({ status: data.status, payout: data.payout });
                setRound(null);
                refreshUser();
            }
        } catch { setError('Bir hata oluştu'); }
        setBusy(false);
    }

    const playing = !!round;
    const resultTone = result?.status === 'won' ? 'win' : result?.status === 'draw' ? 'draw' : 'lose';

    return (
        <div className="page-container glass-page-container" style={{ maxWidth: 560, padding: '24px 16px' }}>
            <Link href="/oyunlar" className="games-back-link">← Oyunlar</Link>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>
                        XOX
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>Bota karşı oyna — kazanırsan {XOX_WIN_MULTIPLIER}x, berabere kalırsan bahsin geri döner.</p>
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
                    <div className="xox-scene glass-panel">
                        <div className="xox-vs">
                            <div className={`xox-side ${playing ? 'is-active' : ''}`}>
                                <span className="xox-side-mark xox-mark-x">✕</span>
                                <span className="xox-side-label">Sen</span>
                            </div>
                            <span className="xox-vs-divider">VS</span>
                            <div className="xox-side">
                                <span className="xox-side-mark xox-mark-o">◯</span>
                                <span className="xox-side-label">Bot</span>
                            </div>
                        </div>

                        <div className="xox-grid">
                            {board.map((c, i) => {
                                const isWinCell = winInfo?.line.includes(i);
                                return (
                                    <button
                                        key={i}
                                        className={`xox-cell ${c ? `xox-${c}` : ''} ${isWinCell ? 'is-win-cell' : ''} ${lastMove === i ? 'is-last' : ''}`}
                                        disabled={!playing || busy || c !== null}
                                        onClick={() => playCell(i)}
                                    >
                                        {c === 'x' && <span className="xox-mark">✕</span>}
                                        {c === 'o' && <span className="xox-mark">◯</span>}
                                    </button>
                                );
                            })}
                            {winInfo && <WinLine line={winInfo.line} mark={winInfo.mark} />}
                        </div>

                        {result && (
                            <div className={`xox-result is-${resultTone}`}>
                                {result.status === 'won' && `Kazandın! +${result.payout.toLocaleString()} ${pointsName}`}
                                {result.status === 'draw' && `Berabere — bahsin (${result.payout.toLocaleString()}) geri döndü`}
                                {result.status === 'lost' && 'Kaybettin — bahis yandı'}
                            </div>
                        )}
                        {playing && !result && (
                            <p className="xox-hint">Sıra sende — bir hücre seç.</p>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: 20, marginTop: 20 }}>
                        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                        {!playing && (
                            <>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="number" min={XOX_MIN_BET} max={XOX_MAX_BET} className="form-input" value={bet}
                                        onChange={e => setBet(e.target.value)} style={{ flex: 1 }} placeholder="Bahis miktarı" disabled={busy} />
                                    <button className="btn btn-primary" style={{ minWidth: 140 }} disabled={busy} onClick={startGame}>
                                        {busy ? '...' : 'Oyna'}
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
                .xox-scene {
                    position: relative;
                    padding: 24px;
                    background: linear-gradient(180deg, #10131f 0%, #171b2c 100%);
                }
                .xox-vs {
                    display: flex; align-items: center; justify-content: center; gap: 18px;
                    margin-bottom: 20px;
                }
                .xox-side {
                    display: flex; flex-direction: column; align-items: center; gap: 4px;
                    opacity: 0.55; transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .xox-side.is-active { opacity: 1; transform: scale(1.06); }
                .xox-side-mark { font-size: 1.6rem; font-weight: 900; }
                .xox-mark-x { color: var(--accent); text-shadow: 0 0 14px rgba(94,114,228,0.6); }
                .xox-mark-o { color: #f5365c; text-shadow: 0 0 14px rgba(245,54,92,0.6); }
                .xox-side-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .xox-vs-divider { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
                .xox-grid {
                    position: relative;
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
                    max-width: 320px; margin: 0 auto;
                }
                .xox-cell {
                    aspect-ratio: 1; border-radius: 12px;
                    background: var(--bg-tertiary); border: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
                }
                .xox-cell:disabled { cursor: default; }
                .xox-cell:not(:disabled):hover { background: var(--bg-card); border-color: var(--accent); transform: scale(1.03); }
                .xox-cell.is-last { animation: xox-place 0.25s ease-out; }
                @keyframes xox-place { 0% { transform: scale(0.6); } 60% { transform: scale(1.1); } 100% { transform: scale(1); } }
                .xox-mark { font-size: 2.1rem; font-weight: 900; }
                .xox-x .xox-mark { color: var(--accent); text-shadow: 0 0 12px rgba(94,114,228,0.55); }
                .xox-o .xox-mark { color: #f5365c; text-shadow: 0 0 12px rgba(245,54,92,0.55); }
                .xox-cell.is-win-cell { background: rgba(45,206,137,0.18); border-color: rgba(45,206,137,0.5); }
                .xox-result { text-align: center; margin-top: 18px; font-weight: 800; font-size: 1.05rem; animation: xox-result-pop 0.35s ease-out; }
                @keyframes xox-result-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .xox-result.is-win { color: var(--success); text-shadow: 0 0 16px rgba(45,206,137,0.5); }
                .xox-result.is-draw { color: var(--text-secondary); }
                .xox-result.is-lose { color: var(--danger); }
                .xox-hint { text-align: center; margin-top: 16px; color: var(--text-muted); font-size: 0.9rem; }
                @media (prefers-reduced-motion: reduce) {
                    .xox-cell.is-last, .xox-result { animation: none !important; }
                }
            `}</style>
        </div>
    );
}

function WinLine({ line, mark }) {
    // 3x3 hücre merkezleri (0-100 grid koordinat sistemi)
    const centers = [
        [16.5, 16.5], [50, 16.5], [83.5, 16.5],
        [16.5, 50], [50, 50], [83.5, 50],
        [16.5, 83.5], [50, 83.5], [83.5, 83.5],
    ];
    const [x1, y1] = centers[line[0]];
    const [x2, y2] = centers[line[2]];
    const color = mark === 'x' ? 'var(--accent)' : '#f5365c';
    return (
        <svg className="xox-winline" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
                <animate attributeName="opacity" values="0;0.85" dur="0.3s" fill="freeze" />
            </line>
        </svg>
    );
}
