export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby plan limiti: max 60sn

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasPermission, hasAdminPanelAccess } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { isSameOrigin } from '@/lib/security/sameOrigin';

import {
    handleAddSeries,
    handleUpdateSeries,
    handleDeleteSeries,
    handleBulkUpdateCover,
    handleBulkDeleteSeries,
} from '@/lib/admin/adminSeriesService';

import {
    handleUpdateChapter,
    handleUploadThumbnail,
    handleAutoThumbnail,
    handleAddChapter,
    handleDeleteChapter,
    handleDeleteAllChapters,
    handleDeleteSelectedChapters,
    handleUploadPageChunk,
    handleUploadPages,
    handleDeletePage,
    handleReorderPages,
} from '@/lib/admin/adminChapterService';

import {
    handleDeleteUser,
    handleChangeUserRole,
    handleResetUserPoints,
    handleAddUserPoints,
    handleDeleteComment,
    handleDeleteAllUserComments,
    handleBanUser,
} from '@/lib/admin/adminUserService';

import {
    handleDeleteMedia,
    handleUploadMedia,
    handleUploadSiteAsset,
    handleListMedia,
    handleListMediaFolders,
    handleListMediaSeriesChapters,
    handleListMediaChapterPages,
    handleListUserFolders,
    handleListUserFolderDetail,
} from '@/lib/admin/adminMediaService';

import {
    handleListUsers,
    handleListSeries,
    handleReadingStats,
    handleAdminSeriesDetail,
    handleAdminOverview,
} from '@/lib/admin/adminStatsService';

const adminLimiter = createRateLimiter(100, 60000);

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    try {
        const user = await requireAuth(request);
        const formData = await request.formData();
        const action = formData.get('action');

        // Check basic permissions based on action category
        const db = await getDb();
        let requiredPerm = 'admin';
        if (['add-series', 'update-series', 'bulk-update-cover'].includes(action)) requiredPerm = 'manage_series';
        else if (['delete-series', 'bulk-delete-series'].includes(action)) requiredPerm = 'delete_series';
        else if (['delete-media'].includes(action)) requiredPerm = 'manage_series';
        else if (['add-chapter', 'update-chapter', 'delete-chapter', 'delete-all-chapters', 'delete-selected-chapters', 'upload-pages', 'upload-page-chunk', 'delete-page', 'reorder-pages'].includes(action)) requiredPerm = 'upload_chapters';
        else if (['delete-comment', 'delete-all-user-comments'].includes(action)) requiredPerm = 'manage_comments';
        else if (['delete-user', 'change-user-role', 'reset-user-points', 'add-user-points', 'ban_user'].includes(action)) requiredPerm = 'manage_users';

        // delete_series: SADECE delete_series yetkisi veya admin/manager rolü
        // manage_series yetkisi seri SİLME yetkisi vermez — yalnızca düzenleme/ekleme yapar
        const chapterActions = ['add-chapter', 'update-chapter', 'delete-chapter', 'delete-all-chapters', 'delete-selected-chapters', 'upload-pages', 'upload-page-chunk', 'delete-page', 'reorder-pages'];
        const hasAccess = action === 'delete-series'
            ? (await hasPermission(user, 'delete_series', db) || ['admin', 'manager'].includes(user.role))
            : chapterActions.includes(action)
                ? (await hasPermission(user, 'upload_chapters', db) || await hasPermission(user, 'manage_chapters', db) || ['admin', 'manager'].includes(user.role))
                : (await hasPermission(user, requiredPerm, db) || ['admin', 'manager'].includes(user.role));

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions for this action' }, { status: 403 });
        }

        // Kullanıcı yönetimi güvenliği (yetki yükseltmeyi önler)
        const userMgmtActions = ['delete-user', 'change-user-role', 'ban_user', 'reset-user-points', 'add-user-points', 'delete-all-user-comments'];
        if (userMgmtActions.includes(action)) {
            const targetUserId = formData.get('userId');
            // Kimse kendi rolünü değiştiremez / kendini silemez (kilitlenme + yetki yükseltme)
            if (['change-user-role', 'delete-user'].includes(action) && String(targetUserId) === String(user.id)) {
                return NextResponse.json({ error: 'Kendi hesabınız üzerinde bu işlemi yapamazsınız' }, { status: 403 });
            }
            if (user.role !== 'admin') {
                const targetUser = await db.prepare('SELECT role FROM users WHERE id = ?').get(targetUserId);
                // Admin ve manager hesaplarını yalnızca admin değiştirebilir
                if (targetUser && ['admin', 'manager'].includes(targetUser.role)) {
                    return NextResponse.json({ error: 'Forbidden: Yönetici hesaplarını yalnızca admin değiştirebilir' }, { status: 403 });
                }
                // Admin / manager rolünü yalnızca admin atayabilir
                if (action === 'change-user-role' && ['admin', 'manager'].includes(formData.get('role'))) {
                    return NextResponse.json({ error: 'Forbidden: Bu rol yalnızca admin tarafından atanabilir' }, { status: 403 });
                }
            }
        }

        // Dispatch series actions
        if (action === 'add-series') return await handleAddSeries(formData, db);
        if (action === 'update-series') return await handleUpdateSeries(formData, db);
        if (action === 'delete-series') return await handleDeleteSeries(formData, db);
        if (action === 'bulk-update-cover') return await handleBulkUpdateCover(formData, db);
        if (action === 'bulk-delete-series') return await handleBulkDeleteSeries(formData, db);

        // Dispatch chapter actions
        if (action === 'update-chapter') return await handleUpdateChapter(formData, db);
        if (action === 'upload-thumbnail') return await handleUploadThumbnail(formData, db);
        if (action === 'auto-thumbnail') return await handleAutoThumbnail(formData, db);
        if (action === 'add-chapter') return await handleAddChapter(formData, db);
        if (action === 'delete-chapter') return await handleDeleteChapter(formData, db);
        if (action === 'delete-all-chapters') return await handleDeleteAllChapters(formData, db);
        if (action === 'delete-selected-chapters') return await handleDeleteSelectedChapters(formData, db);
        if (action === 'upload-page-chunk') return await handleUploadPageChunk(formData, db);
        if (action === 'upload-pages') return await handleUploadPages(formData, db);
        if (action === 'delete-page') return await handleDeletePage(formData, db);
        if (action === 'reorder-pages') return await handleReorderPages(formData, db);

        // Dispatch user & comment moderation actions
        if (action === 'delete-user') return await handleDeleteUser(formData, db);
        if (action === 'change-user-role') return await handleChangeUserRole(formData, db);
        if (action === 'reset-user-points') return await handleResetUserPoints(formData, db);
        if (action === 'add-user-points') return await handleAddUserPoints(formData, db);
        if (action === 'delete-comment') return await handleDeleteComment(formData, db);
        if (action === 'delete-all-user-comments') return await handleDeleteAllUserComments(formData, db);
        if (action === 'ban_user') return await handleBanUser(formData, db);

        // Dispatch media actions
        if (action === 'delete-media') return await handleDeleteMedia(formData, db);
        if (action === 'upload-media') return await handleUploadMedia(formData, db);
        if (action === 'upload-site-asset') return await handleUploadSiteAsset(formData, db);

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Admin POST error:', error);
        return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
    }
}

export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');
        const action = searchParams.get('action');

        // Media endpoints
        if (action === 'list-media') return await handleListMedia(searchParams, db);
        if (action === 'list-media-folders') return await handleListMediaFolders(searchParams, db);
        if (action === 'list-media-series-chapters') return await handleListMediaSeriesChapters(searchParams, db);
        if (action === 'list-media-chapter-pages') return await handleListMediaChapterPages(searchParams, db);
        if (action === 'list-user-folders') return await handleListUserFolders(searchParams, db);
        if (action === 'list-user-folder-detail') return await handleListUserFolderDetail(searchParams, db);

        // Stats & listings
        if (action === 'list_users') return await handleListUsers(searchParams, db);
        if (action === 'list_series') return await handleListSeries(searchParams, db);
        if (action === 'reading_stats') return await handleReadingStats(db);

        // Series detail for admin
        if (seriesId) return await handleAdminSeriesDetail(seriesId, db);

        // Overview stats
        return await handleAdminOverview(db);
    } catch (error) {
        console.error('GET /api/admin error:', error);
        return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
    }
}
