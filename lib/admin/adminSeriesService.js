import { NextResponse, after } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { optimizeCoverImage } from '@/lib/imageOptimizer';
import { uploadToImgbb } from '@/lib/imgbb';
import { invalidateSeriesCaches } from '@/lib/seriesCache';
import { joinPath, pagesDir, isSharedChapterImage, makeUniqueSlug } from './adminHelpers.js';

export async function handleAddSeries(formData, user) {
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
    try { await db.prepare('ALTER TABLE series ADD COLUMN alt_names TEXT DEFAULT ""').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE series ADD COLUMN is_adult INTEGER DEFAULT 0').run(); } catch(e) {}
    const result = await db.prepare(
        'INSERT INTO series (title, slug, description, cover_url, author, artist, status, type, genres, rating, published, alt_names, is_adult) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title, slug, description, coverUrl, author, artist, status, type, genres, rating, published, altNames, isAdult);

    await invalidateSeriesCaches();

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

export async function handleUpdateSeries(formData, user) {
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
            console.error('Cover upload error:', coverErr.message);
            return NextResponse.json({ error: `Kapak yüklenemedi: ${coverErr.message}` }, { status: 502 });
        }
    }

    const existing = await db.prepare('SELECT title, slug FROM series WHERE id = ?').get(seriesId);
    let slug = existing?.slug;
    const isCorruptSlug = !slug || slug.includes('%') || slug.includes('?') || slug.includes('/');
    if (isCorruptSlug || (existing?.title !== title)) {
        slug = await makeUniqueSlug(db, title, seriesId);
    }

    const isAdult = parseInt(formData.get('is_adult')) === 1 ? 1 : 0;
    try { await db.prepare('ALTER TABLE series ADD COLUMN alt_names TEXT DEFAULT ""').run(); } catch(e) {}
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

export async function handleDeleteSeries(formData, user) {
    const db = await getDb();
    const seriesId = formData.get('seriesId');
    if (!seriesId) {
        return NextResponse.json({ error: 'seriesId gerekli' }, { status: 400 });
    }

    const seriesRow = await db.prepare('SELECT cover_url, title FROM series WHERE id = ?').get(seriesId);
    if (!seriesRow) {
        return NextResponse.json({ error: 'Seri bulunamadı' }, { status: 404 });
    }

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

    if (seriesRow.cover_url && seriesRow.cover_url.startsWith('/uploads/covers/')) {
        const coverPath = joinPath(process.cwd(), 'public', seriesRow.cover_url);
        try { if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath); } catch { }
    }

    await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
        user.id, user.username, 'delete_series', `Deleted series: ${seriesRow.title} (ID: ${seriesId})`
    );
    await invalidateSeriesCaches();
    return NextResponse.json({ message: 'Seri başarıyla silindi' });
}

export async function handleBulkUpdateCover(formData, user) {
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

export async function handleBulkDeleteSeries(formData, user) {
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
