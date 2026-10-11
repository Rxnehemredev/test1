/**
 * Manga Scraper Coordinator — v2.2 (Modular Architecture)
 * Providers located in lib/scrapers/providers/
 */
import 'server-only';

import {
    fetchHtml,
    downloadImage,
    detectSiteType,
    normalizeScrapedResult,
} from './scrapers/utils.js';

import { scrapeMangaDex, fetchMangaDexPages } from './scrapers/providers/mangadex.js';
import { scrapeComick, fetchComickPages } from './scrapers/providers/comick.js';
import { scrapeAsuraScans } from './scrapers/providers/asura.js';
import { scrapeDemonicScans } from './scrapers/providers/demonic.js';
import { scrapeComixTo } from './scrapers/providers/comixto.js';
import { scrapeManganato } from './scrapers/providers/manganato.js';
import { scrapeGeneric, fetchHtmlChapterPages } from './scrapers/providers/generic.js';

export { fetchHtml, downloadImage, detectSiteType, fetchHtmlChapterPages };

export async function scrapeSeriesInfo(url, options = {}) {
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Geçerli bir kaynak URL adresi girin.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Kaynak URL adresi http veya https ile başlamalıdır.');
    }

    const type = detectSiteType(url);
    const language = options.language || 'en';
    let result;
    switch (type) {
        case 'mangadex': result = await scrapeMangaDex(url, language); break;
        case 'comick': result = await scrapeComick(url); break;
        case 'asurascans': result = await scrapeAsuraScans(url); break;
        case 'demonicscans': result = await scrapeDemonicScans(url); break;
        case 'comixto': result = await scrapeComixTo(url); break;
        case 'manganato': result = await scrapeManganato(url); break;
        default: result = await scrapeGeneric(url); break;
    }
    return normalizeScrapedResult(result, url);
}

export async function fetchChapterPages(chapter) {
    if (chapter.pages_source === 'mangadex' && chapter.mangadex_id) return fetchMangaDexPages(chapter.mangadex_id);
    if (chapter.pages_source === 'comick' && chapter.comick_hid) return fetchComickPages(chapter.comick_hid);
    const chapterUrl = chapter.chapter_url;
    if (!chapterUrl) return [];
    return fetchHtmlChapterPages(chapterUrl);
}

const PAGE_CONCURRENCY = 5;

export async function downloadAndSaveChapterPages(db, chapterId, pageUrls, referer = '') {
    // Eski sayfa kayıtlarını temizle
    await db.prepare('DELETE FROM pages WHERE chapter_id = ?').run(chapterId);

    const results = new Array(pageUrls.length).fill(null);
    let cursor = 0;

    async function worker() {
        while (true) {
            const i = cursor++;
            if (i >= pageUrls.length) return;
            try {
                results[i] = await downloadImage(pageUrls[i], i + 1, referer);
            } catch (err) {
                console.error(`Page ${i + 1} download failed for chapter ${chapterId}:`, err.message);
            }
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(PAGE_CONCURRENCY, pageUrls.length) }, () => worker())
    );

    const saved = [];
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r) continue;
        await db.prepare('INSERT INTO pages (chapter_id, page_number, image_path, width, height) VALUES (?, ?, ?, ?, ?)')
            .run(chapterId, i + 1, r.url, r.width, r.height);
        saved.push(r.url);
    }
    return saved;
}

export async function syncAllSources(db) {
    const sources = await db.prepare('SELECT * FROM scraper_sources WHERE auto_sync=1').all();
    const results = [];

    for (const src of sources) {
        try {
            const { chapters } = await scrapeSeriesInfo(src.source_url, { language: src.language || 'en' });

            const existingChapters = await db.prepare('SELECT chapter_number FROM chapters WHERE series_id = ?').all(src.series_id);
            const existingPending = await db.prepare(
                "SELECT chapter_number FROM scraper_pending_chapters WHERE series_id = ? AND status IN ('pending', 'processing')"
            ).all(src.series_id);
            const existingNums = new Set([
                ...existingChapters.map(c => c.chapter_number),
                ...existingPending.map(c => c.chapter_number),
            ]);
            const newChaps = chapters.filter(c => !existingNums.has(c.chapter_number));

            const maxChap = chapters.reduce((m, c) => Math.max(m, c.chapter_number), 0);
            await db.prepare('UPDATE scraper_sources SET last_checked=CURRENT_TIMESTAMP, last_chapter_found=? WHERE id=?').run(maxChap, src.id);

            for (const ch of newChaps) {
                await db.prepare(
                    'INSERT OR IGNORE INTO scraper_pending_chapters (series_id, chapter_number, chapter_title, source_url, pages_json, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(
                    src.series_id,
                    ch.chapter_number,
                    ch.title || (src.language === 'tr' ? `Bölüm ${ch.chapter_number}` : `Chapter ${ch.chapter_number}`),
                    ch.chapter_url || src.source_url,
                    JSON.stringify(ch),
                    'pending'
                );
            }

            const series = await db.prepare('SELECT title FROM series WHERE id=?').get(src.series_id);
            results.push({ source_id: src.id, series_id: src.series_id, title: series?.title, new_chapters: newChaps.length });
        } catch (err) {
            console.error(`[scraper-bot] Kaynak #${src.id} (${src.source_url}) eşitlenirken hata:`, err.message);
            results.push({ source_id: src.id, series_id: src.series_id, error: err.message, new_chapters: 0 });
        }
    }

    const totalNew = results.reduce((s, r) => s + (r.new_chapters || 0), 0);
    return { synced: sources.length, total_new: totalNew, results };
}
