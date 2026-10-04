import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getAllBadges } from '@/lib/badges';
import { createRateLimiter } from '@/lib/ratelimit';

const badgesRateLimit = createRateLimiter(10, 60 * 1000); // 10 istek/dk

// Achievement badge definitions
export const BADGES = [
    // ─── Okuma Rozetleri ───────────────────────────────────────
    { id: 'reader_1',    name: 'İlk Adım',         description: 'İlk bölümünü oku',      icon: 'book',  color: '#6b7280', category: 'reading',    threshold: 1 },
    { id: 'reader_10',   name: 'Manga Tutkunu',     description: '10 bölüm oku',           icon: 'book',  color: '#22c55e', category: 'reading',    threshold: 10 },
    { id: 'reader_50',   name: 'Bölüm Avcısı',      description: '50 bölüm oku',           icon: 'book',  color: '#3b82f6', category: 'reading',    threshold: 50 },
    { id: 'reader_100',  name: 'Yüzler Kulübü',     description: '100 bölüm oku',          icon: 'book',  color: '#a855f7', category: 'reading',    threshold: 100 },
    { id: 'reader_250',  name: 'Sonsuz Okuyucu',    description: '250 bölüm oku',          icon: 'crown', color: '#f97316', category: 'reading',    threshold: 250 },
    { id: 'reader_500',  name: 'Manga Ustası',      description: '500 bölüm oku',          icon: 'crown', color: '#f59e0b', category: 'reading',    threshold: 500 },
    { id: 'reader_1000', name: 'Efsanevi Okuyucu',  description: '1000 bölüm oku',         icon: 'star',  color: '#ef4444', category: 'reading',    threshold: 1000 },
    { id: 'reader_2000', name: 'Asteria Scans İmparatoru',   description: '2000 bölüm oku',         icon: 'star',  color: '#ffd700', category: 'reading',    threshold: 2000 },

    // ─── Yorum Rozetleri ───────────────────────────────────────
    { id: 'commenter_1',   name: 'İlk Yorum',        description: 'İlk yorumunu yap',      icon: 'chat',  color: '#6b7280', category: 'social',     threshold: 1 },
    { id: 'commenter_5',   name: 'Aktif Yorumcu',    description: '5 yorum yap',            icon: 'chat',  color: '#22c55e', category: 'social',     threshold: 5 },
    { id: 'commenter_10',  name: 'Sosyal Kelebek',   description: '10 yorum yap',           icon: 'chat',  color: '#06b6d4', category: 'social',     threshold: 10 },
    { id: 'commenter_50',  name: 'Tartışma Uzmanı',  description: '50 yorum yap',           icon: 'chat',  color: '#a855f7', category: 'social',     threshold: 50 },
    { id: 'commenter_100', name: 'Forum Efsanesi',   description: '100 yorum yap',          icon: 'chat',  color: '#f43f5e', category: 'social',     threshold: 100 },

    // ─── Favori / Koleksiyon Rozetleri ───────────────────────
    { id: 'favorite_1',  name: 'İlk Favori',        description: 'İlk seriyi favorile',    icon: 'heart', color: '#ec4899', category: 'collection', threshold: 1 },
    { id: 'favorite_5',  name: 'Koleksiyoncu',      description: '5 seri favorile',        icon: 'heart', color: '#ec4899', category: 'collection', threshold: 5 },
    { id: 'favorite_20', name: 'Kütüphaneci',       description: '20 seri favorile',       icon: 'heart', color: '#f43f5e', category: 'collection', threshold: 20 },
    { id: 'favorite_50', name: 'Büyük Kütüphane',   description: '50 seri favorile',       icon: 'heart', color: '#be185d', category: 'collection', threshold: 50 },

    // ─── Seri Tamamlama ────────────────────────────────────────
    { id: 'completed_1',  name: 'Seri Bitirici',    description: '1 seri tamamla',         icon: 'check', color: '#10b981', category: 'collection', threshold: 1 },
    { id: 'completed_5',  name: 'Seri Uzmanı',      description: '5 seri tamamla',         icon: 'check', color: '#059669', category: 'collection', threshold: 5 },
    { id: 'completed_10', name: 'Tamamlama Ustası', description: '10 seri tamamla',        icon: 'check', color: '#047857', category: 'collection', threshold: 10 },

    // ─── Giriş / Seri Rozetleri ────────────────────────────────
    { id: 'daily_3',  name: '3 Gün Serisi',         description: '3 gün üst üste giriş yap',   icon: 'sun', color: '#fbbf24', category: 'streak', threshold: 3 },
    { id: 'daily_7',  name: 'Haftalık Kahraman',    description: '7 gün üst üste giriş yap',   icon: 'sun', color: '#f59e0b', category: 'streak', threshold: 7 },
    { id: 'daily_30', name: 'Aylık Kahraman',       description: '30 gün üst üste giriş yap',  icon: 'sun', color: '#f97316', category: 'streak', threshold: 30 },
    { id: 'daily_100',name: 'Efsane Seri',          description: '100 gün üst üste giriş yap', icon: 'sun', color: '#ef4444', category: 'streak', threshold: 100 },

    // ─── Özel Rozetler ─────────────────────────────────────────
    { id: 'early_adopter', name: 'Kurucu Üye',      description: 'İlk 100 kullanıcıdan biri',      icon: 'star',  color: '#eab308', category: 'special', threshold: null },
    { id: 'first_blood',   name: 'İlk Kan',         description: 'İlk kullanıcılardan biri ol',    icon: 'star',  color: '#ef4444', category: 'special', threshold: null },
    { id: 'night_owl',     name: 'Gece Kuşu',       description: 'Gece 00:00-04:00 arası oku',    icon: 'moon',  color: '#818cf8', category: 'special', threshold: null },
    { id: 'bookworm',      name: 'Kitap Kurdu',     description: 'Bir günde 20+ bölüm oku',       icon: 'book',  color: '#06b6d4', category: 'special', threshold: null },
    { id: 'point_100',     name: '100 Puan Kulübü', description: '100 Asteria Scans Puanı kazan',          icon: 'coin',  color: '#f59e0b', category: 'points',  threshold: 100 },
    { id: 'point_500',     name: '500 Puan Kulübü', description: '500 Asteria Scans Puanı kazan',          icon: 'coin',  color: '#f97316', category: 'points',  threshold: 500 },
    { id: 'point_1000',    name: 'Puan Zengini',    description: '1000 Asteria Scans Puanı kazan',         icon: 'coin',  color: '#ffd700', category: 'points',  threshold: 1000 },
];

function getUser(request) {
    return getUserFromRequest(request);
}

// Check and award new badges for a user
export async function checkAndAwardBadges(db, userId) {
    const awarded = [];
    try {
        // Get current stats
        const readCount = (await (db.prepare('SELECT COUNT(*) as c FROM read_history WHERE user_id = ?').get(userId)))?.c || 0;
        const commentCount = (await (db.prepare('SELECT COUNT(*) as c FROM comments WHERE user_id = ?').get(userId)))?.c || 0;
        const favCount = (await (db.prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ?').get(userId)))?.c || 0;
        const completedCount = (await (db.prepare("SELECT COUNT(*) as c FROM reading_lists WHERE user_id = ? AND status = 'completed'").get(userId)))?.c || 0;
        const userRow = await db.prepare('SELECT yomi_points, created_at, login_streak FROM users WHERE id = ?').get(userId);
        const yomiPoints = userRow?.yomi_points || 0;
        const loginStreak = userRow?.login_streak || 0;
        const existingBadges = new Set(await (db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId)).map(b => b.badge_id));

        const tryAward = async (badgeId) => {
            if (!existingBadges.has(badgeId)) {
                await db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
                awarded.push(badgeId);
                existingBadges.add(badgeId);
            }
        };

        // Reading badges
        for (const b of BADGES.filter(b => b.category === 'reading' && b.threshold)) {
            if (readCount >= b.threshold) await tryAward(b.id);
        }
        // Comment badges
        for (const b of BADGES.filter(b => b.category === 'social' && b.threshold)) {
            if (commentCount >= b.threshold) await tryAward(b.id);
        }
        // Favorite badges
        for (const b of BADGES.filter(b => b.id.startsWith('favorite_') && b.threshold)) {
            if (favCount >= b.threshold) await tryAward(b.id);
        }
        // Completed series badges
        for (const b of BADGES.filter(b => b.id.startsWith('completed_') && b.threshold)) {
            if (completedCount >= b.threshold) await tryAward(b.id);
        }
        // Login streak badges
        for (const b of BADGES.filter(b => b.id.startsWith('daily_') && b.threshold)) {
            if (loginStreak >= b.threshold) await tryAward(b.id);
        }
        // Points badges
        for (const b of BADGES.filter(b => b.category === 'points' && b.threshold)) {
            if (yomiPoints >= b.threshold) await tryAward(b.id);
        }

        // Special badges
        // Early adopter: first 100 users
        const userNum = (await (db.prepare('SELECT COUNT(*) as c FROM users WHERE id <= ?').get(userId)))?.c || 0;
        if (userNum <= 100) await tryAward('early_adopter');
        // First blood: first 10 users
        if (userNum <= 10) await tryAward('first_blood');

        // Bookworm: read 20+ chapters in a single day
        const today = new Date().toISOString().split('T')[0];
        const todayRead = (await (db.prepare(
            `SELECT COUNT(*) as c FROM read_history WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
        ).get(userId, today, today)))?.c || 0;
        if (todayRead >= 20) await tryAward('bookworm');

        // Night owl: reading between 00:00-04:00
        const nowHour = new Date().getHours();
        if (nowHour >= 0 && nowHour < 4 && readCount > 0) await tryAward('night_owl');

    } catch (e) { /* silent */ }
    return awarded;
}

// GET /api/users/badges — get user's badges
export async function GET(request) {
    // Rate limit kontrolü
    const rl = await badgesRateLimit(request);
    if (!rl.success) {
        return NextResponse.json(
            { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
            { status: 429 }
        );
    }

    const user = getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    try {
        // Auto-check and award new badges
        const newBadges = await checkAndAwardBadges(db, user.id);

        const earned = await db.prepare('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC').all(user.id);
        const earnedIds = new Set(earned.map(b => b.badge_id));
        const earnedMap = Object.fromEntries(earned.map(b => [b.badge_id, b.earned_at]));

        const result = BADGES.map(b => ({
            ...b,
            earned: earnedIds.has(b.id),
            earned_at: earnedMap[b.id] || null,
            is_new: newBadges.includes(b.id),
        }));

        // Admin-assigned custom badges (static BADGE_OPTIONS + DB-defined custom badges)
        const customBadges = (await getAllBadges(db))
            .filter(b => earnedIds.has(b.id))
            .map(b => ({ ...b, earned: true, earned_at: earnedMap[b.id] || null, is_new: newBadges.includes(b.id), category: 'custom' }));

        return NextResponse.json({ badges: result, newBadges, customBadges });
    } catch (err) {
        console.error('GET /api/users/badges error:', err);
        const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
