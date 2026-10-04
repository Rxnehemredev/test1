import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { checkResult, botMove, XOX_WIN_MULTIPLIER } from '@/lib/xox';
import { createRateLimiter } from '@/lib/ratelimit';
import { creditPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { roundId, cell } — oyuncu hamlesi, ardından (bitmediyse) bot hamlesi
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId, cell } = await request.json();
        if (!Number.isInteger(Number(roundId))) return NextResponse.json({ error: 'Geçersiz tur' }, { status: 400 });
        const cellIdx = Number(cell);
        if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx > 8) {
            return NextResponse.json({ error: 'Geçersiz hücre' }, { status: 400 });
        }

        const round = await db.prepare("SELECT * FROM xox_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const board = JSON.parse(round.board);
        if (board[cellIdx] !== null) return NextResponse.json({ error: 'Bu hücre dolu' }, { status: 400 });

        board[cellIdx] = 'x';
        let outcome = checkResult(board);
        let botMoveIdx = null;

        if (!outcome) {
            botMoveIdx = botMove(board);
            if (botMoveIdx !== -1) board[botMoveIdx] = 'o';
            outcome = checkResult(board);
        }

        if (!outcome) {
            // Oyun devam ediyor — sadece tahtayı kaydet.
            // Aşama 3 — Race condition koruması: önceki kodda bu UPDATE koşulsuzdu
            // (sadece id ile) — aynı tur için eşzamanlı iki 'move' isteği aynı
            // board'u okuyup her ikisi de hamle uygulayabiliyor, ikincisi
            // birincinin yazdığı hamleyi eziyordu. Artık güncelleme yalnızca satır
            // hâlâ 'active' VE board okunduğu andaki hâliyle eşleşiyorsa uygulanır
            // (optimistic locking, bkz. mines/reveal ve blackjack/hit'teki aynı koruma).
            const moveResult = await db.prepare(
                "UPDATE xox_rounds SET board = ? WHERE id = ? AND status = 'active' AND board = ?"
            ).run(JSON.stringify(board), round.id, round.board);
            if (moveResult.changes === 0) {
                return NextResponse.json({ error: 'Bu tur eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
            }
            return NextResponse.json({ success: true, board, botMove: botMoveIdx, status: 'active' });
        }

        // Oyun bitti: kazanç hesapla
        let payout = 0;
        let status = 'lost';
        if (outcome === 'x') { payout = Math.floor(round.bet_amount * XOX_WIN_MULTIPLIER); status = 'won'; }
        else if (outcome === 'draw') { payout = round.bet_amount; status = 'draw'; }
        else { payout = 0; status = 'lost'; }

        // Aşama 3 — Race condition koruması: tur yalnızca hâlâ 'active' ise VE
        // board okunduğu andaki hâliyle eşleşiyorsa sonuçlandırılır (optimistic
        // locking + durum kontrolü; çift ödeme ve tutarsız tahta durumu önlenir).
        const updateResult = await db.prepare(
            "UPDATE xox_rounds SET board = ?, status = ?, payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active' AND board = ?"
        ).run(JSON.stringify(board), status, payout, round.id, round.board);

        if (updateResult.changes === 0) {
            return NextResponse.json({ error: 'Bu tur eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
        }

        if (payout > 0) {
            try {
                await creditPoints(db, payload.id, payout); // changes==0 ise fırlatır → telafi akışı
            } catch (creditErr) {
                console.error('xox/move ödül eklenemedi, telafi ediliyor:', creditErr);
                await db.prepare(
                    "UPDATE xox_rounds SET status = 'active', payout = NULL, ended_at = NULL WHERE id = ?"
                ).run(round.id).catch(() => {});
                return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
            }
        }

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);

        return NextResponse.json({
            success: true,
            board,
            botMove: botMoveIdx,
            status,
            outcome,
            payout,
            remainingPoints: user?.yomi_points ?? 0,
        });
    } catch (err) {
        console.error('xox/move POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
