export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { toPublicUser } from '@/lib/security/publicUser';

const userProfileRateLimit = createRateLimiter(20, 60 * 1000); // 20 istek/dk

// GET /api/users/[username] — Herkes tarafından görüntülenebilir
// Kullanıcı profil bilgilerini getirir (özet görünüm)
export async function GET(request, { params }) {
    try {
        // Rate limit kontrolü
        const rl = await userProfileRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const { username } = await params;
        if (!username) {
            return NextResponse.json({ error: 'Kullanıcı adı gerekli' }, { status: 400 });
        }

        const db = await getDb();

        // Kullanıcıyı bul
        const targetUser = await db.prepare(`
            SELECT id, username, avatar_url, role, yomi_points, created_at
            FROM users
            WHERE username = ?
        `).get(username);

        if (!targetUser) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
        }

        // İstatistikler - tek sorguda birleştir
        const stats = await db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM favorites WHERE user_id = ?) as favoriteCount,
                (SELECT COUNT(*) FROM comments WHERE user_id = ?) as commentCount,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = ?) as badgeCount
        `).get(targetUser.id, targetUser.id, targetUser.id);

        // Yorumlar
        const recentComments = await db.prepare(`
            SELECT c.id, c.content, c.created_at, s.title as series_title, s.id as series_id, s.slug as series_slug, ch.chapter_number
            FROM comments c
            LEFT JOIN series s ON c.series_id = s.id
            LEFT JOIN chapters ch ON c.chapter_id = ch.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT 30
        `).all(targetUser.id);

        // Favori listesi
        const favorites = await db.prepare(`
            SELECT s.id, s.title, s.cover_url, s.slug, s.status, s.type, s.rating
            FROM favorites f
            LEFT JOIN series s ON f.series_id = s.id
            WHERE f.user_id = ? AND s.published = 1
            ORDER BY f.created_at DESC
            LIMIT 50
        `).all(targetUser.id);

        // Okuma listesi
        const readingList = await db.prepare(`
            SELECT rl.status, s.id, s.title, s.cover_url, s.slug, s.status as series_status, s.type
            FROM reading_lists rl
            LEFT JOIN series s ON rl.series_id = s.id
            WHERE rl.user_id = ? AND s.published = 1
            ORDER BY rl.updated_at DESC
            LIMIT 100
        `).all(targetUser.id);

        // Profil kapak ve banner görseli de dahil et
        const fullUser = await db.prepare('SELECT cover_url, bio FROM users WHERE id = ?').get(targetUser.id);

        return NextResponse.json({
            success: true,
            user: toPublicUser({
                ...targetUser,
                cover_url: fullUser?.cover_url || null,
                bio: fullUser?.bio || null,
                favoriteCount: stats?.favoriteCount || 0,
                commentCount: stats?.commentCount || 0,
                badgeCount: stats?.badgeCount || 0,
            }),
            recentComments,
            favorites,
            readingList,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json({ error: 'Profil yüklenemedi' }, { status: 500 });
    }
}