import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const rateLimiter = createRateLimiter(20, 60 * 1000); // 20 req/min

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// POST /api/users/site-stay — Add site stay minutes (called by frontend heartbeat)
export async function POST(request) {
    const rl = await rateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
            status: 429, headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const body = await request.json();
        const minutes = parseInt(body?.minutes) || 1;
        if (minutes < 1 || minutes > 5) {
            return NextResponse.json({ error: 'Invalid minutes value' }, { status: 400 });
        }

        const today = getTodayStr();

        // Upsert site stay progress for today
        await db.prepare(`
            INSERT INTO quest_progress (user_id, quest_id, progress, completed, claimed, quest_date)
            VALUES (?, 'site_stay_tracker', ?, 0, 0, ?)
            ON CONFLICT(user_id, quest_id, quest_date) DO UPDATE SET
                progress = MIN(progress + ?, 60)
        `).run(user.id, minutes, today, minutes);

        const row = await db.prepare(
            `SELECT progress FROM quest_progress WHERE user_id = ? AND quest_id = 'site_stay_tracker' AND quest_date = ?`
        ).get(user.id, today);

        return NextResponse.json({ success: true, totalMinutes: row?.progress || 0 });
    } catch (error) {
        console.error('POST /api/users/site-stay error:', error);
        return NextResponse.json({ error: 'Failed to update site stay' }, { status: 500 });
    }
}