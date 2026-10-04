import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { shuffledDeck } from '@/lib/blackjack-fairness';
import { isBlackjack, BJ_MIN_BET, BJ_MAX_BET, BJ_BLACKJACK_PAYOUT } from '@/lib/blackjack';
import { createRateLimiter } from '@/lib/ratelimit';
import { debitPoints, refundPoints, isUniqueViolation } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { betAmount } — bahsi düş, deste karıştır, 2'şer kart dağıt
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < BJ_MIN_BET || bet > BJ_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${BJ_MIN_BET} ile ${BJ_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const [user, existingActive] = await Promise.all([
            db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id),
            db.prepare("SELECT id FROM blackjack_rounds WHERE user_id = ? AND status = 'active' LIMIT 1").get(payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if (existingActive) return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
        if ((user.yomi_points || 0) < bet) return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });

        // Aşama 3 — Race condition koruması: bahis düşüşü, güncel bakiyeyi tekrar
        // kontrol eden atomik/koşullu bir UPDATE ile yapılır (WHERE yomi_points >= ?).
        // Önceki kodda bakiye yalnızca yukarıdaki (bayat olabilecek) SELECT ile
        // kontrol ediliyor, düşüş ise koşulsuz yapılıyordu; aynı kullanıcıdan
        // eşzamanlı gelen birden fazla istek aynı bakiyeyi görüp hepsi geçebiliyor
        // ve bakiye eksiye düşebiliyordu. Artık düşüş, veritabanının o anki satır
        // durumuna göre tek sorguda ve atomik olarak değerlendiriliyor.
        if (!await debitPoints(db, user.id, bet)) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const deck = shuffledDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const playerBJ = isBlackjack(playerHand);
        const dealerBJ = isBlackjack(dealerHand);

        let status = 'active';
        let payout = null;
        if (playerBJ && dealerBJ) { status = 'push'; payout = bet; }
        else if (playerBJ) { status = 'blackjack'; payout = Math.floor(bet * BJ_BLACKJACK_PAYOUT); }
        else if (dealerBJ) { status = 'dealer_blackjack'; payout = 0; }

        const resolved = status !== 'active';

        try {
            const queries = [
                {
                    sql: "INSERT INTO blackjack_rounds (user_id, bet_amount, deck, player_hand, dealer_hand, status, payout" + (resolved ? ', ended_at' : '') + ") VALUES (?, ?, ?, ?, ?, ?, ?" + (resolved ? ', CURRENT_TIMESTAMP' : '') + ")",
                    args: [user.id, bet, JSON.stringify(deck), JSON.stringify(playerHand), JSON.stringify(dealerHand), status, payout],
                },
            ];
            if (resolved && payout > 0) queries.push({ sql: 'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?', args: [payout, user.id] });

            const results = await db.batch(queries);
            const insertResult = results[0];
            // Peşin biten tur (blackjack/push) ödemesi batch'in 2. adımıdır — etkilenen satır doğrulanır.
            if (resolved && payout > 0 && !(results[1]?.changes > 0)) {
                console.error(`[points] blackjack/start ödeme satırı etkilenmedi user=${user.id} payout=${payout}`);
            }

            const fresh = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(user.id);

            return NextResponse.json({
                success: true,
                roundId: insertResult.lastInsertRowid,
                betAmount: bet,
                playerHand,
                dealerHand: resolved ? dealerHand : [dealerHand[0]],
                dealerHiddenCount: resolved ? 0 : 1,
                status,
                payout,
                remainingPoints: fresh?.yomi_points ?? ((user.yomi_points || 0) - bet + (resolved ? (payout || 0) : 0)),
            });
        } catch (innerErr) {
            // Tur oluşturulamadıysa, atomik olarak düşülen bahsi iade et
            await refundPoints(db, user.id, bet, 'blackjack_rounds insert hatası iadesi');
            // Kullanıcı başına tek aktif tur kısmi UNIQUE index'i (migration 10) ihlali
            if (isUniqueViolation(innerErr)) {
                return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
            }
            throw innerErr;
        }
    } catch (err) {
        console.error('blackjack/start POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
