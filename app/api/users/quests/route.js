import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

const getRateLimiter  = createRateLimiter(30, 60 * 1000); // 30 req/min
const postRateLimiter = createRateLimiter(10, 60 * 1000); // 10 req/min

const QUESTS = [
    // Okuma görevleri
    { id: 'read_3',           title: 'Hevesli Okuyucu',    desc: 'Bugün 3 farklı bölüm oku',                          icon: 'book',    target: 3,   reward: 30 },
    { id: 'read_5',           title: 'Okuma Maratonu',      desc: 'Bugün 5 farklı bölüm oku',                          icon: 'book',    target: 5,   reward: 60 },
    { id: 'read_10',          title: 'Bölüm Canavarı',      desc: 'Bugün 10 farklı bölüm oku',                         icon: 'book',    target: 10,  reward: 120 },

    // Yorum görevleri
    { id: 'comment_1',        title: 'Sosyal Kelebek',      desc: 'Herhangi bir bölüm veya seriye yorum bırak',        icon: 'chat',    target: 1,   reward: 15 },
    { id: 'comment_3',        title: 'Aktif Yorumcu',       desc: 'Bugün 3 yorum yap',                                 icon: 'chat',    target: 3,   reward: 40 },
    { id: 'long_comment',     title: 'Derin Düşünür',       desc: 'En az 30 karakter içeren bir yorum yaz',            icon: 'pen',     target: 1,   reward: 25 },
    { id: 'long_comment_3',   title: 'Kaliteli İçerik',     desc: 'Bugün 3 adet uzun yorum yaz (30+ karakter)',        icon: 'pen',     target: 3,   reward: 50 },

    // Site kalma görevleri
    { id: 'site_visit',       title: 'Günlük Ziyaret',      desc: 'Bugün siteyi ziyaret et',                           icon: 'sun',     target: 1,   reward: 10 },
    { id: 'site_stay_5',      title: 'Sadık Ziyaretçi',     desc: 'Sitede bugün 5 dakika kal',                         icon: 'sun',     target: 5,   reward: 20 },
    { id: 'site_stay_15',     title: 'Derin Dalış',         desc: 'Sitede bugün 15 dakika kal',                        icon: 'sun',     target: 15,  reward: 45 },
    { id: 'site_stay_30',     title: 'Asteria Scans Bağımlısı',      desc: 'Sitede bugün 30 dakika kal',                        icon: 'sun',     target: 30,  reward: 80 },

    // Favori / liste görevleri
    { id: 'add_favorite',     title: 'Kütüphaneci',         desc: 'Herhangi bir seriyi favorilerine ekle',             icon: 'star',    target: 1,   reward: 15 },
];

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

export async function GET(request) {
    const rl = await getRateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
            status: 429, headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db  = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const today = getTodayStr();

        // Single-query progress fetch (no N+1)
        const chaptersToday = (await (db.prepare(
            `SELECT COUNT(*) as cnt FROM read_history WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
        ).get(user.id, today, today)))?.cnt || 0;

        const commentsToday = (await (db.prepare(
            `SELECT COUNT(*) as cnt FROM comments WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
        ).get(user.id, today, today)))?.cnt || 0;

        const longCommentToday = (await (db.prepare(
            `SELECT COUNT(*) as cnt FROM comments WHERE user_id = ? AND LENGTH(content) >= 30 AND created_at >= ? AND created_at < date(?, '+1 day')`
        ).get(user.id, today, today)))?.cnt || 0;

        // Site stay minutes stored in quest_progress with special handling
        const siteStayRow = await db.prepare(
            `SELECT progress FROM quest_progress WHERE user_id = ? AND quest_id = 'site_stay_tracker' AND quest_date = ?`
        ).get(user.id, today);
        const siteStayMinutes = siteStayRow?.progress || 0;

        // Favorites added today
        const favoritesToday = (await (db.prepare(
            `SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
        ).get(user.id, today, today)))?.cnt || 0;

        // Fetch all quest claim records for today in one query
        const claimedRows = await db.prepare(
            `SELECT quest_id, claimed FROM quest_progress WHERE user_id = ? AND quest_date = ?`
        ).all(user.id, today);
        const claimMap = Object.fromEntries(claimedRows.map(r => [r.quest_id, r.claimed === 1]));

        const progressMap = {
            read_3:         chaptersToday,
            read_5:         chaptersToday,
            read_10:        chaptersToday,
            comment_1:      commentsToday,
            comment_3:      commentsToday,
            long_comment:   longCommentToday,
            long_comment_3: longCommentToday,
            site_visit:     1, // auto-complete on page visit
            site_stay_5:    siteStayMinutes,
            site_stay_15:   siteStayMinutes,
            site_stay_30:   siteStayMinutes,
            add_favorite:   favoritesToday,
        };

        const quests = QUESTS.map(q => ({
            ...q,
            progress:  Math.min(progressMap[q.id] || 0, q.target),
            completed: (progressMap[q.id] || 0) >= q.target,
            claimed:   claimMap[q.id] || false,
        }));

        return NextResponse.json({ quests });
    } catch (error) {
        console.error('GET /api/users/quests error:', error);
        return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }
}

export async function POST(request) {
    const rl = await postRateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
            status: 429, headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db  = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;

        const body = await request.json();
        const { questId } = body || {};
        if (!questId) return NextResponse.json({ error: 'questId required' }, { status: 400 });

        const quest = QUESTS.find(q => q.id === questId);
        if (!quest)  return NextResponse.json({ error: 'Invalid quest' }, { status: 400 });

        const today = getTodayStr();

        // Check if already claimed (atomic check in transaction)
        const tx = db.transaction(async () => {
            const existing = await db.prepare(
                'SELECT claimed FROM quest_progress WHERE user_id = ? AND quest_id = ? AND quest_date = ?'
            ).get(user.id, questId, today);

            if (existing?.claimed === 1) return { alreadyClaimed: true };

            // Verify completion
            let progress = 0;
            if (questId === 'read_3' || questId === 'read_5' || questId === 'read_10') {
                progress = (await (db.prepare(
                    `SELECT COUNT(*) as cnt FROM read_history WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
                ).get(user.id, today, today)))?.cnt || 0;
            } else if (questId === 'comment_1' || questId === 'comment_3') {
                progress = (await (db.prepare(
                    `SELECT COUNT(*) as cnt FROM comments WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
                ).get(user.id, today, today)))?.cnt || 0;
            } else if (questId === 'long_comment' || questId === 'long_comment_3') {
                progress = (await (db.prepare(
                    `SELECT COUNT(*) as cnt FROM comments WHERE user_id = ? AND LENGTH(content) >= 30 AND created_at >= ? AND created_at < date(?, '+1 day')`
                ).get(user.id, today, today)))?.cnt || 0;
            } else if (questId === 'site_visit') {
                progress = 1; // always complete on visit
            } else if (questId === 'site_stay_5' || questId === 'site_stay_15' || questId === 'site_stay_30') {
                const row = await db.prepare(
                    `SELECT progress FROM quest_progress WHERE user_id = ? AND quest_id = 'site_stay_tracker' AND quest_date = ?`
                ).get(user.id, today);
                progress = row?.progress || 0;
            } else if (questId === 'add_favorite') {
                progress = (await (db.prepare(
                    `SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ? AND created_at >= ? AND created_at < date(?, '+1 day')`
                ).get(user.id, today, today)))?.cnt || 0;
            }

            if (progress < quest.target) return { notCompleted: true };

            await db.prepare(`
                INSERT INTO quest_progress (user_id, quest_id, progress, completed, claimed, quest_date)
                VALUES (?, ?, ?, 1, 1, ?)
                ON CONFLICT(user_id, quest_id, quest_date) DO UPDATE SET claimed = 1, completed = 1, progress = ?
            `).run(user.id, questId, progress, today, progress);

            const newPoints = (await (db.prepare(
                'UPDATE users SET yomi_points = COALESCE(yomi_points, 0) + ? WHERE id = ? RETURNING yomi_points'
            ).get(quest.reward, user.id)))?.yomi_points;

            return { success: true, newPoints };
        });

        const txResult = await tx();

        if (txResult.alreadyClaimed) {
            return NextResponse.json({ error: 'Bu görev bugün zaten talep edildi.' }, { status: 400 });
        }
        if (txResult.notCompleted) {
            return NextResponse.json({ error: 'Görev henüz tamamlanmadı.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            reward: quest.reward,
            newTotal: txResult.newPoints,
            message: `+${quest.reward} Asteria Scans Puan kazanıldı!`,
        });
    } catch (error) {
        console.error('POST /api/users/quests error:', error);
        return NextResponse.json({ error: 'Failed to claim quest reward' }, { status: 500 });
    }
}