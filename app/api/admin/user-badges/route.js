import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';
import { getAllBadges } from '@/lib/badges';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


async function getDeletedBuiltinIds(db) {
    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'deleted_builtin_badges'").get();
        if (!row?.setting_value) return [];
        return JSON.parse(row.setting_value);
    } catch { return []; }
}

async function getAllActiveBadges(db) {
    const deleted = await getDeletedBuiltinIds(db);
    return (await getAllBadges(db)).filter(b => !deleted.includes(b.id));
}

// GET: Fetch badges for a user (?userId=xxx)
// Also returns all badge options (built-in + custom) if no userId provided
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user: adminUser } = result;
        if (!await hasAdminPanelAccess(adminUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const allBadges = await getAllActiveBadges(db);

        if (!userId) {
            return NextResponse.json({ success: true, badgeOptions: allBadges });
        }

        const badges = await db.prepare(
            'SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at ASC'
        ).all(userId);

        return NextResponse.json({ success: true, badges, badgeOptions: allBadges });
    } catch (error) {
        console.error('user-badges GET error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: Add a badge to a user
// Body: { action: 'add', userId, badgeId }
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user: adminUser } = result;
        if (!await hasAdminPanelAccess(adminUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const body = await request.json();
        const { action, userId, badgeId } = body;

        if (!userId || !badgeId) {
            return NextResponse.json({ error: 'userId ve badgeId gerekli' }, { status: 400 });
        }

        const validBadge = (await getAllActiveBadges(db)).find(b => b.id === badgeId);
        if (!validBadge) {
            return NextResponse.json({ error: 'Geçersiz rozet ID' }, { status: 400 });
        }

        const targetUser = await db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId);
        if (!targetUser) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        // Managers cannot assign badges to admin accounts
        if (adminUser.role === 'manager' && targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Yetkisiz: Admin kullanıcıları yönetemezsiniz' }, { status: 403 });
        }

        if (action === 'add') {
            await db.prepare(
                'INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)'
            ).run(userId, badgeId);

            return NextResponse.json({ success: true, message: `"${validBadge.label}" rozeti "${targetUser.username}" kullanıcısına eklendi` });
        }

        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    } catch (error) {
        console.error('user-badges POST error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// DELETE: Remove a badge from a user (?userId=xxx&badgeId=xxx)
export async function DELETE(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user: adminUser } = result;
        if (!await hasAdminPanelAccess(adminUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const badgeId = searchParams.get('badgeId');

        if (!userId || !badgeId) {
            return NextResponse.json({ error: 'userId ve badgeId gerekli' }, { status: 400 });
        }

        const targetUser = await db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId);
        if (!targetUser) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        // Managers cannot remove badges from admin accounts
        if (adminUser.role === 'manager' && targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Yetkisiz: Admin kullanıcıları yönetemezsiniz' }, { status: 403 });
        }

        await db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?').run(userId, badgeId);

        return NextResponse.json({ success: true, message: 'Rozet kaldırıldı' });
    } catch (error) {
        console.error('user-badges DELETE error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
