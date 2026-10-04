import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { spinWheel } from '@/lib/wheel-fairness';
import { WHEEL_SEGMENTS, WHEEL_MIN_BET, WHEEL_MAX_BET } from '@/lib/wheel';
import { createRateLimiter } from '@/lib/ratelimit';
import { refundPoints } from '@/lib/points';
const gameLimiter = createRateLimiter(60, 60000);


// POST: { betAmount } — bahsi düş, çarkı çevir, sonucu anında öde
export async function POST(request) {
    { const __rl = await gameLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { betAmount } = await request.json();
        const bet = Math.round(Number(betAmount));
        if (!Number.isFinite(bet) || bet < WHEEL_MIN_BET || bet > WHEEL_MAX_BET) {
            return NextResponse.json({ error: `Bahis ${WHEEL_MIN_BET} ile ${WHEEL_MAX_BET} arasında olmalı` }, { status: 400 });
        }

        const user = await db.prepare('SELECT id, yomi_points, banned_until FROM users WHERE id = ?').get(payload.id);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if ((user.yomi_points || 0) < bet) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        const segmentIndex = spinWheel();
        const seg = WHEEL_SEGMENTS[segmentIndex];
        const payout = Math.floor(bet * seg.multiplier);
        const net = payout - bet;

        // Aşama 3 — Race condition koruması: bakiye güncellemesi, güncel bakiyeyi
        // tekrar kontrol eden atomik/koşullu bir UPDATE ile yapılır (bkz.
        // slots/spin için eklenen aynı korumanın gerekçesi).
        const updateResult = await db.prepare(
            'UPDATE users SET yomi_points = yomi_points + ? WHERE id = ? AND yomi_points >= ?'
        ).run(net, user.id, bet);
        if (updateResult.changes === 0) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        try {
            await db.prepare(
                'INSERT INTO wheel_spins (user_id, bet_amount, segment_index, multiplier, payout) VALUES (?, ?, ?, ?, ?)'
            ).run(user.id, bet, segmentIndex, seg.multiplier, payout);
        } catch (logErr) {
            // Aşama 3 — Race condition koruması: log kaydı başarısız olursa artık
            // sessizce yutulmuyor; az önce uygulanan bakiye değişikliği geri
            // alınıp (telafi) isteğin tamamı başarısız olarak dönülüyor.
            console.error('wheel_spins insert error, bakiye telafi ediliyor:', logErr);
            // net negatifse bakiye geri eklenir (net = -bet + payout); atomik bakiye değişimini tersine çevir.
            if (net >= 0) await db.prepare('UPDATE users SET yomi_points = yomi_points - ? WHERE id = ? AND yomi_points >= ?').run(net, user.id, net).catch((e) => console.error('[points] wheel telafi başarısız:', e?.message));
            else await refundPoints(db, user.id, -net, 'wheel_spins log hatası telafisi');
            return NextResponse.json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, { status: 500 });
        }

        const fresh = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(user.id);

        return NextResponse.json({
            success: true,
            segmentIndex,
            multiplier: seg.multiplier,
            payout,
            remainingPoints: fresh?.yomi_points ?? ((user.yomi_points || 0) + net),
        });
    } catch (err) {
        console.error('wheel/spin POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
