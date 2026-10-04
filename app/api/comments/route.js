export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, requirePermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { getAllBadges, sortBadgesByPriority } from '@/lib/badges';
import { findDisallowedImageUrl, ALLOWED_HOSTS_LABEL } from '@/lib/commentImages';

const commentsRateLimiter = createRateLimiter(10, 60 * 1000);

// Escape HTML special characters to prevent XSS
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#x27;');
}

// Leaderboard rank'ı hesaplayan CTE — tek bir sorgu içinde BİR KEZ hesaplanır
// ve JOIN ile satırlara bağlanır. Eskiden bu, her yorum/yanıt satırı için ayrı
// ayrı çalışan bir correlated subquery idi ve her çalıştığında `users`
// tablosunun tamamını yeniden tarayıp sıralıyordu (N satır için N kez tam
// tablo taraması). CTE + LEFT JOIN ile bu artık sorgu başına sadece 1 kez
// çalışıyor — okunan satır sayısını N kattan 1 kata düşürür.
const RANKED_USERS_CTE = `
    WITH ranked_users AS (
        SELECT id, DENSE_RANK() OVER (ORDER BY yomi_points DESC) as rank FROM users
    )
`;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const chapterId = searchParams.get('chapterId');
        const seriesId = searchParams.get('seriesId');
        const page = parseInt(searchParams.get('page')) || 1;
        // GÜVENLİK DÜZELTMESİ: limit üst sınırsızdı — bir saldırgan ?limit=999999999
        // göndererek tüm yorumları (+ leaderboard CTE'sini) tek sorguda çekip
        // sunucuyu/veritabanını kilitleyebiliyordu (Resource Exhaustion / DoS).
        const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
        const sort = searchParams.get('sort') || 'best';
        const paragraphIndex = searchParams.get('paragraphIndex');
        const offset = (page - 1) * limit;

        const db = await getDb();

        if (!chapterId && !seriesId) {
            // GÜVENLİK DÜZELTMESİ: Bu dal admin moderasyon görünümü için — daha önce
            // hiçbir yetki kontrolü yoktu, yani kimliği doğrulanmamış herkes
            // chapterId/seriesId göndermeden çağırarak sitedeki son 50 yorumu
            // (kullanıcı adı, role, yomi_points dahil) görebiliyordu.
            try {
                await requirePermission(request, 'manage_comments');
            } catch {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // If no chapterId or seriesId, return all comments (for admin)
            const all = await db.prepare(`
                ${RANKED_USERS_CTE}
                SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                    ru.rank as leaderboard_rank,
                    ch.title as chapter_title, s.title as series_title
                FROM comments c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN ranked_users ru ON ru.id = c.user_id
                LEFT JOIN chapters ch ON c.chapter_id = ch.id
                LEFT JOIN series s ON (ch.series_id = s.id OR c.series_id = s.id)
                WHERE c.parent_id IS NULL
                ORDER BY c.created_at DESC
                LIMIT 50
            `).all();
            return NextResponse.json({ comments: all });
        }

        // GÜVENLİK DÜZELTMESİ: paragraphIndex daha önce parseInt() ile de olsa
        // doğrudan SQL string'ine ENJEKTE ediliyordu (`${parseInt(...)}`).
        // parseInt() pratikte güvenliydi (sonucu her zaman bir sayı/NaN) ama
        // statik analiz araçları (ZAP, Semgrep vb.) SQL string'ine yapılan HER
        // interpolasyonu "olası injection" olarak işaretler. Artık tamamen
        // parametreli (?) — hem gerçek riski hem de tarayıcı false-positive'ini ortadan kaldırır.
        let whereClause;
        const whereParams = [];
        if (chapterId) {
            whereClause = 'c.chapter_id = ?';
            whereParams.push(chapterId);
        } else {
            whereClause = 'c.series_id = ?';
            whereParams.push(seriesId);
        }

        if (paragraphIndex !== null && paragraphIndex !== undefined) {
            const pIdx = parseInt(paragraphIndex);
            if (!Number.isNaN(pIdx)) {
                whereClause += ' AND c.paragraph_index = ?';
                whereParams.push(pIdx);
            }
        }

        let orderByClause = 'c.is_pinned DESC, c.created_at DESC';
        if (sort === 'oldest') {
            orderByClause = 'c.is_pinned DESC, c.created_at ASC';
        } else if (sort === 'best') {
            orderByClause = `c.is_pinned DESC, COALESCE((SELECT SUM(CASE WHEN r.emoji = '👍' THEN 1 WHEN r.emoji = '👎' THEN -1 ELSE 0 END) FROM reactions r WHERE r.comment_id = c.id), 0) DESC, c.created_at DESC`;
        }

        const totalQuery = await db.prepare(`SELECT COUNT(*) as count FROM comments c WHERE ${whereClause}`).get(...whereParams);
        const totalComments = totalQuery.count;

        const comments = await db.prepare(`
            ${RANKED_USERS_CTE}
            SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                ru.rank as leaderboard_rank,
                (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as reply_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN ranked_users ru ON ru.id = c.user_id
            WHERE ${whereClause} AND c.parent_id IS NULL
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `).all(...whereParams, limit, offset);

        // Yanıtları (replies) artık yorum başına ayrı sorgu yerine TEK bir
        // sorguyla, tüm ilgili comment id'leri için toplu çekiyoruz (N+1 -> 1).
        const allRepliesMap = new Map(); // commentId -> reply[]
        const commentIds = comments.map(c => c.id);
        if (commentIds.length > 0) {
            const placeholders = commentIds.map(() => '?').join(',');
            const allReplies = await db.prepare(`
                ${RANKED_USERS_CTE}
                SELECT c.*, u.username, u.avatar_url, u.yomi_points, u.role,
                    ru.rank as leaderboard_rank
                FROM comments c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN ranked_users ru ON ru.id = c.user_id
                WHERE c.parent_id IN (${placeholders})
                ORDER BY c.created_at ASC
            `).all(...commentIds);
            for (const reply of allReplies) {
                if (!allRepliesMap.has(reply.parent_id)) allRepliesMap.set(reply.parent_id, []);
                allRepliesMap.get(reply.parent_id).push(reply);
            }
        }

        // Batch-fetch badges for all comment + reply authors in a single query.
        // Rozet id'lerini sunucu tarafında tam nesnelere (label/icon/color) çeviriyoruz —
        // admin panelinden eklenen özel rozetler de dahil — böylece istemcinin
        // rozetleri çözmek için statik bir listeye ihtiyacı kalmıyor.
        const allUserIds = new Set();
        for (const comment of comments) allUserIds.add(comment.user_id);
        for (const replies of allRepliesMap.values()) {
            for (const reply of replies) allUserIds.add(reply.user_id);
        }
        const badgesByUser = new Map();
        if (allUserIds.size > 0) {
            const placeholders = Array.from(allUserIds).map(() => '?').join(',');
            const [badgeRows, allBadgeDefs] = await Promise.all([
                db.prepare(
                    `SELECT user_id, badge_id FROM user_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at ASC`
                ).all(...allUserIds),
                getAllBadges(db),
            ]);
            const badgeDefMap = new Map(allBadgeDefs.map(b => [b.id, b]));
            for (const row of badgeRows) {
                const def = badgeDefMap.get(row.badge_id);
                if (!def) continue; // başarı (achievement) rozeti — yorumlarda gösterilmez
                if (!badgesByUser.has(row.user_id)) badgesByUser.set(row.user_id, []);
                badgesByUser.get(row.user_id).push(def);
            }
            // Her kullanıcının rozetlerini önem sırasına göre sırala (en önemli önce)
            for (const [userId, list] of badgesByUser) {
                badgesByUser.set(userId, sortBadgesByPriority(list, allBadgeDefs));
            }
        }

        // Reaction'ları da yorum/yanıt başına ayrı sorgu yerine TEK bir
        // sorguyla, tüm ilgili comment id'leri için toplu çekiyoruz (N+1 -> 1).
        const allCommentIds = [...commentIds];
        for (const replies of allRepliesMap.values()) {
            for (const reply of replies) allCommentIds.push(reply.id);
        }
        const reactionsByComment = new Map(); // commentId -> reaction[]
        if (allCommentIds.length > 0) {
            const placeholders = allCommentIds.map(() => '?').join(',');
            const reactionRows = await db.prepare(`
                SELECT comment_id, emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
                FROM reactions WHERE comment_id IN (${placeholders})
                GROUP BY comment_id, emoji
            `).all(...allCommentIds);
            for (const row of reactionRows) {
                if (!reactionsByComment.has(row.comment_id)) reactionsByComment.set(row.comment_id, []);
                reactionsByComment.get(row.comment_id).push(row);
            }
        }

        const commentsWithReactions = comments.map(comment => {
            const reactions = reactionsByComment.get(comment.id) || [];
            const badges = badgesByUser.get(comment.user_id) || [];
            const replies = allRepliesMap.get(comment.id) || [];

            const repliesWithReactions = replies.map(reply => ({
                ...reply,
                reactions: reactionsByComment.get(reply.id) || [],
                badges: badgesByUser.get(reply.user_id) || [],
            }));

            return { ...comment, reactions, replies: repliesWithReactions, badges };
        });

        return NextResponse.json({ 
            comments: commentsWithReactions, 
            hasMore: totalComments > offset + limit,
            total: totalComments
        });
    } catch (error) {
        console.error('GET /api/comments error:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const rateLimitResult = await commentsRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Kimlik doğrulaması gerekiyor' }, { status: 401 });
        }

        const db = await getDb();
        const dbUser = await db.prepare('SELECT banned_until FROM users WHERE id = ?').get(user.id);
        if (dbUser && dbUser.banned_until && new Date(dbUser.banned_until) > new Date()) {
            return NextResponse.json({
                error: `Yorum yapmanız engellendi. Engelin biteceği tarih: ${new Date(dbUser.banned_until).toLocaleString('tr-TR')}`
            }, { status: 403 });
        }

        const { chapterId, seriesId, content, parentId, isSpoiler, paragraphIndex } = await request.json();

        if (!content || (!chapterId && !seriesId)) {
            return NextResponse.json({ error: 'Content and either chapterId or seriesId are required' }, { status: 400 });
        }

        const trimmedContent = String(content).trim();

        if (trimmedContent.length === 0) {
            return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
        }

        // GIF yalnızca BÖLÜM yorumlarında serbest — seri sayfası yorumlarında GIF/görsel markdown'ı reddedilir.
        if (!chapterId && /!\[[^\]]*\]\(/.test(trimmedContent)) {
            return NextResponse.json({ error: 'GIF yalnızca bölüm yorumlarında kullanılabilir' }, { status: 400 });
        }

        if (trimmedContent.length > 2000) {
            return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
        }

        // GİZLİLİK: Yalnızca GIPHY / imgbb görselleri — başka adreslerdeki görseller,
        // yorumu açan herkesin IP'sini o siteye sızdırabilir (bkz. lib/commentImages.js).
        if (findDisallowedImageUrl(trimmedContent)) {
            return NextResponse.json({ error: `Yalnızca ${ALLOWED_HOSTS_LABEL} görselleri eklenebilir.` }, { status: 400 });
        }

        // before applying markdown transforms, preventing XSS without double-encoding.
        const result = await db.prepare(
            'INSERT INTO comments (user_id, chapter_id, series_id, content, parent_id, is_spoiler, paragraph_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(user.id, chapterId || null, seriesId || null, trimmedContent, parentId || null, isSpoiler ? 1 : 0, paragraphIndex !== undefined ? paragraphIndex : null);

        const comment = await db.prepare(`
            ${RANKED_USERS_CTE}
            SELECT c.*, u.username, u.avatar_url, u.yomi_points,
                ru.rank as leaderboard_rank
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN ranked_users ru ON ru.id = c.user_id
            WHERE c.id = ?
        `).get(result.lastInsertRowid);

        // Create notification for reply target
        if (parentId) {
            const parentComment = await db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId);
            if (parentComment && parentComment.user_id !== user.id) {
                // Doğru link formatı - seri ve bölüm bilgisi ile
                let link = null;
                if (chapterId) {
                    // Bölüm yorumu ise bölüm sayfasına link ver
                    const chapterInfo = await db.prepare(`
                        SELECT c.chapter_number, s.slug as series_slug
                        FROM chapters c
                        JOIN series s ON c.series_id = s.id
                        WHERE c.id = ?
                    `).get(chapterId);
                    if (chapterInfo) {
                        link = `/seri/${chapterInfo.series_slug}/bolum/${chapterInfo.chapter_number}#comment-${result.lastInsertRowid}`;
                    } else {
                        link = `/read/${chapterId}#comment-${result.lastInsertRowid}`;
                    }
                } else if (seriesId) {
                    link = `/seri/${seriesId}#comment-${result.lastInsertRowid}`;
                }
                await db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
                    parentComment.user_id,
                    'reply',
                    `${user.username} yorumunuza yanıt verdi`,
                    link
                );
            }
        }

        return NextResponse.json({ comment: { ...comment, reactions: [], replies: [] } }, { status: 201 });
    } catch (error) {
        console.error('POST /api/comments error:', error);
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }
}
