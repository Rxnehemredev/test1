import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { getAllBadges, getBadgePriorityOrder, saveBadgePriorityOrder } from '@/lib/badges';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);

async function requireAdmin(request, db) {
    const result = await getVerifiedUser(request, db);
    if (result.error) return { error: result.error, status: result.status };
    if (!await hasAdminPanelAccess(result.user, db)) return { error: 'Yetkisiz', status: 403 };
    return { user: result.user };
}

// GET: returns the current priority order (array of badge ids, most-important-first).
// If never customized, returns the default order (built-in badges, then custom ones).
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const saved = await getBadgePriorityOrder(db);
        if (saved.length > 0) return NextResponse.json({ success: true, order: saved });

        const all = await getAllBadges(db);
        return NextResponse.json({ success: true, order: all.map(b => b.id) });
    } catch (err) {
        console.error('badge-priority GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: save a new priority order.
// Body: { order: [badgeId, ...] } — most-important-first.
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const auth = await requireAdmin(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await request.json();
        const { order } = body;
        if (!Array.isArray(order) || order.some(id => typeof id !== 'string')) {
            return NextResponse.json({ error: 'order bir string dizisi olmalı' }, { status: 400 });
        }

        // Sadece gerçekten var olan rozet id'lerini kabul et (kirli veri gelmesin)
        const validIds = new Set((await getAllBadges(db)).map(b => b.id));
        const cleanedOrder = order.filter(id => validIds.has(id));

        await saveBadgePriorityOrder(db, cleanedOrder);
        return NextResponse.json({ success: true, message: 'Rozet sıralaması kaydedildi', order: cleanedOrder });
    } catch (err) {
        console.error('badge-priority POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
