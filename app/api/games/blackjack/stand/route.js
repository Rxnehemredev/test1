import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { dealerPlay, handValue, isBust, BJ_WIN_PAYOUT } from '@/lib/blackjack';
import { createRateLimiter } from '@/lib/ratelimit';
import { creditPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { roundId } — oyuncu durur, krupiye 17'ye kadar kart çeker, sonuç belirlenir
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId } = await request.json();
        if (!Number.isInteger(Number(roundId))) return NextResponse.json({ error: 'Geçersiz tur' }, { status: 400 });
        const round = await db.prepare("SELECT * FROM blackjack_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        if (!round) return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const deck = JSON.parse(round.deck);
        const playerHand = JSON.parse(round.player_hand);
        let dealerHand = JSON.parse(round.dealer_hand);

        dealerHand = dealerPlay(deck, dealerHand);

        const playerVal = handValue(playerHand).value;
        const dealerVal = handValue(dealerHand).value;

        let status, payout;
        if (isBust(dealerHand)) { status = 'won'; payout = Math.floor(round.bet_amount * BJ_WIN_PAYOUT); }
        else if (playerVal > dealerVal) { status = 'won'; payout = Math.floor(round.bet_amount * BJ_WIN_PAYOUT); }
        else if (playerVal < dealerVal) { status = 'lost'; payout = 0; }
        else { status = 'push'; payout = round.bet_amount; }

        // Aşama 3 — Race condition koruması: tur yalnızca hâlâ 'active' durumundaysa
        // VE deck okunduğu andaki hâliyle eşleşiyorsa sonuçlandırılır (optimistic
        // locking, bkz. blackjack/hit'te eklenen aynı koruma). Böylece aynı tur için
        // eşzamanlı gönderilen bir 'hit' + 'stand' çifti ya da iki 'stand' isteğinden
        // yalnızca biri sonucu işleyip ödülü ekleyebilir; diğeri 0 satır etkileyip
        // güvenle reddedilir (çift ödeme veya tutarsız deste durumu önlenir).
        const updateResult = await db.prepare(
            "UPDATE blackjack_rounds SET deck = ?, dealer_hand = ?, status = ?, payout = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active' AND deck = ?"
        ).run(JSON.stringify(deck), JSON.stringify(dealerHand), status, payout, round.id, round.deck);

        if (updateResult.changes === 0) {
            return NextResponse.json({ error: 'Bu tur eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
        }

        if (payout > 0) {
            try {
                await creditPoints(db, payload.id, payout); // changes==0 ise fırlatır → telafi akışı
            } catch (creditErr) {
                // Ödül eklenemedi — turu 'active' durumuna geri alıp bahsi iade
                // etmeye çalış, böylece kullanıcı ne parasını ne turunu kaybetmesin.
                console.error('blackjack/stand ödül eklenemedi, telafi ediliyor:', creditErr);
                await db.prepare(
                    "UPDATE blackjack_rounds SET status = 'active', payout = NULL, ended_at = NULL WHERE id = ?"
                ).run(round.id).catch(() => {});
                return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
            }
        }

        const user = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(payload.id);

        return NextResponse.json({
            success: true,
            playerHand,
            dealerHand,
            dealerHiddenCount: 0,
            status,
            payout,
            remainingPoints: user?.yomi_points ?? 0,
        });
    } catch (err) {
        console.error('blackjack/stand POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
