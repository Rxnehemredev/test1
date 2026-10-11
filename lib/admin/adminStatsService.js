import { NextResponse } from 'next/server';
import fs from 'fs';
import { parsePagination } from '@/lib/security/sqlWhitelist';
import { joinPath, getDirSize, formatBytes } from '@/lib/admin/adminHelpers.js';

export async function handleListUsers(searchParams, db) {
    const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

    const totalCount = (await db.prepare('SELECT COUNT(*) as count FROM users').get())?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const users = await db.prepare('SELECT id, username, email, role, yomi_points, created_at, banned_until FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);

    return NextResponse.json({ users, pagination: { page, limit, totalPages, totalCount } });
}

export async function handleListSeries(searchParams, db) {
    const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

    const totalCount = (await db.prepare('SELECT COUNT(*) as count FROM series').get())?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const series = await db.prepare(`
        SELECT s.id, s.title, s.slug, s.status, s.views, s.rating, s.published, s.cover_url, s.created_at,
            (SELECT COUNT(*) FROM chapters WHERE series_id = s.id) as chapter_count
        FROM series s ORDER BY s.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);

    return NextResponse.json({ series, pagination: { page, limit, totalPages, totalCount } });
}

export async function handleReadingStats(db) {
    let dailyStats = [];
    try {
        dailyStats = await db.prepare(`
            SELECT date(created_at) as date, COUNT(*) as count
            FROM read_history
            WHERE created_at >= date('now', '-7 days')
            GROUP BY date(created_at)
            ORDER BY date ASC
        `).all();
    } catch (e) {
        // read_chapters tablosu yoksa boş dön
    }
    return NextResponse.json({ dailyStats });
}

export async function handleAdminSeriesDetail(seriesId, db) {
    const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) return NextResponse.json({ error: 'Series not found' }, { status: 404 });

    const chapters = await db.prepare(`
        SELECT ch.*,
            (SELECT COUNT(*) FROM pages WHERE chapter_id = ch.id) as page_count
        FROM chapters ch
        WHERE ch.series_id = ?
        ORDER BY ch.chapter_number DESC
    `).all(seriesId);

    return NextResponse.json({ series, chapters });
}

export async function handleAdminOverview(db) {
    const users = await db.prepare('SELECT id, username, email, role, yomi_points, banned_until, created_at FROM users ORDER BY created_at DESC').all();
    const recentComments = await db.prepare(`
        SELECT c.id, c.content, c.created_at, u.username, c.user_id, u.banned_until,
            u.avatar_url, u.email,
            c.chapter_id,
            c.parent_id,
            COALESCE(ch.title, 'Seri Yorumu') as chapter_title,
            COALESCE(s.title, s2.title) as series_title,
            COALESCE(s.slug, s2.slug) as series_slug,
            ch.chapter_number,
            COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.emoji = '👍'), 0) as likes,
            COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.emoji = '👎'), 0) as dislikes
        FROM comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN chapters ch ON c.chapter_id = ch.id
        LEFT JOIN series s ON ch.series_id = s.id
        LEFT JOIN series s2 ON c.series_id = s2.id
        ORDER BY c.created_at DESC LIMIT 500
    `).all();
    const allSeries = await db.prepare(`
        SELECT s.id, s.title, s.slug, s.status, s.views, s.rating, s.published, s.cover_url, s.created_at,
            (SELECT COUNT(*) FROM chapters WHERE series_id = s.id) as chapter_count
        FROM series s ORDER BY s.created_at DESC
    `).all();

    const uploadsBase = joinPath(process.cwd(), 'public', 'uploads');
    const coversSize = getDirSize(joinPath(uploadsBase, 'covers'));
    const avatarsSize = getDirSize(joinPath(uploadsBase, 'avatars'));
    const pagesSize = getDirSize(joinPath(uploadsBase, 'pages'));
    const uploadsSize = coversSize + avatarsSize + pagesSize;
    const dbPath = process.env.DATABASE_PATH || './data/manga.db';
    let dbSize = 0;
    try { dbSize = fs.statSync(joinPath(process.cwd(), dbPath)).size; } catch {}
    const totalStorageBytes = uploadsSize + dbSize;

    let totalTranslations = 0;
    try { totalTranslations = (await (db.prepare('SELECT COUNT(*) as count FROM translated_pages').get()))?.count || 0; } catch {}
    let totalViews = 0;
    try { totalViews = (await (db.prepare('SELECT COALESCE(SUM(views),0) as total FROM series').get()))?.total || 0; } catch {}
    let totalFavorites = 0;
    try { totalFavorites = (await (db.prepare('SELECT COUNT(*) as count FROM favorites').get()))?.count || 0; } catch {}
    let totalReadingList = 0;
    try { totalReadingList = (await (db.prepare('SELECT COUNT(*) as count FROM reading_lists').get()))?.count || 0; } catch {}

    const stats = {
        totalSeries: (await db.prepare('SELECT COUNT(*) as count FROM series').get())?.count || 0,
        totalPublished: (await db.prepare("SELECT COUNT(*) as count FROM series WHERE published=1").get())?.count || 0,
        totalChapters: (await db.prepare('SELECT COUNT(*) as count FROM chapters').get())?.count || 0,
        totalPages: (await db.prepare('SELECT COUNT(*) as count FROM pages').get())?.count || 0,
        totalUsers: (await db.prepare('SELECT COUNT(*) as count FROM users').get())?.count || 0,
        totalComments: (await db.prepare('SELECT COUNT(*) as count FROM comments').get())?.count || 0,
        totalTranslations,
        totalViews,
        totalFavorites,
        totalReadingList,
        users,
        recentComments,
        allSeries,
        storage: {
            uploads: { bytes: uploadsSize, formatted: formatBytes(uploadsSize) },
            covers: { bytes: coversSize, formatted: formatBytes(coversSize), pct: totalStorageBytes > 0 ? Math.round(coversSize / totalStorageBytes * 100) : 0 },
            avatars: { bytes: avatarsSize, formatted: formatBytes(avatarsSize), pct: totalStorageBytes > 0 ? Math.round(avatarsSize / totalStorageBytes * 100) : 0 },
            pages: { bytes: pagesSize, formatted: formatBytes(pagesSize), pct: totalStorageBytes > 0 ? Math.round(pagesSize / totalStorageBytes * 100) : 0 },
            translations: { bytes: 0, formatted: formatBytes(0), pct: 0 },
            database: { bytes: dbSize, formatted: formatBytes(dbSize), pct: totalStorageBytes > 0 ? Math.round(dbSize / totalStorageBytes * 100) : 0 },
            total: { bytes: totalStorageBytes, formatted: formatBytes(totalStorageBytes) },
        },
    };
    return NextResponse.json(stats);
}
