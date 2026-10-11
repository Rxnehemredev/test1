import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parsePagination } from '@/lib/security/sqlWhitelist';
import { uploadImage } from '@/lib/vercelBlob';
import { joinPath, pagesDir, isSharedChapterImage, formatBytes, getDirSize, toWebP } from './adminHelpers.js';

export async function handleDeleteMedia(formData, db) {
    const filePath = formData.get('filePath');
            if (!filePath) return NextResponse.json({ error: 'filePath required' }, { status: 400 });

            // Sistem varsayılan görselleri fiziksel olarak silinmemeli
            const PROTECTED_PATHS = new Set([
                '/default-avatar.png', '/avatar.png',
                '/default-cover.png', '/default-cover.jpg',
                '/demo/cover1.jpg',
            ]);
            if (PROTECTED_PATHS.has(filePath)) {
                return NextResponse.json({ success: true, message: 'Sistem varsayılan görseli korundu' });
            }

            // External URLs — only DB cleanup, no physical delete
            const isExternal = filePath.startsWith('http://') || filePath.startsWith('https://');

            // Normalize relative path: strip leading slash, check it's under public/
            const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');

            // Accept any path that resolves inside /public/ — not just /uploads/
            // This handles /avatars/, /uploads/, /demo/, etc. stored in DB
            const isRelative = !isExternal && (
                normalizedPath.startsWith('/uploads/') ||
                normalizedPath.startsWith('/avatars/') ||
                normalizedPath.startsWith('/demo/')
            );

            if (!isExternal && !isRelative) {
                // Last-resort: attempt to treat as relative if no path traversal chars present
                const clean = normalizedPath.replace(/\.\./g, '');
                if (!clean || clean.includes('..') || (!clean.startsWith('/') && !clean.startsWith('uploads/'))) {
                    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
                }
            }

            let fileDeleted = false;

            // Delete physical file for local paths
            if (!isExternal) {
                try {
                    // Resolve from public/ directory
                    const relativePart = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
                    // Path traversal protection
                    if (relativePart.includes('..')) {
                        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
                    }
                    const fullPath = joinPath(process.cwd(), 'public', relativePart);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        fileDeleted = true;
                    }
                } catch (err) {
                    console.error('delete-media file error:', err.message);
                    // File delete failed but continue with DB cleanup
                }
            }

            // Clean up DB references (avatar_url / cover_url)
            try {
                const userWithAvatar = await db.prepare('SELECT id FROM users WHERE avatar_url = ?').get(filePath);
                if (userWithAvatar) {
                    await db.prepare("UPDATE users SET avatar_url = NULL WHERE id = ?").run(userWithAvatar.id);
                }
                const userWithCover = await db.prepare('SELECT id FROM users WHERE cover_url = ?').get(filePath);
                if (userWithCover) {
                    await db.prepare("UPDATE users SET cover_url = NULL WHERE id = ?").run(userWithCover.id);
                }
            } catch {}

            return NextResponse.json({ success: true, message: fileDeleted ? 'Dosya silindi' : 'Referans kaldırıldı' });
}

export async function handleUploadMedia(formData, user) {
    if (!['admin', 'manager'].includes(user?.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const file = formData.get('file');
            const category = formData.get('category') || 'covers'; // covers | pages | avatars
            if (!file || typeof file === 'string') {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            const validCategories = ['covers', 'pages', 'avatars'];
            const safeCategory = validCategories.includes(category) ? category : 'covers';
            const ext = file.name.split('.').pop().toLowerCase();
            // Not: imgbb SVG'yi desteklemiyor — sadece raster formatlar kabul edilir
            const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!allowed.includes(ext)) {
                return NextResponse.json({ error: 'Sadece jpg, png, gif veya webp resim dosyaları yüklenebilir' }, { status: 400 });
            }
            try {
                const buffer = Buffer.from(await file.arrayBuffer());
                // WebP dosyaları yeniden sıkıştırılmaz — kalite kaybını önlemek için doğrudan yükle
                const finalBuffer = ext === 'webp' ? buffer : await toWebP(buffer, 85);
                const { url } = await uploadToImgbb(finalBuffer, `${safeCategory}-${uuidv4()}`);
                return NextResponse.json({ success: true, path: url });
            } catch (err) {
                return NextResponse.json({ error: 'Dosya yüklenemedi: ' + err.message }, { status: 500 });
            }
}

export async function handleUploadSiteAsset(formData, user) {
    if (!['admin', 'manager'].includes(user?.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const file = formData.get('file');
            const assetType = formData.get('assetType') || 'logo'; // logo | favicon | og-image
            if (!file || typeof file === 'string') {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            const ext = file.name.split('.').pop().toLowerCase();
            // Not: imgbb SVG/ICO desteklemiyor — sadece raster formatlar kabul edilir
            const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!allowed.includes(ext)) {
                return NextResponse.json({ error: 'Desteklenmeyen dosya türü (jpg, png, gif veya webp kullanın)' }, { status: 400 });
            }
            try {
                const buffer = Buffer.from(await file.arrayBuffer());
                let finalBuffer;
                if (assetType === 'favicon') {
                    // Favicon için PNG formatında kaydet
                    const sharpMod = (await import('sharp')).default;
                    finalBuffer = await sharpMod(buffer).png({ compressionLevel: 6 }).toBuffer();
                } else {
                    finalBuffer = ext === 'webp' ? buffer : await toWebP(buffer, 90);
                }
                const { url } = await uploadToImgbb(finalBuffer, `${assetType}-${uuidv4()}`, { keepFormat: assetType === 'favicon' });
                return NextResponse.json({ success: true, path: url });
            } catch (err) {
                return NextResponse.json({ error: 'Dosya yüklenemedi: ' + err.message }, { status: 500 });
            }
}

export async function handleListMedia(searchParams, user) {
    const db = await getDb();
    // Savunma derinliği: admin oturumu zaten gerekli ama alt/üst sınır yine de iyi pratik.
            const { page, limit } = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 200 });
            const categoryFilter = searchParams.get('category') || 'all';

            // ── Kullanıcı Görselleri: DB + dosya sistemi (avatars) birleşik ──
            if (categoryFilter === 'user_images') {
                // Sistem varsayılan görselleri — bunları listede gösterme / silme
                const SYSTEM_DEFAULTS = new Set([
                    '/default-avatar.png',
                    '/avatar.png',
                    '/default-cover.png',
                    '/default-cover.jpg',
                    '/demo/cover1.jpg',
                ]);

                // 1) DB'deki tüm avatar ve kapak URL'lerini çek (varsayılanlar hariç)
                const rows = await db.prepare('SELECT id, username, avatar_url, cover_url FROM users WHERE avatar_url IS NOT NULL OR cover_url IS NOT NULL').all();
                const dbPaths = new Set();
                const userMedia = [];

                // Helper: get file stats for a local path stored in DB
                const getLocalStats = (urlPath) => {
                    try {
                        const isExtUrl = urlPath.startsWith('http://') || urlPath.startsWith('https://');
                        if (isExtUrl) return { size: 0, sizeFormatted: 'Harici', modified: new Date(0).toISOString() };
                        const rel = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
                        const fullPath = joinPath(process.cwd(), 'public', rel);
                        if (fs.existsSync(fullPath)) {
                            const stat = fs.statSync(fullPath);
                            return { size: stat.size, sizeFormatted: formatBytes(stat.size), modified: stat.mtime.toISOString() };
                        }
                    } catch {}
                    return { size: 0, sizeFormatted: '—', modified: new Date(0).toISOString() };
                };

                for (const u of rows) {
                    if (u.avatar_url && !SYSTEM_DEFAULTS.has(u.avatar_url)) {
                        dbPaths.add(u.avatar_url);
                        const fname = u.avatar_url.split('/').pop() || u.avatar_url;
                        const stats = getLocalStats(u.avatar_url);
                        userMedia.push({
                            name: `${u.username} — Avatar (${fname})`,
                            path: u.avatar_url,
                            category: 'user_images',
                            imageType: 'avatar',
                            username: u.username,
                            userId: u.id,
                            ...stats,
                        });
                    }
                    if (u.cover_url && !SYSTEM_DEFAULTS.has(u.cover_url)) {
                        dbPaths.add(u.cover_url);
                        const fname = u.cover_url.split('/').pop() || u.cover_url;
                        const stats = getLocalStats(u.cover_url);
                        userMedia.push({
                            name: `${u.username} — Kapak (${fname})`,
                            path: u.cover_url,
                            category: 'user_images',
                            imageType: 'cover',
                            username: u.username,
                            userId: u.id,
                            ...stats,
                        });
                    }
                }

                // 2) Dosya sistemindeki /uploads/avatars/ dizinindeki sahipsiz dosyaları ekle
                const avatarsDir = joinPath(process.cwd(), 'public', 'uploads', 'avatars');
                if (fs.existsSync(avatarsDir)) {
                    try {
                        const scanOrphans = (dirPath) => {
                            for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
                                const full = joinPath(dirPath, entry.name);
                                if (entry.isDirectory()) {
                                    scanOrphans(full);
                                } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name)) {
                                    const relativePath = full.replace(joinPath(process.cwd(), 'public'), '').replace(/\\/g, '/');
                                    if (!dbPaths.has(relativePath)) {
                                        // DB'de kayıtlı değil — sahipsiz dosya
                                        try {
                                            const stat = fs.statSync(full);
                                            userMedia.push({
                                                name: `[Sahipsiz] ${entry.name}`,
                                                path: relativePath,
                                                category: 'user_images',
                                                imageType: 'orphan',
                                                username: null,
                                                userId: null,
                                                size: stat.size,
                                                sizeFormatted: formatBytes(stat.size),
                                                modified: stat.mtime.toISOString(),
                                            });
                                        } catch {}
                                    }
                                }
                            }
                        };
                        scanOrphans(avatarsDir);
                    } catch {}
                }

                const total = userMedia.length;
                const offset = (page - 1) * limit;
                const paginatedMedia = userMedia.slice(offset, offset + limit);
                const hasMore = offset + limit < total;
                return NextResponse.json({ media: paginatedMedia, total, hasMore });
            }
            
            const mediaFiles = [];
            const uploadsBase = joinPath(process.cwd(), 'public', 'uploads');
            const publicBase = joinPath(process.cwd(), 'public');
            const scanDir = (dirPath, category) => {
                if (!fs.existsSync(dirPath)) return;
                try {
                    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
                        const full = joinPath(dirPath, entry.name);
                        if (entry.isDirectory()) {
                            scanDir(full, category);
                        } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name)) {
                            // Avatarlar artık user_images kategorisinde — burada atla
                            if (categoryFilter !== 'all' && categoryFilter !== category) continue;
                            
                            try {
                                const stat = fs.statSync(full);
                                const relativePath = full.replace(publicBase, '').replace(/\\/g, '/');
                                mediaFiles.push({
                                    name: entry.name,
                                    path: relativePath,
                                    category,
                                    size: stat.size,
                                    sizeFormatted: formatBytes(stat.size),
                                    modified: stat.mtime.toISOString(),
                                });
                            } catch {}
                        }
                    }
                } catch {}
            };
            // Avatarlar artık user_images'ta — sadece covers ve pages tara
            scanDir(joinPath(uploadsBase, 'covers'), 'covers');
            scanDir(joinPath(uploadsBase, 'pages'), 'pages');
            
            mediaFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));
            
            const total = mediaFiles.length;
            const offset = (page - 1) * limit;
            const paginatedMedia = mediaFiles.slice(offset, offset + limit);
            const hasMore = offset + limit < total;

            return NextResponse.json({ media: paginatedMedia, total, hasMore });
}

export async function handleListMediaFolders(searchParams, user) {
    const db = await getDb();
    const allSeries = await db.prepare(`
                SELECT s.id, s.title, s.cover_url, s.created_at,
                    (SELECT COUNT(*) FROM chapters WHERE series_id = s.id) as chapter_count
                FROM series s ORDER BY s.title ASC
            `).all();

            const folders = await Promise.all(allSeries.map(async s => {
                // Kapak dosyasının boyutunu al
                let coverSize = 0;
                let coverExists = false;
                if (s.cover_url && s.cover_url.startsWith('/uploads/')) {
                    const coverPath = joinPath(process.cwd(), 'public', s.cover_url);
                    try {
                        if (fs.existsSync(coverPath)) {
                            coverSize = fs.statSync(coverPath).size;
                            coverExists = true;
                        }
                    } catch {}
                }
                // Bölüm sayfaları klasörünün toplam boyutunu al
                const chaptersForSeries = await db.prepare('SELECT id FROM chapters WHERE series_id = ?').all(s.id);
                let pagesSize = 0;
                let pagesCount = 0;
                for (const ch of chaptersForSeries) {
                    const chDir = pagesDir(ch.id);
                    pagesSize += getDirSize(chDir);
                    try {
                        pagesCount += (await (db.prepare('SELECT COUNT(*) as cnt FROM pages WHERE chapter_id = ?').get(ch.id)))?.cnt || 0;
                    } catch {}
                }
                return {
                    seriesId: s.id,
                    title: s.title,
                    coverUrl: s.cover_url || null,
                    coverExists,
                    coverSize: formatBytes(coverSize),
                    chapterCount: s.chapter_count,
                    pagesCount,
                    pagesSize: formatBytes(pagesSize),
                    totalSize: formatBytes(coverSize + pagesSize),
                };
            }));

            return NextResponse.json({ folders });
}

export async function handleListMediaSeriesChapters(searchParams, user) {
    const db = await getDb();
    const mediaSeriesId = searchParams.get('mediaSeriesId');
            if (!mediaSeriesId) return NextResponse.json({ error: 'mediaSeriesId required' }, { status: 400 });

            const seriesInfo = await db.prepare('SELECT id, title, cover_url FROM series WHERE id = ?').get(mediaSeriesId);
            if (!seriesInfo) return NextResponse.json({ error: 'Series not found' }, { status: 404 });

            const chapters = await db.prepare(`
                SELECT id, chapter_number, title, thumbnail_url,
                    (SELECT COUNT(*) FROM pages WHERE chapter_id = chapters.id) as page_count
                FROM chapters WHERE series_id = ? ORDER BY chapter_number ASC
            `).all(mediaSeriesId);

            const chapterFolders = chapters.map(ch => {
                const chDir = pagesDir(ch.id);
                const dirSize = getDirSize(chDir);
                return {
                    chapterId: ch.id,
                    chapterNumber: ch.chapter_number,
                    title: ch.title,
                    thumbnailUrl: ch.thumbnail_url,
                    pageCount: ch.page_count,
                    dirSize: formatBytes(dirSize),
                };
            });

            // Seri kapak bilgileri
            let coverSize = 0;
            if (seriesInfo.cover_url && seriesInfo.cover_url.startsWith('/uploads/')) {
                try {
                    const cp = joinPath(process.cwd(), 'public', seriesInfo.cover_url);
                    if (fs.existsSync(cp)) coverSize = fs.statSync(cp).size;
                } catch {}
            }

            return NextResponse.json({
                series: { id: seriesInfo.id, title: seriesInfo.title, coverUrl: seriesInfo.cover_url, coverSize: formatBytes(coverSize) },
                chapters: chapterFolders,
            });
}

export async function handleListMediaChapterPages(searchParams, user) {
    const db = await getDb();
    const mediaChapterId = searchParams.get('mediaChapterId');
            if (!mediaChapterId) return NextResponse.json({ error: 'mediaChapterId required' }, { status: 400 });

            const chapterInfo = await db.prepare(`
                SELECT ch.id, ch.chapter_number, ch.title, ch.series_id, s.title as series_title
                FROM chapters ch JOIN series s ON ch.series_id = s.id
                WHERE ch.id = ?
            `).get(mediaChapterId);
            if (!chapterInfo) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

            const pages = await db.prepare('SELECT id, page_number, image_path FROM pages WHERE chapter_id = ? ORDER BY page_number ASC').all(mediaChapterId);
            const publicBase = joinPath(process.cwd(), 'public');

            const pageFiles = pages.map(p => {
                let size = 0, modified = new Date(0).toISOString(), exists = false;
                if (p.image_path && !isSharedChapterImage(p.image_path)) {
                    try {
                        const fullPath = joinPath(publicBase, p.image_path.startsWith('/') ? p.image_path.slice(1) : p.image_path);
                        if (fs.existsSync(fullPath)) {
                            const stat = fs.statSync(fullPath);
                            size = stat.size;
                            modified = stat.mtime.toISOString();
                            exists = true;
                        }
                    } catch {}
                }
                return {
                    pageId: p.id,
                    pageNumber: p.page_number,
                    path: p.image_path,
                    name: p.image_path ? p.image_path.split('/').pop() : `sayfa-${p.page_number}`,
                    size,
                    sizeFormatted: formatBytes(size),
                    modified,
                    exists,
                    isShared: isSharedChapterImage(p.image_path),
                };
            });

            return NextResponse.json({
                chapter: {
                    id: chapterInfo.id,
                    chapterNumber: chapterInfo.chapter_number,
                    title: chapterInfo.title,
                    seriesId: chapterInfo.series_id,
                    seriesTitle: chapterInfo.series_title,
                },
                pages: pageFiles,
            });
}

export async function handleListUserFolders(searchParams, user) {
    const db = await getDb();
    const SYSTEM_DEFAULTS = new Set([
                '/default-avatar.png', '/avatar.png',
                '/default-cover.png', '/default-cover.jpg', '/demo/cover1.jpg',
            ]);
            const rows = await db.prepare(`
                SELECT id, username, avatar_url, cover_url, role, created_at
                FROM users ORDER BY username ASC
            `).all();

            const getLocalSize = (urlPath) => {
                if (!urlPath || SYSTEM_DEFAULTS.has(urlPath)) return 0;
                try {
                    const isExt = urlPath.startsWith('http://') || urlPath.startsWith('https://');
                    if (isExt) return 0;
                    const rel = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
                    const fp = joinPath(process.cwd(), 'public', rel);
                    return fs.existsSync(fp) ? fs.statSync(fp).size : 0;
                } catch { return 0; }
            };

            const userFolders = rows.map(u => {
                const avatarSize = getLocalSize(u.avatar_url);
                const coverSize  = getLocalSize(u.cover_url);
                const hasAvatar  = !!(u.avatar_url && !SYSTEM_DEFAULTS.has(u.avatar_url));
                const hasCover   = !!(u.cover_url  && !SYSTEM_DEFAULTS.has(u.cover_url));
                const fileCount  = (hasAvatar ? 1 : 0) + (hasCover ? 1 : 0);
                const totalSize  = avatarSize + coverSize;

                // Orphan dosyaları da say (avatars/ dizinindeki userId ile eşleşenler)
                let orphanCount = 0;
                const avatarsDir = joinPath(process.cwd(), 'public', 'uploads', 'avatars');
                if (fs.existsSync(avatarsDir)) {
                    try {
                        for (const f of fs.readdirSync(avatarsDir)) {
                            if (f.startsWith(`${u.id}_`) && /\.(jpg|jpeg|png|webp|gif)$/i.test(f)) {
                                const fPath = `/uploads/avatars/${f}`;
                                if (fPath !== u.avatar_url) orphanCount++;
                            }
                        }
                    } catch {}
                }

                return {
                    userId: u.id,
                    username: u.username,
                    role: u.role,
                    avatarUrl: hasAvatar ? u.avatar_url : null,
                    coverUrl: hasCover ? u.cover_url : null,
                    fileCount,
                    orphanCount,
                    totalSize: formatBytes(totalSize),
                    totalSizeRaw: totalSize,
                    createdAt: u.created_at,
                };
            });

            return NextResponse.json({ folders: userFolders });
}

export async function handleListUserFolderDetail(searchParams, user) {
    const db = await getDb();
    const mediaUserId = searchParams.get('mediaUserId');
            if (!mediaUserId) return NextResponse.json({ error: 'mediaUserId required' }, { status: 400 });

            const userInfo = await db.prepare('SELECT id, username, avatar_url, cover_url, role FROM users WHERE id = ?').get(mediaUserId);
            if (!userInfo) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const SYSTEM_DEFAULTS = new Set([
                '/default-avatar.png', '/avatar.png',
                '/default-cover.png', '/default-cover.jpg', '/demo/cover1.jpg',
            ]);

            const getStats = (urlPath) => {
                if (!urlPath || SYSTEM_DEFAULTS.has(urlPath)) return null;
                try {
                    const isExt = urlPath.startsWith('http://') || urlPath.startsWith('https://');
                    if (isExt) return { size: 0, sizeFormatted: 'Harici', modified: new Date(0).toISOString(), exists: false, isExternal: true };
                    const rel = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
                    const fp = joinPath(process.cwd(), 'public', rel);
                    if (fs.existsSync(fp)) {
                        const st = fs.statSync(fp);
                        return { size: st.size, sizeFormatted: formatBytes(st.size), modified: st.mtime.toISOString(), exists: true, isExternal: false };
                    }
                    return { size: 0, sizeFormatted: '—', modified: new Date(0).toISOString(), exists: false, isExternal: false };
                } catch { return { size: 0, sizeFormatted: '—', modified: new Date(0).toISOString(), exists: false, isExternal: false }; }
            };

            const files = [];

            // Avatar
            if (userInfo.avatar_url && !SYSTEM_DEFAULTS.has(userInfo.avatar_url)) {
                const st = getStats(userInfo.avatar_url);
                if (st) files.push({
                    type: 'avatar',
                    label: 'Profil Avatarı',
                    path: userInfo.avatar_url,
                    name: userInfo.avatar_url.split('/').pop(),
                    ...st,
                });
            }

            // Cover
            if (userInfo.cover_url && !SYSTEM_DEFAULTS.has(userInfo.cover_url)) {
                const st = getStats(userInfo.cover_url);
                if (st) files.push({
                    type: 'cover',
                    label: 'Profil Kapağı',
                    path: userInfo.cover_url,
                    name: userInfo.cover_url.split('/').pop(),
                    ...st,
                });
            }

            // Orphan files in avatars dir (eski yüklemeler, DB'de kayıtlı değil)
            const avatarsDir = joinPath(process.cwd(), 'public', 'uploads', 'avatars');
            if (fs.existsSync(avatarsDir)) {
                try {
                    for (const fname of fs.readdirSync(avatarsDir)) {
                        if (!fname.startsWith(`${userInfo.id}_`)) continue;
                        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(fname)) continue;
                        const fPath = `/uploads/avatars/${fname}`;
                        if (fPath === userInfo.avatar_url) continue; // zaten eklendi
                        try {
                            const fp = joinPath(avatarsDir, fname);
                            const st = fs.statSync(fp);
                            files.push({
                                type: 'orphan',
                                label: 'Eski Yükleme (Sahipsiz)',
                                path: fPath,
                                name: fname,
                                size: st.size,
                                sizeFormatted: formatBytes(st.size),
                                modified: st.mtime.toISOString(),
                                exists: true,
                                isExternal: false,
                            });
                        } catch {}
                    }
                } catch {}
            }

            return NextResponse.json({
                user: { id: userInfo.id, username: userInfo.username, role: userInfo.role },
                files,
            });
}
