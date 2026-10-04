import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isBust } from '@/lib/blackjack';
import { createRateLimiter } from '@/lib/ratelimit';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { roundId } — oyuncuya bir kart daha çektir
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { roundId } = await request.json();
        if (!Number.isInteger(Number(roundId))) return NextResponse.json({ error: 'Geçersiz tur' }, { status: 400 });
        const round = await db.prepare("SELECT * FROM blackjack_rounds WHERE id = ? AND user_id = ? AND status = 'active'").get(roundId, payload.id);
        // Sorgu zaten status='active' filtreler; savunma katmanı olarak durum açıkça da doğrulanır.
        // Tek-instance garantisi: kullanıcı başına tek aktif tur (kısmi UNIQUE index, migration 10)
        // + aşağıdaki UPDATE'lerde `status='active' AND deck = <okunan deck>` iyimser kilidi.
        if (!round || round.status !== 'active') return NextResponse.json({ error: 'Aktif bir turunuz yok' }, { status: 400 });

        const deck = JSON.parse(round.deck);
        const playerHand = JSON.parse(round.player_hand);
        const dealerHand = JSON.parse(round.dealer_hand);

        if (deck.length === 0) return NextResponse.json({ error: 'Deste tükendi' }, { status: 400 });
        playerHand.push(deck.pop());

        // Aşama 3 — Race condition koruması: mines/reveal'daki ile aynı desen.
        // Önceki kodda bu UPDATE koşulsuzdu (sadece id ile) — aynı tur için
        // eşzamanlı iki 'hit' isteği aynı deck/player_hand'i okuyup her ikisi de
        // kart çekebiliyor, ikincisi birincinin yazdığı kartı eziyordu (kayıp
        // güncelleme / kart çiftlenmesi). Artık güncelleme yalnızca satır hâlâ
        // 'active' VE deck okunduğu andaki hâliyle eşleşiyorsa uygulanır
        // (optimistic locking + durum kontrolü).
        if (isBust(playerHand)) {
            const bustResult = await db.prepare(
                "UPDATE blackjack_rounds SET deck = ?, player_hand = ?, status = 'lost', payout = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active' AND deck = ?"
            ).run(JSON.stringify(deck), JSON.stringify(playerHand), round.id, round.deck);
            if (bustResult.changes === 0) {
                return NextResponse.json({ error: 'Bu tur eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
            }
            return NextResponse.json({
                success: true,
                playerHand,
                dealerHand,
                dealerHiddenCount: 0,
                status: 'lost',
                payout: 0,
                bust: true,
            });
        }

        const hitResult = await db.prepare(
            'UPDATE blackjack_rounds SET deck = ?, player_hand = ? WHERE id = ? AND status = \'active\' AND deck = ?'
        ).run(JSON.stringify(deck), JSON.stringify(playerHand), round.id, round.deck);
        if (hitResult.changes === 0) {
            return NextResponse.json({ error: 'Bu tur eşzamanlı bir istekle işlendi, lütfen tekrar deneyin.' }, { status: 409 });
        }

        return NextResponse.json({
            success: true,
            playerHand,
            dealerHand: [dealerHand[0]],
            dealerHiddenCount: 1,
            status: 'active',
        });
    } catch (err) {
        console.error('blackjack/hit POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
