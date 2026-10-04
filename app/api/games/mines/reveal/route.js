import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { minesMultiplier, round2 } from '@/lib/mines';
import { createRateLimiter } from '@/lib/ratelimit';
import { creditPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { roundId, cell } — bir kareyi aç; mayınsa tur biter, güvenliyse çarpan güncellenir
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId, cell } = await request.json();
        // `revealed` / mayın konumları ASLA istemciden alınmaz: yalnızca roundId + cell gelir,
        // gerisi sunucudaki tur kaydından (DB) okunur ve doğrulanır.
        if (!Number.isInteger(Number(roundId))) return NextResponse.json({ error: 'Geçersiz tur' }, { status: 400 });
        const cellIdx = Number(cell);

        const round = await db.prepare("SELECT * FROM mines_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });
        if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx >= round.grid_size) {
            return NextResponse.json({ error: 'Geçersiz kare' }, { status: 400 });
        }

        const minePositions = JSON.parse(round.mine_positions);
        const revealed = JSON.parse(round.revealed);
        if (revealed.includes(cellIdx)) return NextResponse.json({ error: 'Bu kare zaten açık' }, { status: 400 });

        if (minePositions.includes(cellIdx)) {
            // Mayına bastı — tur biter, bahis yanar, tüm mayınlar açığa çıkar
            // Aşama 3 — Race condition koruması: tur yalnızca hâlâ 'active' ise kapatılır.
            const bustResult = await db.prepare(
                "UPDATE mines_rounds SET status = 'busted', payout = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'"
            ).run(round.id);
            if (bustResult.changes === 0) {
                return NextResponse.json({ error: 'Bu tur zaten sonuçlandırıldı' }, { status: 409 });
            }
            return NextResponse.json({
                success: true,
                hitMine: true,
                minePositions,
                revealed,
                payout: 0,
            });
        }

        const newRevealed = [...revealed, cellIdx];
        const multiplier = round2(minesMultiplier(newRevealed.length, round.grid_size, round.mine_count));
        const potentialPayout = Math.floor(round.bet_amount * multiplier);
        const allSafeRevealed = newRevealed.length === round.grid_size - round.mine_count;

        if (allSafeRevealed) {
            // Tüm güvenli kareler açıldı — otomatik olarak en yüksek çarpandan öde
            // Aşama 3 — Race condition koruması: tur yalnızca hâlâ 'active' ise
            // sonuçlandırılır; aksi halde ödül eklenmez (çift ödeme önlenir).
            const cashResult = await db.prepare(
                "UPDATE mines_rounds SET revealed = ?, status = 'cashed', payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'"
            ).run(JSON.stringify(newRevealed), potentialPayout, round.id);
            if (cashResult.changes === 0) {
                return NextResponse.json({ error: 'Bu tur zaten sonuçlandırıldı' }, { status: 409 });
            }
            try {
                await creditPoints(db, payload.id, potentialPayout); // changes==0 ise fırlatır → telafi akışı
            } catch (creditErr) {
                console.error('mines/reveal ödül eklenemedi, telafi ediliyor:', creditErr);
                await db.prepare(
                    "UPDATE mines_rounds SET revealed = ?, status = 'active', payout = NULL, ended_at = NULL WHERE id = ?"
                ).run(round.revealed, round.id).catch(() => {});
                return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
            }
            const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);
            return NextResponse.json({
                success: true,
                hitMine: false,
                revealed: newRevealed,
                multiplier,
                potentialPayout,
                cleared: true,
                minePositions,
                remainingPoints: user?.yomi_points ?? 0,
            });
        }

        // Aşama 3 — Race condition koruması: eşzamanlı iki 'reveal' isteğinin
        // birbirinin açtığı kareyi ezmesini önlemek için, güncelleme yalnızca
        // `revealed` alanı okunduğu andaki hâliyle eşleşiyorsa uygulanır
        // (optimistic locking).
        const revealResult = await db.prepare(
            "UPDATE mines_rounds SET revealed = ? WHERE id = ? AND status = 'active' AND revealed = ?"
        ).run(JSON.stringify(newRevealed), round.id, round.revealed);
        if (revealResult.changes === 0) {
            return NextResponse.json({ error: 'Bu kare eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
        }
        return NextResponse.json({
            success: true,
            hitMine: false,
            revealed: newRevealed,
            multiplier,
            potentialPayout,
            cleared: false,
        });
    } catch (err) {
        console.error('mines/reveal POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
