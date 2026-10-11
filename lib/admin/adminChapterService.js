import { NextResponse, after } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { optimizeChapterPage } from '@/lib/imageOptimizer';
import { uploadToImgbb } from '@/lib/imgbb';
import { uploadImage } from '@/lib/vercelBlob';
import { invalidateSeriesCaches } from '@/lib/seriesCache';
import { joinPath, pagesDir, isSharedChapterImage, toWebP } from './adminHelpers.js';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export async function handleUpdateChapter(formData, user) {
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

export async function handleUploadThumbnail(formData, user) {
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

export async function handleAutoThumbnail(formData, user) {
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

export async function handleAddChapter(formData, user) {
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

export async function handleDeleteChapter(formData, user) {
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

export async function handleDeleteAllChapters(formData, user) {
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

export async function handleDeleteSelectedChapters(formData, user) {
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

export async function handleUploadPageChunk(formData, user) {
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

export async function handleUploadPages(formData, user) {
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

export async function handleDeletePage(formData, user) {
            const db = await getDb();
            const pageId = formData.get('pageId');
            // imgbb'de barındırılan görselleri API üzerinden silmiyoruz (delete_url
            // veritabanında tutulmuyor) — sadece veritabanı kaydı kaldırılıyor.
            await db.prepare('DELETE FROM pages WHERE id = ?').run(pageId);
            await invalidateSeriesCaches();
            return NextResponse.json({ message: 'Page deleted' });

}

export async function handleReorderPages(formData, user) {
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
