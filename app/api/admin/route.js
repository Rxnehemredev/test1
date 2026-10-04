export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby plan limiti: max 60sn
import { NextResponse, after } from 'next/server';
import { getDb } from '@/lib/db';
import { generateSlug } from '@/lib/db';
import { requireAdmin, requireAuth, hasPermission, hasAdminPanelAccess } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { optimizeCoverImage, optimizeChapterPage } from '@/lib/imageOptimizer';
import { parsePagination } from '@/lib/security/sqlWhitelist';
import { uploadToImgbb } from '@/lib/imgbb';
import { invalidateSeriesCaches } from '@/lib/seriesCache';
import { uploadImage } from '@/lib/vercelBlob';
import { createRateLimiter } from '@/lib/ratelimit';
import { isSameOrigin } from '@/lib/security/sameOrigin';
const adminLimiter = createRateLimiter(100, 60000);


const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

// ── Convert any image buffer to WebP (dynamic import to avoid Next.js bundling sharp) ──
async function toWebP(buffer, quality = 85) {
    const sharp = (await import('sharp')).default;
    return sharp(buffer).webp({ quality }).toBuffer();
}

// Paylaşılan bölüm başı/sonu görsellerini kazara silmekten korur
// Bu yollar her bölüm için tek bir fiziksel dosyaya referans verir; silinmemeli.
function isSharedChapterImage(imagePath) {
    return typeof imagePath === 'string' && (
        imagePath.includes('/uploads/chapter-start-image/') ||
        imagePath.includes('/uploads/chapter-end-image/')
    );
}

// Recursively calculate directory size in bytes
function getDirSize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    try {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                total += getDirSize(full);
            } else {
                try { total += fs.statSync(full).size; } catch {}
            }
        }
    } catch {}
    return total;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Turbopack'in statik dosya izleme analizini kırmak için sarmalayıcı.
// Turbopack opak fonksiyon çağrılarından gelen yolları izleyemez,
// bu sayede fs.existsSync/statSync/unlinkSync uyarıları önlenir.
// GÜVENLİK: sonuç yol proje klasörünün (ve `public/` ile başlıyorsa public klasörünün) dışına
// çıkıyorsa (../ ile path traversal) hata fırlatır — DB'den/istekten gelen yollar için son savunma.
const joinPath = (...args) => {
    const full = path.join(...args);
    const root = path.resolve(process.cwd());
    const resolved = path.resolve(full);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Geçersiz dosya yolu');
    if (args[0] === process.cwd() && args[1] === 'public') {
        const pub = path.join(root, 'public');
        if (resolved !== pub && !resolved.startsWith(pub + path.sep)) throw new Error('Geçersiz dosya yolu');
    }
    return full;
};
// Bölüm sayfa klasörü — ID yalnızca rakam olabilir (rmSync ile "../.." gibi bir değerle
// başka klasörleri silmeyi engeller)
const pagesDir = (id) => {
    const s = String(id);
    if (!/^\d{1,12}$/.test(s)) throw new Error('Geçersiz bölüm ID');
    return joinPath(process.cwd(), 'public', 'uploads', 'pages', s);
};

// Generate a unique slug for a series
async function makeUniqueSlug(db, title, excludeId = null) {
    let base = generateSlug(title);
    if (!base) base = `series-${Date.now()}`;
    let slug = base;
    let counter = 1;
    while (true) {
        const query = excludeId
            ? 'SELECT id FROM series WHERE slug = ? AND id != ?'
            : 'SELECT id FROM series WHERE slug = ?';
        const args = excludeId ? [slug, excludeId] : [slug];
        const existing = await db.prepare(query).get(...args);
        if (!existing) break;
        slug = `${base}-${counter++}`;
    }
    return slug;
}

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

        if (action === 'add-series') {
            const db = await getDb();
            const title = formData.get('title');
            const description = formData.get('description') || '';
            const author = formData.get('author') || '';
            const artist = formData.get('artist') || '';
            const status = formData.get('status') || 'ongoing';
            const type = formData.get('type') || 'manga';
            const genres = formData.get('genres') || '[]';
            const rating = parseFloat(formData.get('rating')) || 0;
            const published = parseInt(formData.get('published')) || 0;
            const altNames = formData.get('alt_names') || '';

            let coverUrl = '/demo/cover1.jpg';
            const coverFile = formData.get('cover');
            if (coverFile && coverFile.size > 0) {
                try {
                    if (!coverFile.type?.startsWith('image/')) {
                        return NextResponse.json({ error: 'Geçersiz kapak dosyası. Bir görsel seçin.' }, { status: 400 });
                    }
                    if (coverFile.size > 5 * 1024 * 1024) {
                        return NextResponse.json({ error: 'Kapak dosyası en fazla 5MB olabilir.' }, { status: 400 });
                    }
                    const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
                    let optimizedBuffer;
                    try {
                        optimizedBuffer = await optimizeCoverImage(rawBuffer);
                    } catch (coverOptErr) {
                        console.error('Cover image optimization failed, uploading original:', coverOptErr.message);
                        optimizedBuffer = rawBuffer;
                    }
                    const { url } = await uploadToImgbb(optimizedBuffer, `cover_${uuidv4()}`);
                    coverUrl = url;
                } catch (coverErr) {
                    console.error('Cover upload error:', coverErr.message);
                    return NextResponse.json({ error: `Kapak yüklenemedi: ${coverErr.message}` }, { status: 502 });
                }
            }

            const isAdult = parseInt(formData.get('is_adult')) === 1 ? 1 : 0;
            const slug = await makeUniqueSlug(db, title);
            // Ensure alt_names column exists
            try { await db.prepare('ALTER TABLE series ADD COLUMN alt_names TEXT DEFAULT ""').run(); } catch(e) {}
            // Ensure is_adult column exists
            try { await db.prepare('ALTER TABLE series ADD COLUMN is_adult INTEGER DEFAULT 0').run(); } catch(e) {}
            const result = await db.prepare(
                'INSERT INTO series (title, slug, description, cover_url, author, artist, status, type, genres, rating, published, alt_names, is_adult) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(title, slug, description, coverUrl, author, artist, status, type, genres, rating, published, altNames, isAdult);

            await invalidateSeriesCaches();

            // Yayında eklenen seri için tanıtım blogu: yanıt döndükten SONRA arka planda üretilir
            // (Gemini yavaşsa/anahtar yoksa seri kaydı etkilenmez; hata yalnızca loga yazılır).
            if (published) {
                const newSeriesId = Number(result.lastInsertRowid);
                after(async () => {
                    try {
                        const { generateBlogForSeries } = await import('@/lib/ai-blog');
                        const row = await db.prepare('SELECT * FROM series WHERE id = ?').get(newSeriesId);
                        if (row) await generateBlogForSeries(row);
                    } catch (e) {
                        console.error('Yeni seri için otomatik blog üretilemedi:', e?.message);
                    }
                });
            }
            return NextResponse.json({ seriesId: result.lastInsertRowid, slug, message: published ? 'Series published!' : 'Series saved as draft' }, { status: 201 });
        }

        if (action === 'update-series') {
            const db = await getDb();
            const seriesId = formData.get('seriesId');
            const title = formData.get('title');
            const description = formData.get('description') || '';
            const author = formData.get('author') || '';
            const artist = formData.get('artist') || '';
            const status = formData.get('status') || 'ongoing';
            const type = formData.get('type') || 'manga';
            const genres = formData.get('genres') || '[]';
            const rating = parseFloat(formData.get('rating')) || 0;
            const published = parseInt(formData.get('published')) || 0;
            const altNames = formData.get('alt_names') || '';

            let coverUrl = null;
            const coverFile = formData.get('cover');
            if (coverFile && coverFile.size > 0) {
                try {
                    if (!coverFile.type?.startsWith('image/')) {
                        return NextResponse.json({ error: 'Geçersiz kapak dosyası. Bir görsel seçin.' }, { status: 400 });
                    }
                    if (coverFile.size > 5 * 1024 * 1024) {
                        return NextResponse.json({ error: 'Kapak dosyası en fazla 5MB olabilir.' }, { status: 400 });
                    }
                    const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
                    let optimizedBuffer;
                    try {
                        optimizedBuffer = await optimizeCoverImage(rawBuffer);
                    } catch (coverOptErr) {
                        console.error('Cover image optimization failed, uploading original:', coverOptErr.message);
                        optimizedBuffer = rawBuffer;
                    }
                    const { url } = await uploadToImgbb(optimizedBuffer, `cover_${uuidv4()}`);
                    coverUrl = url;
                } catch (coverErr) {
                    console.error('Cover update error:', coverErr.message);
                    return NextResponse.json({ error: `Kapak yüklenemedi: ${coverErr.message}` }, { status: 502 });
                }
            }

            // Regenerate slug if title changed
            const existing = await db.prepare('SELECT slug, title FROM series WHERE id = ?').get(seriesId);
            let slug = existing?.slug;
            const isCorruptSlug = !slug || /^\[object\s/i.test(slug);
            if (isCorruptSlug || (existing?.title !== title)) {
                slug = await makeUniqueSlug(db, title, seriesId);
            }

            const isAdult = parseInt(formData.get('is_adult')) === 1 ? 1 : 0;
            // Ensure alt_names column exists
            try { await db.prepare('ALTER TABLE series ADD COLUMN alt_names TEXT DEFAULT ""').run(); } catch(e) {}
            // Ensure is_adult column exists
            try { await db.prepare('ALTER TABLE series ADD COLUMN is_adult INTEGER DEFAULT 0').run(); } catch(e) {}
            if (coverUrl) {
                await db.prepare('UPDATE series SET title=?, slug=?, description=?, cover_url=?, author=?, artist=?, status=?, type=?, genres=?, rating=?, published=?, alt_names=?, is_adult=? WHERE id=?')
                    .run(title, slug, description, coverUrl, author, artist, status, type, genres, rating, published, altNames, isAdult, seriesId);
            } else {
                await db.prepare('UPDATE series SET title=?, slug=?, description=?, author=?, artist=?, status=?, type=?, genres=?, rating=?, published=?, alt_names=?, is_adult=? WHERE id=?')
                    .run(title, slug, description, author, artist, status, type, genres, rating, published, altNames, isAdult, seriesId);
            }

            await invalidateSeriesCaches();
            return NextResponse.json({ message: 'Series updated', slug });
        }

        if (action === 'update-chapter') {
            const db = await getDb();
            const chapterId = formData.get('chapterId');
            const chapterNumber = formData.get('chapterNumber');
            const title = formData.get('title') || `Chapter ${chapterNumber}`;
            const content = formData.get('content') || null;
            const thumbnailUrl = formData.get('thumbnailUrl'); // undefined yoksa null
            // publishAt: boş string → NULL (zamanlama iptal), değer → set, undefined → değiştirme
            const publishAtRaw = formData.get('publishAt');
            const publishAt = publishAtRaw === '' ? null : (publishAtRaw || undefined);
            // externalUrl: boş string → NULL (dış bağlantı kaldır), değer → set, undefined → değiştirme
            const externalUrlRaw = formData.get('externalUrl');
            const externalUrl = externalUrlRaw === '' ? null : (externalUrlRaw || undefined);
            const externalNoteRaw = formData.get('externalNote');
            const externalNote = externalNoteRaw === '' ? null : (externalNoteRaw || undefined);

            if (externalUrl !== undefined) {
                await db.prepare('UPDATE chapters SET external_url = ? WHERE id = ?').run(externalUrl, chapterId);
            }
            if (externalNote !== undefined) {
                await db.prepare('UPDATE chapters SET external_note = ? WHERE id = ?').run(externalNote, chapterId);
            }

            if (thumbnailUrl !== null && thumbnailUrl !== undefined && thumbnailUrl !== '') {
                if (publishAt !== undefined) {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ?, thumbnail_url = ?, publish_at = ? WHERE id = ?')
                        .run(chapterNumber, title, content, thumbnailUrl, publishAt, chapterId);
                } else {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ?, thumbnail_url = ? WHERE id = ?')
                        .run(chapterNumber, title, content, thumbnailUrl, chapterId);
                }
            } else if (thumbnailUrl === '') {
                if (publishAt !== undefined) {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ?, thumbnail_url = NULL, publish_at = ? WHERE id = ?')
                        .run(chapterNumber, title, content, publishAt, chapterId);
                } else {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ?, thumbnail_url = NULL WHERE id = ?')
                        .run(chapterNumber, title, content, chapterId);
                }
            } else {
                if (publishAt !== undefined) {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ?, publish_at = ? WHERE id = ?')
                        .run(chapterNumber, title, content, publishAt, chapterId);
                } else {
                    await db.prepare('UPDATE chapters SET chapter_number = ?, title = ?, content = ? WHERE id = ?')
                        .run(chapterNumber, title, content, chapterId);
                }
            }

            await invalidateSeriesCaches();
            return NextResponse.json({ success: true, message: 'Chapter updated' });
        }

        if (action === 'upload-thumbnail') {
            // Thumbnail için tekil görsel dosyası yükle, URL döndür
            const thumbFile = formData.get('thumbnailFile');
            if (!thumbFile || thumbFile.size === 0) return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
            if (!thumbFile.type?.startsWith('image/') || /svg/i.test(thumbFile.type)) {
                return NextResponse.json({ error: 'Yalnızca raster görsel (jpg, png, webp, gif) yüklenebilir' }, { status: 400 });
            }
            if (thumbFile.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Dosya en fazla 5MB olabilir' }, { status: 400 });
            try {
                const thumbDir = joinPath(process.cwd(), 'public', 'uploads', 'thumbnails');
                if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
                const rawBuffer = Buffer.from(await thumbFile.arrayBuffer());
                let fileName = `thumb_${uuidv4()}.webp`;
                const thumbFilePath = joinPath(thumbDir, fileName);
                try {
                    const sharp = (await import('sharp')).default;
                    await sharp(rawBuffer).webp({ quality: 85 }).toFile(thumbFilePath);
                } catch {
                    // sharp başarısızsa (ör. desteklenmeyen format) yalnızca güvenli raster uzantılarıyla sakla —
                    // istemcinin verdiği rastgele uzantı (.html/.svg → depolanmış XSS) kabul edilmez
                    const ext = path.extname(thumbFile.name || '').toLowerCase();
                    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
                        return NextResponse.json({ error: 'Geçersiz görsel dosyası' }, { status: 400 });
                    }
                    fileName = `thumb_${uuidv4()}${ext}`;
                    fs.writeFileSync(path.join(thumbDir, fileName.replace('.webp', ext)), rawBuffer);
                    fileName = fileName.replace('.webp', ext);
                }
                const thumbnailUrl = `/uploads/thumbnails/${fileName}`;
                return NextResponse.json({ thumbnailUrl });
            } catch (e) {
                return NextResponse.json({ error: e.message || 'Yükleme başarısız' }, { status: 500 });
            }
        }

        if (action === 'auto-thumbnail') {
            // Bölümün sayfalarından rastgele birini thumbnail olarak ayarla
            const db = await getDb();
            const chapterId = formData.get('chapterId');
            if (!chapterId) return NextResponse.json({ error: 'chapterId required' }, { status: 400 });

            const pages = await db.prepare('SELECT image_path FROM pages WHERE chapter_id = ? ORDER BY page_number ASC').all(chapterId);
            if (!pages || pages.length === 0) {
                return NextResponse.json({ error: 'Bu bölümde sayfa bulunamadı' }, { status: 400 });
            }
            // Rastgele bir sayfa seç (ilk 3 sayfa içinden)
            const pool = pages.slice(0, Math.min(3, pages.length));
            const picked = pool[Math.floor(Math.random() * pool.length)];
            const thumbUrl = picked.image_path;

            await db.prepare('UPDATE chapters SET thumbnail_url = ? WHERE id = ?').run(thumbUrl, chapterId);
            return NextResponse.json({ message: 'Thumbnail ayarlandı', thumbnailUrl: thumbUrl });
        }

        if (action === 'add-chapter') {
            const db = await getDb();
            const seriesId = formData.get('seriesId');
            const chapterNumber = formData.get('chapterNumber');
            const title = formData.get('title') || `Chapter ${chapterNumber}`;
            const content = formData.get('content') || null;
            const publishAt = formData.get('publishAt') || null;
            const thumbnailUrl = formData.get('thumbnailUrl') || null;
            const externalUrl = formData.get('externalUrl') || null;
            const externalNote = formData.get('externalNote') || null;

            const result = await db.prepare(
                'INSERT INTO chapters (series_id, chapter_number, title, content, publish_at, thumbnail_url, external_url, external_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(seriesId, chapterNumber, title, content, publishAt, thumbnailUrl, externalUrl, externalNote);

            const chapterId = result.lastInsertRowid;

            // Trigger Google Indexing in the background
            try {
                const series = await db.prepare('SELECT slug, id, title FROM series WHERE id = ?').get(seriesId);
                if (series) {
                    const slug = series.slug || series.id;
                    const chUrl = `${BASE_URL}/seri/${slug}/bolum/${chapterNumber}`;
                    import('@/lib/googleIndexing').then(({ notifyGoogleIndexing }) => {
                        notifyGoogleIndexing(chUrl);
                    }).catch(() => {});
                    import('@/lib/indexNow').then(({ notifyIndexNow }) => {
                        notifyIndexNow(chUrl);
                    }).catch(() => {});

                    // ── Yeni bölüm bildirimi gönder ──
                    // Favori ekleyen kullanıcılara bildirim gönder
                    try {
                        const favUsers = await db.prepare(
                            'SELECT user_id FROM favorites WHERE series_id = ?'
                        ).all(seriesId);

                        const rlUsers = await db.prepare(
                            'SELECT user_id FROM reading_lists WHERE series_id = ?'
                        ).all(seriesId);

                        // Benzersiz kullanıcıları topla
                        const notifiedUsers = new Set();
                        const notificationMessage = `"${series.title}" serisine yeni bölüm eklendi: Bölüm ${chapterNumber}`;
                        const notificationLink = `/seri/${slug}/bolum/${chapterNumber}`;

                        for (const fav of favUsers) {
                            notifiedUsers.add(fav.user_id);
                        }
                        for (const rl of rlUsers) {
                            notifiedUsers.add(rl.user_id);
                        }

                        // Her kullanıcıya bildirim gönder
                        const insertNotif = await db.prepare(
                            'INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, 0)'
                        );
                        for (const uid of notifiedUsers) {
                            try {
                                insertNotif.run(uid, 'new_chapter', notificationMessage, notificationLink);
                            } catch {}
                        }
                    } catch (notifErr) {
                        console.error('Yeni bölüm bildirimi gönderme hatası:', notifErr);
                    }
                }
            } catch (indexingErr) {
                console.error('Google Indexing API trigger error:', indexingErr);
            }

            await invalidateSeriesCaches();
            return NextResponse.json({ chapterId, message: 'Chapter created' }, { status: 201 });
        }

        if (action === 'delete-chapter') {
            const db = await getDb();
            const chapterId = formData.get('chapterId');
            if (!/^\d{1,12}$/.test(String(chapterId ?? ''))) return NextResponse.json({ error: 'Geçersiz chapterId' }, { status: 400 });
            // Delete associated pages files (paylaşılan görseller korunur)
            const pages = await db.prepare('SELECT image_path FROM pages WHERE chapter_id = ?').all(chapterId);
            for (const p of pages) {
                if (isSharedChapterImage(p.image_path)) continue;
                const filePath = joinPath(process.cwd(), 'public', p.image_path);
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { }
            }
            await db.prepare('DELETE FROM pages WHERE chapter_id = ?').run(chapterId);
            // Bölüme ait sayfa klasörünü de sil (kalan dosyalar varsa)
            const chapterDir = pagesDir(chapterId);
            try { if (fs.existsSync(chapterDir)) fs.rmSync(chapterDir, { recursive: true, force: true }); } catch { }
            // Bölüme ait thumbnail varsa sil (pages klasöründeki değil, ayrı thumbnails klasöründeki)
            const chapter = await db.prepare('SELECT thumbnail_url FROM chapters WHERE id = ?').get(chapterId);
            if (chapter?.thumbnail_url && !isSharedChapterImage(chapter.thumbnail_url)) {
                const thumbPath = chapter.thumbnail_url;
                // Yalnızca /uploads/thumbnails/ altındaki thumbnail dosyalarını sil
                // (pages klasöründeki görseller zaten üstte silindi)
                if (thumbPath.startsWith('/uploads/thumbnails/')) {
                    const thumbFile = joinPath(process.cwd(), 'public', thumbPath);
                    try { if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile); } catch { }
                }
            }
            await db.prepare('DELETE FROM chapters WHERE id = ?').run(chapterId);
            await invalidateSeriesCaches();
            return NextResponse.json({ message: 'Chapter deleted' });
        }

        if (action === 'delete-all-chapters') {
            const db = await getDb();
            const seriesId = formData.get('seriesId');
            const chapters = await db.prepare('SELECT id, thumbnail_url FROM chapters WHERE series_id = ?').all(seriesId);
            for (const ch of chapters) {
                const pages = await db.prepare('SELECT image_path FROM pages WHERE chapter_id = ?').all(ch.id);
                for (const p of pages) {
                    if (isSharedChapterImage(p.image_path)) continue;
                    const filePath = joinPath(process.cwd(), 'public', p.image_path);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { }
                }
                await db.prepare('DELETE FROM pages WHERE chapter_id = ?').run(ch.id);
                const chapterDir = pagesDir(ch.id);
                try { if (fs.existsSync(chapterDir)) fs.rmSync(chapterDir, { recursive: true, force: true }); } catch { }
                // Bölüme ait thumbnail dosyasını sil (yalnızca /uploads/thumbnails/ altındakiler)
                if (ch.thumbnail_url && ch.thumbnail_url.startsWith('/uploads/thumbnails/')) {
                    const thumbFile = joinPath(process.cwd(), 'public', ch.thumbnail_url);
                    try { if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile); } catch { }
                }
            }
            await db.prepare('DELETE FROM chapters WHERE series_id = ?').run(seriesId);
            await invalidateSeriesCaches();
            return NextResponse.json({ message: `Deleted all ${chapters.length} chapters successfully` });
        }

        if (action === 'delete-selected-chapters') {
            const db = await getDb();
            let chapterIds;
            try { chapterIds = JSON.parse(formData.get('chapterIds') || '[]'); } catch { chapterIds = null; }
            if (!Array.isArray(chapterIds) || chapterIds.length > 5000 || !chapterIds.every(id => /^\d{1,12}$/.test(String(id)))) {
                return NextResponse.json({ error: 'Geçersiz chapterIds' }, { status: 400 });
            }
            for (const chId of chapterIds) {
                const pages = await db.prepare('SELECT image_path FROM pages WHERE chapter_id = ?').all(chId);
                for (const p of pages) {
                    if (isSharedChapterImage(p.image_path)) continue;
                    const filePath = joinPath(process.cwd(), 'public', p.image_path);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { }
                }
                await db.prepare('DELETE FROM pages WHERE chapter_id = ?').run(chId);
                const chapterDir = pagesDir(chId);
                try { if (fs.existsSync(chapterDir)) fs.rmSync(chapterDir, { recursive: true, force: true }); } catch { }
                // Bölüme ait thumbnail dosyasını sil (yalnızca /uploads/thumbnails/ altındakiler)
                const chForThumb = await db.prepare('SELECT thumbnail_url FROM chapters WHERE id = ?').get(chId);
                if (chForThumb?.thumbnail_url && chForThumb.thumbnail_url.startsWith('/uploads/thumbnails/')) {
                    const thumbFile = joinPath(process.cwd(), 'public', chForThumb.thumbnail_url);
                    try { if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile); } catch { }
                }
                await db.prepare('DELETE FROM chapters WHERE id = ?').run(chId);
            }
            await invalidateSeriesCaches();
            return NextResponse.json({ message: `Deleted ${chapterIds.length} selected chapters successfully` });
        }

        if (action === 'upload-page-chunk') {
            const db = await getDb();
            const chapterId = formData.get('chapterId');
            const fileId = formData.get('fileId');
            const chunkIndex = parseInt(formData.get('chunkIndex'), 10);
            const totalChunks = parseInt(formData.get('totalChunks'), 10);
            const isLastFileInBatch = formData.get('isLastFileInBatch') === '1';
            const chunkFile = formData.get('chunk');
            // 'imgbb' (varsayılan), 'vercel' veya 'supabase' — istemciden gelen depolama tercihi
            const storageProvider = ['vercel', 'supabase'].includes(formData.get('storageProvider')) ? formData.get('storageProvider') : 'imgbb';

            if (!chapterId || !fileId || Number.isNaN(chunkIndex) || Number.isNaN(totalChunks) || !chunkFile) {
                return NextResponse.json({ error: 'Eksik parça verisi' }, { status: 400 });
            }

            // Yarım kalmış eski parçaları temizle (1 saatten eski — istemci yükleme sırasında sekmeyi kapatmış olabilir)
            try { await db.prepare("DELETE FROM upload_chunks WHERE created_at < datetime('now', '-1 hour')").run(); } catch {}

            const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());
            await db.prepare('INSERT INTO upload_chunks (file_id, chunk_index, chunk_data) VALUES (?, ?, ?)')
                .run(fileId, chunkIndex, chunkBuffer.toString('base64'));

            if (chunkIndex < totalChunks - 1) {
                return NextResponse.json({ received: chunkIndex + 1, totalChunks, complete: false });
            }

            // Son parça geldi — bu dosyaya ait tüm parçaları sırayla birleştir
            const rows = await db.prepare('SELECT chunk_index, chunk_data FROM upload_chunks WHERE file_id = ? ORDER BY chunk_index ASC').all(fileId);
            if (rows.length !== totalChunks) {
                return NextResponse.json({ error: `Eksik parçalar: ${rows.length}/${totalChunks} alındı. Lütfen tekrar deneyin.` }, { status: 409 });
            }
            const rawBuffer = Buffer.concat(rows.map(r => Buffer.from(r.chunk_data, 'base64')));
            await db.prepare('DELETE FROM upload_chunks WHERE file_id = ?').run(fileId);

            // Watermark ayarlarını oku
            const wmKeys = ['watermark_enabled', 'watermark_path', 'watermark_position', 'watermark_opacity', 'watermark_scale'];
            const wmRows = await db.prepare(`SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (${wmKeys.map(() => '?').join(',')})`)
                .all(...wmKeys);
            const wmSettings = Object.fromEntries(wmRows.map(r => [r.setting_key, r.setting_value]));
            const watermarkOptions = {
                enabled: wmSettings.watermark_enabled || '0',
                path: wmSettings.watermark_path || '',
                position: wmSettings.watermark_position || 'bottom-right',
                opacity: wmSettings.watermark_opacity || '60',
                scale: wmSettings.watermark_scale || '15'
            };

            const maxPage = await db.prepare('SELECT MAX(page_number) as max FROM pages WHERE chapter_id = ?').get(chapterId);
            let pageNum = (maxPage?.max || 0) + 1;

            // Bölüm başı görseli (yalnızca bu bölümün ilk sayfasıysa, etkinse)
            if (pageNum === 1) {
                try {
                    const csiRows = await db.prepare(
                        "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('chapter_start_image_enabled', 'chapter_start_image_path')"
                    ).all();
                    const csiSettings = Object.fromEntries(csiRows.map(r => [r.setting_key, r.setting_value]));
                    if (csiSettings.chapter_start_image_enabled === '1' && csiSettings.chapter_start_image_path) {
                        await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum, csiSettings.chapter_start_image_path);
                        pageNum++;
                    }
                } catch (startErr) {
                    console.warn('Bölüm başı görseli eklenemedi:', startErr.message);
                }
            }

            let imagePath;
            try {
                let optimizedBuffer;
                try {
                    optimizedBuffer = await optimizeChapterPage(rawBuffer, watermarkOptions);
                } catch (convErr) {
                    console.warn('WebP conversion failed, uploading original:', convErr.message);
                    optimizedBuffer = rawBuffer;
                }
                const uploadRes = await uploadImage(optimizedBuffer, `page_${chapterId}_${String(pageNum).padStart(3, '0')}`, storageProvider);
                imagePath = uploadRes.url;
                await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum, imagePath);
            } catch (err) {
                console.error('Sayfa işleme hatası:', err.message);
                return NextResponse.json({ error: `Görsel işlenemedi: ${err.message}` }, { status: 500 });
            }

            // Son dosyaysa bölüm sonu görselini de ekle
            if (isLastFileInBatch) {
                try {
                    const ceiRows = await db.prepare(
                        "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('chapter_end_image_enabled', 'chapter_end_image_path')"
                    ).all();
                    const ceiSettings = Object.fromEntries(ceiRows.map(r => [r.setting_key, r.setting_value]));
                    if (ceiSettings.chapter_end_image_enabled === '1' && ceiSettings.chapter_end_image_path) {
                        await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum + 1, ceiSettings.chapter_end_image_path);
                    }
                } catch (endErr) {
                    console.warn('Bölüm sonu görseli eklenemedi:', endErr.message);
                }
            }

            // Bölümün son dosyası da yüklendi → listeler/sayfalar artık yeni bölümü gösterebilir.
            // (Parçalı yükleme yolu daha önce hiç cache temizlemiyordu → yeni bölüm çok geç düşüyordu.)
            if (isLastFileInBatch) await invalidateSeriesCaches();
            return NextResponse.json({ complete: true, imagePath, pageNumber: pageNum }, { status: 201 });
        }

        if (action === 'upload-pages') {
            const db = await getDb();
            const chapterId = formData.get('chapterId');
            const isLastChunk = formData.get('isLastChunk') === '1';
            const files = formData.getAll('pages');
            // 'imgbb' (varsayılan), 'vercel' veya 'supabase' — istemciden gelen depolama tercihi
            const storageProvider = ['vercel', 'supabase'].includes(formData.get('storageProvider')) ? formData.get('storageProvider') : 'imgbb';

            if (!files || files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });

            // Filter to only actual image files — also match by extension since Windows folder
            // picker often sends files with f.type="" even for valid JPGs
            const IMAGE_EXT = /\.(jpe?g|jpg|png|webp|gif|avif|bmp)$/i;
            const imageFiles = files.filter(f =>
                f && typeof f.arrayBuffer === 'function' && f.size > 0 &&
                (
                    (f.type && f.type.startsWith('image/')) ||
                    IMAGE_EXT.test(f.name || '')
                )
            );

            if (imageFiles.length === 0) return NextResponse.json({ error: 'No valid image files found' }, { status: 400 });

            // Watermark ayarlarını veritabanından oku
            const wmKeys = ['watermark_enabled', 'watermark_path', 'watermark_position', 'watermark_opacity', 'watermark_scale'];
            const wmRows = await db.prepare(`SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (${wmKeys.map(() => '?').join(',')})`)
                .all(...wmKeys);
            const wmSettings = Object.fromEntries(wmRows.map(r => [r.setting_key, r.setting_value]));
            const watermarkOptions = {
                enabled: wmSettings.watermark_enabled || '0',
                path: wmSettings.watermark_path || '', // imgbb URL
                position: wmSettings.watermark_position || 'bottom-right',
                opacity: wmSettings.watermark_opacity || '60',
                scale: wmSettings.watermark_scale || '15'
            };

            // Get the current max page number for this chapter
            const maxPage = await db.prepare('SELECT MAX(page_number) as max FROM pages WHERE chapter_id = ?').get(chapterId);
            const startNum = (maxPage?.max || 0) + 1;

            const uploaded = [];
            const errors = [];
            let pageNum = startNum;

            // ── Bölüm başı görseli ekle (sadece ilk yüklemede, etkinse) ──
            // imgbb'de barındırılan paylaşılan görselin URL'i doğrudan referans olarak eklenir
            if (startNum === 1) {
                const csiRows = await db.prepare(
                    "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('chapter_start_image_enabled', 'chapter_start_image_path')"
                ).all();
                const csiSettings = Object.fromEntries(csiRows.map(r => [r.setting_key, r.setting_value]));

                if (
                    csiSettings.chapter_start_image_enabled === '1' &&
                    csiSettings.chapter_start_image_path
                ) {
                    try {
                        await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum, csiSettings.chapter_start_image_path);
                        uploaded.push(csiSettings.chapter_start_image_path);
                        pageNum++;
                    } catch (startErr) {
                        console.warn('Bölüm başı görseli eklenemedi:', startErr.message);
                    }
                }
            }

            for (const file of imageFiles) {
                try {
                    const rawBuffer = Buffer.from(await file.arrayBuffer());
                    let optimizedBuffer;
                    try {
                        // Try to convert to WebP and resize (with optional watermark)
                        optimizedBuffer = await optimizeChapterPage(rawBuffer, watermarkOptions);
                    } catch (convErr) {
                        // Fallback: upload original if WebP conversion fails
                        console.warn(`WebP conversion failed for ${file.name}, uploading original:`, convErr.message);
                        optimizedBuffer = rawBuffer;
                    }
                    const { url: imagePath } = await uploadImage(optimizedBuffer, `page_${chapterId}_${String(pageNum).padStart(3, '0')}`, storageProvider);
                    await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum, imagePath);
                    uploaded.push(imagePath);
                    pageNum++;
                } catch (fileErr) {
                    console.error(`Failed to process file ${file.name}:`, fileErr.message);
                    errors.push(file.name || `file-${pageNum}`);
                }
            }

            // ── Bölüm sonu görseli ekle (sadece son chunk'ta, etkinse ve dosya varsa) ──
            if (!isLastChunk) {
                return NextResponse.json({
                    uploaded,
                    errors,
                    message: `${uploaded.length} pages uploaded${errors.length ? `, ${errors.length} failed` : ''}`
                }, { status: 201 });
            }

            const ceiRows = await db.prepare(
                "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('chapter_end_image_enabled', 'chapter_end_image_path')"
            ).all();
            const ceiSettings = Object.fromEntries(ceiRows.map(r => [r.setting_key, r.setting_value]));

            // ── Bölüm sonu görseli ekle ──
            // imgbb'de barındırılan paylaşılan görselin URL'i doğrudan referans olarak eklenir
            if (
                ceiSettings.chapter_end_image_enabled === '1' &&
                ceiSettings.chapter_end_image_path
            ) {
                try {
                    await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)').run(chapterId, pageNum, ceiSettings.chapter_end_image_path);
                    uploaded.push(ceiSettings.chapter_end_image_path);
                } catch (endErr) {
                    console.warn('Bölüm sonu görseli eklenemedi:', endErr.message);
                }
            }

            await invalidateSeriesCaches();
            return NextResponse.json({
                uploaded,
                errors,
                message: `${uploaded.length} pages uploaded${errors.length ? `, ${errors.length} failed` : ''}`
            }, { status: 201 });
        }

        if (action === 'delete-page') {
            const db = await getDb();
            const pageId = formData.get('pageId');
            // imgbb'de barındırılan görselleri API üzerinden silmiyoruz (delete_url
            // veritabanında tutulmuyor) — sadece veritabanı kaydı kaldırılıyor.
            await db.prepare('DELETE FROM pages WHERE id = ?').run(pageId);
            await invalidateSeriesCaches();
            return NextResponse.json({ message: 'Page deleted' });
        }

        if (action === 'reorder-pages') {
            const db = await getDb();
            // pages: JSON string of [{id, page_number}, ...]
            const pagesJson = formData.get('pages');
            if (!pagesJson) return NextResponse.json({ error: 'pages required' }, { status: 400 });
            let pages;
            try { pages = JSON.parse(pagesJson); } catch { return NextResponse.json({ error: 'Invalid pages JSON' }, { status: 400 }); }
            const updatePage = db.prepare('UPDATE pages SET page_number = ? WHERE id = ?');
            const updateMany = db.transaction(async (items) => {
                for (const { id, page_number } of items) {
                    await updatePage.run(page_number, id);
                }
            });
            await updateMany(pages);
            await invalidateSeriesCaches();
            return NextResponse.json({ success: true, message: 'Sayfa sıralaması güncellendi' });
        }

        if (action === 'delete-user') {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('DELETE FROM users WHERE id = ? AND role != ?').run(userId, 'admin');
            return NextResponse.json({ message: 'User deleted' });
        }

        if (action === 'change-user-role') {
            const db = await getDb();
            const userId = formData.get('userId');
            const role = formData.get('role');

            // Built-in roles
            const builtInRoles = ['user', 'team_member', 'moderator', 'manager'];
            if (user.role === 'admin') builtInRoles.push('admin');

            // Also allow custom role names from custom_roles setting
            try {
                const customRolesRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                if (customRolesRow?.setting_value) {
                    const customRoles = JSON.parse(customRolesRow.setting_value);
                    customRoles.forEach(r => builtInRoles.push(r.name));
                }
            } catch {}

            if (!builtInRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

            // Admin log
            try {
                const targetUser = await db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    user.id, user.username, 'change_role', `${targetUser?.username || userId}: role → ${role}`
                );
            } catch {}

            return NextResponse.json({ message: `User role updated to ${role}` });
        }

        if (action === 'reset-user-points') {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('UPDATE users SET yomi_points = 0 WHERE id = ?').run(userId);
            return NextResponse.json({ message: 'User points reset' });
        }

        if (action === 'add-user-points') {
            const db = await getDb();
            const userId = formData.get('userId');
            const points = Math.max(-1000000, Math.min(1000000, parseInt(formData.get('points')) || 0));
            await db.prepare('UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?').run(points, userId);
            return NextResponse.json({ message: `Added ${points} Asteria Scans Points to user` });
        }

        if (action === 'delete-comment') {
            const db = await getDb();
            const commentId = formData.get('commentId');
            await db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
            return NextResponse.json({ message: 'Comment deleted' });
        }

        if (action === 'delete-all-user-comments') {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId);
            return NextResponse.json({ message: 'All user comments deleted' });
        }

        if (action === 'delete-series') {
            const db = await getDb();
            const seriesId = formData.get('seriesId');
            if (!seriesId) {
                return NextResponse.json({ error: 'seriesId gerekli' }, { status: 400 });
            }

            // Seriye ait kapak görselini önceden al (silmeden önce yol gerekli)
            const seriesRow = await db.prepare('SELECT cover_url, title FROM series WHERE id = ?').get(seriesId);
            if (!seriesRow) {
                return NextResponse.json({ error: 'Seri bulunamadı' }, { status: 404 });
            }

            // Eski (yerel disk) dosyalar varsa temizle — tek sorguyla (bölüm başına N sorgu yok).
            // imgbb'deki görseller zaten harici; DB kayıtları aşağıda set-tabanlı silinir.
            const legacyPages = await db.prepare(
                "SELECT p.image_path FROM pages p JOIN chapters c ON c.id = p.chapter_id WHERE c.series_id = ? AND p.image_path LIKE '/uploads/%'"
            ).all(seriesId);
            for (const p of legacyPages) {
                if (isSharedChapterImage(p.image_path)) continue;
                const filePath = joinPath(process.cwd(), 'public', p.image_path);
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { }
            }
            await db.prepare('DELETE FROM translations WHERE page_id IN (SELECT p.id FROM pages p JOIN chapters c ON c.id = p.chapter_id WHERE c.series_id = ?)').run(seriesId);
            await db.prepare('DELETE FROM pages WHERE chapter_id IN (SELECT id FROM chapters WHERE series_id = ?)').run(seriesId);
            // Delete associated comments, chapters, favorites, then the series
            await db.prepare('DELETE FROM comments WHERE series_id = ? OR chapter_id IN (SELECT id FROM chapters WHERE series_id = ?)').run(seriesId, seriesId);
            await db.prepare('DELETE FROM favorites WHERE series_id = ?').run(seriesId);
            try { await db.prepare('DELETE FROM reading_lists WHERE series_id = ?').run(seriesId); } catch {}
            try { await db.prepare('DELETE FROM series_reactions WHERE series_id = ?').run(seriesId); } catch {}
            try { await db.prepare('DELETE FROM series_views_log WHERE series_id = ?').run(seriesId); } catch {}
            try { await db.prepare('DELETE FROM scraper_pending_chapters WHERE series_id = ?').run(seriesId); } catch {}
            try { await db.prepare('DELETE FROM scraper_sources WHERE series_id = ?').run(seriesId); } catch {}
            try { await db.prepare('DELETE FROM scraper_jobs WHERE series_id = ?').run(seriesId); } catch {}
            await db.prepare('DELETE FROM chapters WHERE series_id = ?').run(seriesId);
            const deletedSeries = await db.prepare('DELETE FROM series WHERE id = ?').run(seriesId);
            if (!deletedSeries?.changes) {
                return NextResponse.json({ error: 'Seri silinemedi' }, { status: 500 });
            }

            // Seriye ait kapak görselini sil (/uploads/covers/ altındaki — demo/varsayılan görseller korunur)
            if (seriesRow?.cover_url && seriesRow.cover_url.startsWith('/uploads/covers/')) {
                const coverFile = joinPath(process.cwd(), 'public', seriesRow.cover_url);
                try { if (fs.existsSync(coverFile)) fs.unlinkSync(coverFile); } catch { }
            }

            // Aktivite logu
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, 'delete_series', `Deleted series ID: ${seriesId} (${seriesRow?.title || ''})`
            );
            await invalidateSeriesCaches();
            return NextResponse.json({ message: 'Series deleted' });
        }

        if (action === 'bulk-update-cover') {
            const db = await getDb();
            let seriesIds = [];
            try { seriesIds = JSON.parse(formData.get('seriesIds') || '[]'); } catch { }
            if (!Array.isArray(seriesIds) || seriesIds.length === 0) {
                return NextResponse.json({ error: 'seriesIds gerekli' }, { status: 400 });
            }
            const coverFile = formData.get('cover');
            if (!coverFile || !coverFile.name) {
                return NextResponse.json({ error: 'Kapak görseli gerekli' }, { status: 400 });
            }
            if (!coverFile.type?.startsWith('image/')) {
                return NextResponse.json({ error: 'Geçersiz kapak dosyası. Bir görsel seçin.' }, { status: 400 });
            }
            if (coverFile.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: 'Kapak dosyası en fazla 5MB olabilir.' }, { status: 400 });
            }

            // ÖNEMLİ: Bu görsel dosya sistemine (public/uploads/covers) YAZILMAZ.
            // Vercel'in serverless fonksiyonları salt-okunur bir dosya sisteminde
            // çalışır ve deploy'lar arası hiçbir yazma kalıcı olmaz — önceki
            // sürüm fs.writeFileSync kullanıyordu, bu da prod'da sessizce
            // (catch{} içinde yutularak) başarısız oluyor, "0 serinin kapak
            // görseli güncellendi" gibi belirsiz bir sonuç veriyordu. Diğer tüm
            // kapak yükleme noktalarıyla (tekli seri ekle/düzenle) tutarlı
            // olacak şekilde artık imgbb'ye yükleniyor.
            const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
            let optimizedBuffer;
            try {
                optimizedBuffer = await optimizeCoverImage(rawBuffer);
            } catch (coverOptErr) {
                console.error('Bulk cover optimization failed, uploading original:', coverOptErr.message);
                optimizedBuffer = rawBuffer;
            }

            let coverUrl;
            try {
                const { url } = await uploadToImgbb(optimizedBuffer, `cover_bulk_${uuidv4()}`);
                coverUrl = url;
            } catch (uploadErr) {
                console.error('Bulk cover upload error:', uploadErr.message);
                return NextResponse.json({ error: `Kapak yüklenemedi: ${uploadErr.message}` }, { status: 502 });
            }

            // Aynı görsel URL'sini seçili tüm serilere ata — tekli yükleme
            // tekrarlanmasın diye tek bir imgbb yüklemesi paylaşılır.
            let updated = 0;
            const failed = [];
            for (const sid of seriesIds) {
                try {
                    const result = await db.prepare('UPDATE series SET cover_url = ? WHERE id = ?').run(coverUrl, sid);
                    if (result?.changes) updated++;
                    else failed.push(sid);
                } catch (err) {
                    console.error(`Bulk cover DB update failed for series #${sid}:`, err.message);
                    failed.push(sid);
                }
            }

            await invalidateSeriesCaches();
            return NextResponse.json({
                success: true,
                message: `${updated} serinin kapak görseli güncellendi${failed.length > 0 ? `, ${failed.length} tanesi başarısız oldu` : ''}`,
                updated,
                failed,
            });
        }

        if (action === 'bulk-delete-series') {
            const db = await getDb();
            let seriesIds = [];
            try { seriesIds = JSON.parse(formData.get('seriesIds') || '[]'); } catch { }
            if (!Array.isArray(seriesIds) || seriesIds.length === 0) {
                return NextResponse.json({ error: 'seriesIds gerekli' }, { status: 400 });
            }
            let deleted = 0;
            for (const sid of seriesIds) {
                const seriesRow = await db.prepare('SELECT cover_url, title FROM series WHERE id = ?').get(sid);
                if (!seriesRow) continue;
                const chapters = await db.prepare('SELECT id, thumbnail_url FROM chapters WHERE series_id = ?').all(sid);
                for (const ch of chapters) {
                    const pages = await db.prepare('SELECT image_path FROM pages WHERE chapter_id = ?').all(ch.id);
                    for (const p of pages) {
                        if (isSharedChapterImage(p.image_path)) continue;
                        try { const fp = joinPath(process.cwd(), 'public', p.image_path); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { }
                    }
                    await db.prepare('DELETE FROM translations WHERE page_id IN (SELECT id FROM pages WHERE chapter_id = ?)').run(ch.id);
                    await db.prepare('DELETE FROM pages WHERE chapter_id = ?').run(ch.id);
                    const chDir = pagesDir(ch.id);
                    try { if (fs.existsSync(chDir)) fs.rmSync(chDir, { recursive: true, force: true }); } catch { }
                    if (ch.thumbnail_url && ch.thumbnail_url.startsWith('/uploads/thumbnails/')) {
                        try { const tf = joinPath(process.cwd(), 'public', ch.thumbnail_url); if (fs.existsSync(tf)) fs.unlinkSync(tf); } catch { }
                    }
                }
                await db.prepare('DELETE FROM comments WHERE series_id = ?').run(sid);
                await db.prepare('DELETE FROM comments WHERE chapter_id IN (SELECT id FROM chapters WHERE series_id = ?)').run(sid);
                await db.prepare('DELETE FROM favorites WHERE series_id = ?').run(sid);
                try { await db.prepare('DELETE FROM reading_lists WHERE series_id = ?').run(sid); } catch {}
                await db.prepare('DELETE FROM chapters WHERE series_id = ?').run(sid);
                await db.prepare('DELETE FROM series WHERE id = ?').run(sid);
                if (seriesRow.cover_url && seriesRow.cover_url.startsWith('/uploads/covers/')) {
                    try { const cf = joinPath(process.cwd(), 'public', seriesRow.cover_url); if (fs.existsSync(cf)) fs.unlinkSync(cf); } catch { }
                }
                deleted++;
            }
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, 'bulk_delete_series', `Deleted ${deleted} series: ${seriesIds.join(', ')}`
            );
            await invalidateSeriesCaches();
            return NextResponse.json({ message: `${deleted} seri silindi` });
        }

        if (action === 'ban_user') {
            const db = await getDb();
            const userId = formData.get('userId');
            const days = formData.get('days') ? parseInt(formData.get('days')) : null;
            if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

            let bannedUntil = null;
            if (days && days > 0) {
                const date = new Date();
                date.setDate(date.getDate() + days);
                bannedUntil = date.toISOString();
            }

            await db.prepare('UPDATE users SET banned_until = ? WHERE id = ?').run(bannedUntil, userId);

            // Aktivite logu
            const actionText = days && days > 0
                ? `Banned user ID ${userId} for ${days} days`
                : `Unbanned user ID ${userId}`;
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, days && days > 0 ? 'ban_user' : 'unban_user', actionText
            );

            return NextResponse.json({ success: true, bannedUntil });
        }

        if (action === 'delete-media') {
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

            const db = await getDb();
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

        // ── Medya kütüphanesine görsel yükleme ──
        if (action === 'upload-media') {
            if (!['admin', 'manager'].includes(user.role)) {
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

        // ── Site görseli yükleme (logo, favicon, og-image) ──
        if (action === 'upload-site-asset') {
            if (!['admin', 'manager'].includes(user.role)) {
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

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('POST /api/admin error:', error);
        return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
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

        // Media listing
        if (action === 'list-media') {
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

        // ── Medya: Seri bazlı klasör görünümü ──
        // Tüm serileri bölüm/kapak sayısıyla birlikte döndürür (medya klasörü navigasyonu için)
        if (action === 'list-media-folders') {
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

        // ── Medya: Belirli bir serinin bölümlerini listele ──
        if (action === 'list-media-series-chapters') {
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

        // ── Medya: Belirli bir bölümün sayfalarını listele ──
        if (action === 'list-media-chapter-pages') {
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

        // ── Medya: Kullanıcı Klasörleri — her kullanıcıyı klasör olarak listele ──
        if (action === 'list-user-folders') {
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

        // ── Medya: Belirli bir kullanıcının görsellerini listele ──
        if (action === 'list-user-folder-detail') {
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
        if (action === 'list_users') {
            const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

            const totalCount = await (db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
            const totalPages = Math.ceil(totalCount / limit);
            const users = await db.prepare('SELECT id, username, email, role, yomi_points, created_at, banned_until FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);

            return NextResponse.json({ users, pagination: { page, limit, totalPages, totalCount } });
        }

        // Paginated series list
        if (action === 'list_series') {
            const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

            const totalCount = await (db.prepare('SELECT COUNT(*) as count FROM series').get()).count;
            const totalPages = Math.ceil(totalCount / limit);
            const series = await db.prepare(`
                SELECT s.id, s.title, s.slug, s.status, s.views, s.rating, s.published, s.cover_url, s.created_at,
                    (SELECT COUNT(*) FROM chapters WHERE series_id = s.id) as chapter_count
                FROM series s ORDER BY s.created_at DESC LIMIT ? OFFSET ?
            `).all(limit, offset);

            return NextResponse.json({ series, pagination: { page, limit, totalPages, totalCount } });
        }

        // Son 7 günlük okuma istatistikleri
        if (action === 'reading_stats') {
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

        // If requesting a specific series detail for admin
        if (seriesId) {
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
            totalSeries: await (db.prepare('SELECT COUNT(*) as count FROM series').get()).count,
            totalPublished: await (db.prepare("SELECT COUNT(*) as count FROM series WHERE published=1").get()).count,
            totalChapters: await (db.prepare('SELECT COUNT(*) as count FROM chapters').get()).count,
            totalPages: await (db.prepare('SELECT COUNT(*) as count FROM pages').get()).count,
            totalUsers: await (db.prepare('SELECT COUNT(*) as count FROM users').get()).count,
            totalComments: await (db.prepare('SELECT COUNT(*) as count FROM comments').get()).count,
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
    } catch (error) {
        console.error('GET /api/admin error:', error);
        return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
    }
}
