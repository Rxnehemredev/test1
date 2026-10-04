import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { spinSlots } from '@/lib/slots-fairness';
import { calcSlotMultiplier, SLOT_MIN_BET, SLOT_MAX_BET } from '@/lib/slots';
import { createRateLimiter } from '@/lib/ratelimit';
import { refundPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { betAmount } — bahsi düş, makaraları çevir, sonucu anında öde
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < SLOT_MIN_BET || bet > SLOT_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${SLOT_MIN_BET} ile ${SLOT_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const user = await db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if ((user.yomi_points || 0) < bet) return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });

        const symbols = spinSlots();
        const multiplier = calcSlotMultiplier(symbols);
        const payout = Math.floor(bet * multiplier);
        const net = payout - bet;

        // Aşama 3 — Race condition koruması: bakiye güncellemesi, güncel bakiyeyi
        // tekrar kontrol eden atomik/koşullu bir UPDATE ile yapılır
        // (WHERE yomi_points >= ?). Önceki kodda bakiye yalnızca yukarıdaki
        // (bayat olabilecek) SELECT ile kontrol ediliyordu; eşzamanlı istekler
        // aynı bakiyeyi görüp bakiyeyi eksiye düşürebiliyordu.
        const updateResult = await db.prepare(
            'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ? AND yomi_points >= ?'
        ).run(net, user.id, bet);
        if (updateResult.changes === 0) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        try {
            await db.prepare(
                'INSERT INTO slot_spins (user_id, bet_amount, symbols, payout) VALUES (?, ?, ?, ?)'
            ).run(user.id, bet, JSON.stringify(symbols), payout);
        } catch (logErr) {
            // Aşama 3 — Race condition koruması: log kaydı başarısız olursa artık
            // sessizce yutulmuyor; az önce uygulanan bakiye değişikliği geri
            // alınıp (telafi) isteğin tamamı başarısız olarak dönülüyor. Böylece
            // "bakiye + sonuç + log tek işlem" garantisi, gerçek bir DB hatası
            // durumunda da bozulmamış olur.
            console.error('slot_spins insert error, bakiye telafi ediliyor:', logErr);
            if (net >= 0) await db.prepare('UPDATE users SET yomi_points = yomi_points - ? WHERE id = ? AND yomi_points >= ?').run(net, user.id, net).catch((e) => console.error('[points] slots telafi başarısız:', e?.message));
            else await refundPoints(db, user.id, -net, 'slot_spins log hatası telafisi');
            return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
        }

        const fresh = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(user.id);

        return NextResponse.json({
            success: true,
            symbols,
            multiplier,
            payout,
            remainingPoints: fresh?.yomi_points ?? ((user.yomi_points || 0) + net),
        });
    } catch (err) {
        console.error('slots/spin POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
