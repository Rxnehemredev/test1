import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateMinePositions } from '@/lib/mines-fairness';
import { MINES_GRID_SIZE, MINES_MINE_COUNT, MINES_MIN_BET, MINES_MAX_BET } from '@/lib/mines';
import { createRateLimiter } from '@/lib/ratelimit';
import { debitPoints, refundPoints, isUniqueViolation } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { betAmount } — bahsi düş, yeni tur başlat (mayınlar gizli)
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < MINES_MIN_BET || bet > MINES_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${MINES_MIN_BET} ile ${MINES_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const [user, existingActive] = await Promise.all([
            db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id),
            db.prepare("SELECT id FROM mines_rounds WHERE user_id = ? AND status = 'active' LIMIT 1").get(payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if (existingActive) return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
        if ((user.yomi_points || 0) < bet) return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });

        // Aşama 3 — Race condition koruması: bahis düşüşü, güncel bakiyeyi tekrar
        // kontrol eden atomik/koşullu bir UPDATE ile yapılır (bkz. blackjack/start
        // için eklenen aynı korumanın gerekçesi).
        if (!await debitPoints(db, user.id, bet)) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const minePositions = generateMinePositions(MINES_GRID_SIZE, MINES_MINE_COUNT);
        let insertResult;
        try {
            insertResult = await db.prepare(
                "INSERT INTO mines_rounds (user_id, bet_amount, grid_size, mine_count, mine_positions, revealed, status) VALUES (?, ?, ?, ?, ?, '[]', 'active')"
            ).run(user.id, bet, MINES_GRID_SIZE, MINES_MINE_COUNT, JSON.stringify(minePositions));
        } catch (innerErr) {
            // Tur oluşturulamadıysa, atomik olarak düşülen bahsi iade et
            await refundPoints(db, user.id, bet, 'mines_rounds insert hatası iadesi');
            // Kullanıcı başına tek aktif tur kısmi UNIQUE index'i (migration 10): eşzamanlı
            // ikinci /start isteği burada yakalanır.
            if (isUniqueViolation(innerErr)) {
                return NextResponse.json({ error: 'Zaten devam eden bir turunuz var' }, { status: 400 });
            }
            throw innerErr;
        }

        const fresh = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(user.id);

        return NextResponse.json({
            success: true,
            roundId: insertResult.lastInsertRowid,
            gridSize: MINES_GRID_SIZE,
            mineCount: MINES_MINE_COUNT,
            betAmount: bet,
            remainingPoints: fresh?.yomi_points ?? ((user.yomi_points || 0) - bet),
        });
    } catch (err) {
        console.error('mines/start POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
