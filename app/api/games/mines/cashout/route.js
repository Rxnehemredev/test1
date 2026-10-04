import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { minesMultiplier, round2 } from '@/lib/mines';
import { createRateLimiter } from '@/lib/ratelimit';
import { creditPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { roundId } — o ana kadar açılan güvenli karelerin çarpanından çek
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId } = await request.json();
        if (!Number.isInteger(Number(roundId))) return NextResponse.json({ error: 'Geçersiz tur' }, { status: 400 });
        const round = await db.prepare("SELECT * FROM mines_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const revealed = JSON.parse(round.revealed);
        if (revealed.length === 0) return NextResponse.json({ error: 'Önce en az bir kare açmalısın' }, { status: 400 });

        const multiplier = round2(minesMultiplier(revealed.length, round.grid_size, round.mine_count));
        const payout = Math.floor(round.bet_amount * multiplier);
        const minePositions = JSON.parse(round.mine_positions);

        // Aşama 3 — Race condition koruması: tur yalnızca hâlâ 'active' ise
        // sonuçlandırılır; eşzamanlı ikinci bir cashout/reveal isteği 0 satır
        // etkileyip güvenle reddedilir (çift ödeme önlenir).
        const updateResult = await db.prepare(
            "UPDATE mines_rounds SET status = 'cashed', payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'"
        ).run(payout, round.id);
        if (updateResult.changes === 0) {
            return NextResponse.json({ error: 'Bu tur zaten sonuçlandırıldı' }, { status: 409 });
        }
        try {
            await creditPoints(db, payload.id, payout); // changes==0 ise fırlatır → telafi akışı
        } catch (creditErr) {
            console.error('mines/cashout ödül eklenemedi, telafi ediliyor:', creditErr);
            await db.prepare(
                "UPDATE mines_rounds SET status = 'active', payout = NULL, ended_at = NULL WHERE id = ?"
            ).run(round.id).catch(() => {});
            return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
        }

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);
        return NextResponse.json({ success: true, multiplier, payout, minePositions, remainingPoints: user?.yomi_points ?? 0 });
    } catch (err) {
        console.error('mines/cashout POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
