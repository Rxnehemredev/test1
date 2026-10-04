import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, generateToken, setSessionCookie } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // Fetch full profile (getVerifiedUser returns a lighter subset)
        const user = await db.prepare(
            'SELECT id, username, email, display_name, avatar_url, cover_url, role, yomi_points, last_daily_login, last_avatar_update, last_cover_update, avatar_changes_today, cover_changes_today, created_at FROM users WHERE id = ?'
        ).get(result.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Issue a fresh token so the client always has a non-stale one after restore
        const token = generateToken(user);
        return setSessionCookie(NextResponse.json({ user }), token);
    } catch (error) {
        console.error('GET /api/auth/me error:', error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}