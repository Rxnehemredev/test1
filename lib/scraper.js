/**
 * Manga Scraper Library — v2.1
 * Supports: MangaDex API, Comick API, AsuraScans, DemonicScans, Comix.to,
 *           WordPress/WP-Manga sites, and generic HTML readers
 */

// This module runs exclusively on the server — prevents Turbopack from
// statically tracing the dynamic file-system paths in this file.
import 'server-only';

import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { optimizeChapterPage } from './imageOptimizer.js';
import { uploadToImgbb } from './imgbb.js';
import { safeFetch } from './security/ssrfGuard.js';

// ── Browser-like headers ──────────────────────────────────────────────────────
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

// ── Cloudflare challenge detection ────────────────────────────────────────────
function isCloudflareChallenge(status, html) {
    if (status === 403 || status === 503) return true;
    if (!html) return false;
    // Cloudflare challenge pages contain these markers
    return (
        html.includes('cf-browser-verification') ||
        html.includes('cf_clearance') ||
        html.includes('Cloudflare Ray ID') ||
        html.includes('cf-error-type') ||
        html.includes('Just a moment') ||
        html.includes('Checking your browser') ||
        html.includes('DDoS protection by Cloudflare') ||
        html.includes('challenge-platform')
    );
}

// ── Utility: fetch HTML ───────────────────────────────────────────────────────
export async function fetchHtml(url, extraHeaders = {}, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await safeFetch(url, {
            signal: controller.signal,
            headers: { ...BROWSER_HEADERS, ...extraHeaders },
            redirect: 'follow',
        });
        const html = await res.text();
        if (!res.ok) {
            if (isCloudflareChallenge(res.status, html)) {
                throw new Error(`CLOUDFLARE_PROTECTED: This site (${new URL(url).hostname}) is protected by Cloudflare and cannot be scraped automatically. Please add the series manually or use a supported source like MangaDex or Comick.`);
            }
            throw new Error(`HTTP ${res.status} from ${url}`);
        }
        if (isCloudflareChallenge(res.status, html)) {
            throw new Error(`CLOUDFLARE_PROTECTED: This site (${new URL(url).hostname}) is protected by Cloudflare and cannot be scraped automatically. Please add the series manually or use a supported source like MangaDex or Comick.`);
        }
        return html;
    } finally {
        clearTimeout(timer);
    }
}

// ── Utility: fetch JSON ───────────────────────────────────────────────────────
async function fetchJson(url, extraHeaders = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await safeFetch(url, {
            signal: controller.signal,
            headers: { ...BROWSER_HEADERS, 'Accept': 'application/json, text/plain, */*', ...extraHeaders },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ── Utility: download image ───────────────────────────────────────────────────
export async function downloadImage(imageUrl, pageNum, referer = '') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
        const origin = (() => { try { return new URL(imageUrl).origin; } catch { return ''; } })();
        const res = await safeFetch(imageUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': BROWSER_HEADERS['User-Agent'],
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': referer || origin + '/',
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'cross-site',
            },
        });
        if (!res.ok) throw new Error(`Image HTTP ${res.status} for ${imageUrl}`);

        const rawBuffer = Buffer.from(await res.arrayBuffer());

        let optimizedBuffer;
        try {
            // Optimize: max 1200px wide, WebP quality 85
            optimizedBuffer = await optimizeChapterPage(rawBuffer);
        } catch (sharpErr) {
            console.error(`Sharp chapter page optimization failed for page ${pageNum}:`, sharpErr.message);
            optimizedBuffer = rawBuffer;
        }

        // Okuyucu (webtoon modu) sayfa yüklenirken doğru yükseklikte yer
        // ayırabilsin diye gerçek boyutları da çıkarıyoruz. Bu olmadan
        // (width/height = 0) sayfa kutusu yüklenene kadar 0px yükseklikte
        // kalıyor ve alt alta dizili sayfalar birbirine biniyor.
        let width = 0;
        let height = 0;
        try {
            const meta = await sharp(optimizedBuffer).metadata();
            width = meta.width || 0;
            height = meta.height || 0;
        } catch (dimErr) {
            console.error(`Image dimension read failed for page ${pageNum}:`, dimErr.message);
        }

        const { url } = await uploadToImgbb(optimizedBuffer, `page_${pageNum}_${Date.now()}`);
        return { url, width, height };
    } finally {
        clearTimeout(timer);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chapter number helpers — the core of correct parsing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract chapter number from a URL path segment.
 * Looks for patterns like: /chapter-56/, /chapter/56, -chapter-56, _ch56
 * Returns null if not found.
 */
function extractChapterNumFromUrl(href) {
    if (!href) return null;
    const patterns = [
        // Comix.to: /title/slug/8934977-chapter-102  (ID-chapter-NUM at end)
        /\/\d+-chapter-([\d]+(?:[._][\d]+)?)(?:\/|$)/i,
        // Most common: /chapter-56/, /chapter-56.5/, /chapter/56
        /\/chapter[s]?[-_\/]+([\d]+(?:[._][\d]+)?)/i,
        /[-_]ch(?:apter)?[-_]?([\d]+(?:[._][\d]+)?)/i,
        /chapter=([\d]+(?:\.[\d]+)?)/i,
        /\/ep(?:isode)?[-_\/]+([\d]+(?:[._][\d]+)?)/i,
    ];
    for (const re of patterns) {
        const m = href.match(re);
        if (m) {
            const num = parseFloat(m[1].replace(/_/g, '.'));
            if (isValidChapterNum(num)) return num;
        }
    }
    return null;
}

/**
 * Extract chapter number from visible text.
 * "Chapter 56", "Ch. 56", "56", "Episode 3" etc.
 * MUST be explicit chapter label; bare numbers alone are rejected to avoid IDs.
 */
function extractChapterNumFromText(text) {
    if (!text) return null;
    const m = text.match(/(?:chapter|chap|ch\.?|episode|ep\.?)\s*[#]?\s*([\d]+(?:[._][\d]+)?)/i);
    if (m) {
        const num = parseFloat(m[1].replace(/_/g, '.'));
        if (isValidChapterNum(num)) return num;
    }
    return null;
}

/** Chapter numbers must be between 0.1 and 9999 */
function isValidChapterNum(num) {
    return typeof num === 'number' && !isNaN(num) && num > 0 && num <= 9999;
}

/**
 * Clean a chapter title: remove trailing dates, navigation words, "Read" prefixes, etc.
 */
function cleanChapterTitle(rawText, chapterNum) {
    if (!rawText) return `Chapter ${chapterNum}`;
    let t = rawText
        .replace(/\s+/g, ' ')
        .trim()
        // Remove trailing dates like "2026-03-29", "Mar 29 2026", "29/03/2026"
        .replace(/\s*\d{4}[-/]\d{2}[-/]\d{2}\s*$/, '')
        .replace(/\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$/, '')
        .replace(/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\s*$/i, '')
        // Remove navigation prefixes like "Read", "First", "Last", "Latest" before "Chapter"
        .replace(/^(?:read\s+)?(?:first|last|latest|newest|prev(?:ious)?|next)\s+(?:chapter|chap|ch\.?)?\s*/i, '')
        .replace(/^read\s+/i, '')
        // Remove trailing "(new)" badges
        .replace(/\s*\(new\)\s*$/i, '')
        .trim();

    if (!t) return `Chapter ${chapterNum}`;

    // If the cleaned text is only navigation keywords, return plain Chapter X
    if (/^(?:first|last|latest|newest|prev(?:ious)?|next)\s*(?:chapter|chap|ch\.?)?$/i.test(t)) {
        return `Chapter ${chapterNum}`;
    }
    return t;
}

/** Make a URL absolute */
function makeAbsUrl(href, baseUrl) {
    if (!href) return '';
    try { return new URL(href, baseUrl).toString(); } catch { return href; }
}

/** Check if a URL looks like an image */
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
    if (/\.(js|css|html|htm|php|json|xml|ico|svg)(\?|$)/i.test(url)) return false;
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(url)) return true;
    if (url.includes('/uploads/') || url.includes('/images/') || url.includes('/manga/') ||
        url.includes('/chapter/') || url.includes('cdn.') || url.includes('storage.')) return true;
    return false;
}

function dedupeUrls(arr) {
    const seen = new Set();
    return arr.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
}

function normalizeScrapedResult(result, sourceUrl) {
    const meta = result?.meta || {};
    const absolute = value => value ? makeAbsUrl(value, sourceUrl) : null;
    const chapters = Array.isArray(result?.chapters) ? result.chapters : [];
    const chapterMap = new Map();

    for (const chapter of chapters) {
        const number = Number(chapter?.chapter_number);
        if (!isValidChapterNum(number) || chapterMap.has(number)) continue;
        chapterMap.set(number, {
            ...chapter,
            chapter_number: number,
            chapter_url: absolute(chapter.chapter_url || chapter.url || '') || '',
            title: chapter.title || `Chapter ${number}`,
        });
    }

    return {
        meta: {
            ...meta,
            title: String(meta.title || 'Unknown').replace(/\s+/g, ' ').trim(),
            description: meta.description || '',
            author: meta.author || '',
            artist: meta.artist || '',
            coverUrl: absolute(meta.coverUrl),
            genres: Array.isArray(meta.genres) ? [...new Set(meta.genres.filter(Boolean))] : [],
        },
        chapters: [...chapterMap.values()].sort((a, b) => a.chapter_number - b.chapter_number),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Site detection
// ═══════════════════════════════════════════════════════════════════════════════
export function detectSiteType(url) {
    const u = url.toLowerCase();
    if (u.includes('mangadex.org')) return 'mangadex';
    if (u.includes('comick.io') || u.includes('comick.fun')) return 'comick';
    // AsuraScans sık sık domain değiştiriyor (asurascans.com, asuracomic.net,
    // asurascanz.com, asuratoon.com, asurascansu.gg, vb.) — tek tek domain
    // eklemek yerine "asura" geçen tüm hostname'leri bu parser'a yönlendiriyoruz.
    if (u.includes('asura')) return 'asurascans';
    if (u.includes('demonicscans.org')) return 'demonicscans';
    if (u.includes('comix.to')) return 'comixto';
    if (u.includes('mangakakalot') || u.includes('manganato') || u.includes('readmanganato')) return 'manganato';
    if (u.includes('mangafire.to')) return 'mangafire';
    return 'generic';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MangaDex (official API — most reliable)
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeMangaDex(seriesUrl, language = 'en') {
    const match = seriesUrl.match(/mangadex\.org\/title\/([\w-]+)/);
    if (!match) throw new Error('Invalid MangaDex URL. Expected: https://mangadex.org/title/{id}/...');
    const mangaId = match[1];

    const infoData = await fetchJson(`https://api.mangadex.org/manga/${mangaId}?includes[]=author&includes[]=artist&includes[]=cover_art`);
    const manga = infoData.data;
    const attrs = manga.attributes;

    const title = attrs.title.en || Object.values(attrs.title)[0] || 'Unknown';
    const description = attrs.description?.en || Object.values(attrs.description || {})[0] || '';
    const authorRel = manga.relationships?.find(r => r.type === 'author');
    const artistRel = manga.relationships?.find(r => r.type === 'artist');
    const coverRel = manga.relationships?.find(r => r.type === 'cover_art');
    const author = authorRel?.attributes?.name || '';
    const artist = artistRel?.attributes?.name || '';
    const coverFile = coverRel?.attributes?.fileName;
    const coverUrl = coverFile ? `https://uploads.mangadex.org/covers/${mangaId}/${coverFile}` : null;
    const tags = (attrs.tags || []).map(t => t.attributes?.name?.en || '').filter(Boolean);

    const lang = language || 'en';
    const chapters = [];
    let offset = 0;
    while (true) {
        const data = await fetchJson(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=${lang}&order[chapter]=asc&limit=100&offset=${offset}`);
        const items = data.data || [];
        for (const ch of items) {
            const ca = ch.attributes;
            const chNum = parseFloat(ca.chapter);
            if (!isValidChapterNum(chNum)) continue;
            chapters.push({ chapter_number: chNum, title: ca.title || `Chapter ${chNum}`, mangadex_id: ch.id, pages_source: 'mangadex' });
        }
        if (items.length < 100) break;
        offset += 100;
    }

    return { meta: { title, description, status: attrs.status || 'ongoing', author, artist, coverUrl, genres: tags }, chapters };
}

async function fetchMangaDexPages(chapterId) {
    const data = await fetchJson(`https://api.mangadex.org/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = data;
    return chapter.data.map(f => `${baseUrl}/data/${chapter.hash}/${f}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comick.io (official API)
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeComick(seriesUrl) {
    const match = seriesUrl.match(/comick\.(io|fun)\/comic\/([\w-]+)/);
    if (!match) throw new Error('Invalid Comick URL. Expected: https://comick.io/comic/slug');
    const slug = match[2];

    const info = await fetchJson(`https://api.comick.fun/comic/${slug}?tachiyomi=true`);
    const comic = info.comic;
    const title = comic.title || slug;
    const author = (comic.authors || []).map(a => a.name).join(', ');
    const artist = (comic.artists || []).map(a => a.name).join(', ');

    const chapData = await fetchJson(`https://api.comick.fun/comic/${slug}/chapters?lang=en&limit=9999&tachiyomi=true`);
    const chapters = (chapData.chapters || [])
        .filter(c => c.chap && isValidChapterNum(parseFloat(c.chap)))
        .map(c => ({ chapter_number: parseFloat(c.chap), title: c.title || `Chapter ${c.chap}`, comick_hid: c.hid, pages_source: 'comick' }))
        .sort((a, b) => a.chapter_number - b.chapter_number);

    return {
        meta: { title, description: comic.desc || '', status: comic.status === 1 ? 'ongoing' : 'completed', author, artist, coverUrl: comic.cover_url || null, genres: (comic.genres || []).map(g => g.name) },
        chapters,
    };
}

async function fetchComickPages(hid) {
    const data = await fetchJson(`https://api.comick.fun/chapter/${hid}/`);
    return (data.chapter?.images || []).map(img => img.url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generic HTML-based chapter list builder (shared by HTML scrapers)
// Priority: extract number from URL (reliable), then from text label
// ═══════════════════════════════════════════════════════════════════════════════
function buildChapterListFromAnchors($, seriesUrl) {
    const chapterMap = new Map();
    const baseHost = (() => { try { return new URL(seriesUrl).hostname; } catch { return ''; } })();

    // First pass: dedicated chapter-list elements (Madara / WordPress themes)
    const chapterListSelectors = [
        'li.wp-manga-chapter',
        'li.chapter-item',
        '.eph-num',
        '.chapter-list li',
        'ul.version-chap li',
        '.chapters li',
        '.chapter-list-item',
    ];
    for (const sel of chapterListSelectors) {
        $(sel).each((_, el) => {
            const a = $(el).find('a').first();
            const href = a.attr('href') || '';
            if (!href) return;

            // Number: prefer URL pattern over text (avoids "Read First Chapter" trap)
            const numFromUrl = extractChapterNumFromUrl(href);
            // Text: only the direct text of the anchor, strip nested spans (dates etc)
            const directText = a.clone().children().remove().end().text().trim();
            const fullText = a.text().replace(/\s+/g, ' ').trim();
            const numFromText = extractChapterNumFromText(directText) || extractChapterNumFromText(fullText);
            const num = numFromUrl || numFromText;

            if (!num || !isValidChapterNum(num)) return;
            if (chapterMap.has(num)) return; // keep first (newest-first lists)

            const cleanTitle = cleanChapterTitle(directText || fullText, num);
            chapterMap.set(num, { url: makeAbsUrl(href, seriesUrl), title: cleanTitle });
        });
        if (chapterMap.size > 0) break;
    }

    // Second pass: scan all same-domain anchors if dedicated list not found
    if (chapterMap.size === 0) {
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || '';
            if (!href) return;

            // Must stay on same domain
            try {
                const linkHost = new URL(makeAbsUrl(href, seriesUrl)).hostname;
                if (linkHost !== baseHost) return;
            } catch { return; }

            // Number MUST come from URL for this pass (avoids "Read First Chapter" IDs)
            const num = extractChapterNumFromUrl(href);
            if (!num || !isValidChapterNum(num)) return;
            if (chapterMap.has(num)) return;

            const text = $(el).text().replace(/\s+/g, ' ').trim();
            // Reject navigation links: "Read First", "Read Latest", "Last Chapter", "First Chapter" etc.
            if (/^read\s+(first|latest|last)/i.test(text)) return;
            if (/^(first|last|latest|newest|previous|next)\s*(chapter|chap|ch)?$/i.test(text)) return;

            chapterMap.set(num, { url: makeAbsUrl(href, seriesUrl), title: cleanChapterTitle(text, num) });
        });
    }

    return Array.from(chapterMap.entries())
        .map(([num, info]) => ({ chapter_number: num, title: info.title || `Chapter ${num}`, chapter_url: info.url, pages_source: 'html' }))
        .sort((a, b) => a.chapter_number - b.chapter_number);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AsuraScans — WordPress + Madara/custom theme
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeAsuraScans(seriesUrl) {
    const origin = (() => { try { const u = new URL(seriesUrl); return u.origin; } catch { return 'https://asuracomic.net'; } })();
    const html = await fetchHtml(seriesUrl, { 'Referer': origin + '/' });
    const $ = cheerio.load(html);

    // Meta — try og tags first (more reliable on Astro sites)
    const title = $('meta[property="og:title"]').attr('content')?.split('|')[0].trim() ||
        $('h1').first().text().trim() || 'Unknown';
    const coverUrl = $('meta[property="og:image"]').attr('content') ||
        $('img[src*="series"], img[src*="cover"], img[src*="manga"]').first().attr('src') || null;
    const description = $('meta[property="og:description"]').attr('content') ||
        $('p.description, [class*="summary"] p, [class*="synopsis"] p').first().text().trim() || '';
    const author = $('[class*="author"] span, [class*="author"] a').first().text().trim() || '';
    const artist = $('[class*="artist"] span, [class*="artist"] a').first().text().trim() || '';
    const genres = [];
    $('[class*="genre"] a, [class*="genre"] span, a[href*="genre"]').each((_, el) => {
        const g = $(el).text().trim();
        if (g && g.length < 40) genres.push(g);
    });
    const statusText = $('[class*="status"]').text().toLowerCase();
    const status = statusText.includes('complete') ? 'completed' : statusText.includes('hiatus') ? 'hiatus' : 'ongoing';

    // Try to extract chapter list from Astro encoded props first
    let chapters = await extractChaptersFromAstroPropsSeries(html, origin);

    // Fallback to anchor scan
    if (chapters.length === 0) {
        chapters = buildChapterListFromAnchors($, seriesUrl);
    }

    return { meta: { title, description, status, author, artist, coverUrl, genres }, chapters };
}

/**
 * Extract chapter list from AsuraComic (Astro) series page.
 * Chapters appear in <a href="/series/slug/chapter/NUM"> tags.
 */
async function extractChaptersFromAstroPropsSeries(html, origin) {
    const chapters = [];
    const chapterMap = new Map();

    // Pattern 1: <a href="/series/slug/chapter/NUM"> — the standard AsuraComic pattern
    const hrefRe = /href=["']([^"']*\/chapter\/(\d+(?:\.\d+)?)[^"']*)["']/g;
    let m;
    while ((m = hrefRe.exec(html)) !== null) {
        const href = m[1];
        const num = parseFloat(m[2]);
        if (!isValidChapterNum(num) || chapterMap.has(num)) continue;
        const fullUrl = href.startsWith('http') ? href : origin + href;
        chapterMap.set(num, { url: fullUrl, title: `Chapter ${num}` });
    }

    // Pattern 2: Astro encoded props — &quot;chapterNumber&quot;:NUM
    if (chapterMap.size === 0) {
        const decoded = html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const propRe = /"chapterNumber"\s*:\s*([\d]+(?:\.[\d]+)?)/g;
        while ((m = propRe.exec(decoded)) !== null) {
            const num = parseFloat(m[1]);
            if (!isValidChapterNum(num) || chapterMap.has(num)) continue;
            chapterMap.set(num, { url: '', title: `Chapter ${num}` });
        }
    }

    for (const [num, info] of chapterMap.entries()) {
        chapters.push({ chapter_number: num, title: info.title, chapter_url: info.url, pages_source: 'html' });
    }
    return chapters.sort((a, b) => a.chapter_number - b.chapter_number);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DemonicScans
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeDemonicScans(seriesUrl) {
    const html = await fetchHtml(seriesUrl, { 'Referer': 'https://demonicscans.org/' });
    const $ = cheerio.load(html);

    const title = $('h1, .manga-title, .series-name').first().text().trim().split('|')[0].trim() ||
        $('meta[property="og:title"]').attr('content')?.split('|')[0].trim() || 'Unknown';
    const coverUrl = $('img.manga-cover, img.series-thumbnail, .thumb img').first().attr('src') ||
        $('meta[property="og:image"]').attr('content') || null;
    const description = $('.manga-summary, .description, [class*="synopsis"]').first().text().trim();
    const author = $('[class*="author"] a, .author').first().text().trim();
    const genres = [];
    $('[class*="genre"] a, .genres a').each((_, el) => { const g = $(el).text().trim(); if (g) genres.push(g); });

    const chapters = buildChapterListFromAnchors($, seriesUrl);

    return { meta: { title, description, status: 'ongoing', author, artist: '', coverUrl, genres }, chapters };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comix.to  (Next.js — chapter URLs: /title/{slug}/{id}-chapter-{num})
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeComixTo(seriesUrl) {
    const html = await fetchHtml(seriesUrl, { 'Referer': 'https://comix.to/' });
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim().split('|')[0].trim() ||
        $('meta[property="og:title"]').attr('content')?.split(/[|–—]/)[0].trim() || 'Unknown';
    const coverUrl = $('meta[property="og:image"]').attr('content') ||
        $('[class*="cover"] img, [class*="thumb"] img, [class*="poster"] img').first().attr('src') || null;
    const description = $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('[class*="summary"], [class*="synopsis"], [class*="description"]').first().text().trim();
    const author = $('[class*="author"] a, .author').first().text().trim();
    const genres = [];
    $('[class*="genre"] a, .genres a').each((_, el) => { const g = $(el).text().trim(); if (g) genres.push(g); });

    // Comix.to chapter links follow: /title/{slug}/{id}-chapter-{num}
    // Use anchor scanner (now has the Comix.to URL regex) with deduplication
    // Multiple scan groups may upload same chapter — keep only one per chapter number
    const chapters = buildComixToChapterList($, seriesUrl)
        || extractComixToChapters($, seriesUrl)
        || tryExtractNextData($, seriesUrl)
        || buildChapterListFromAnchors($, seriesUrl);

    return { meta: { title, description, status: 'ongoing', author, artist: '', coverUrl, genres }, chapters: chapters || [] };
}

/**
 * Scan all same-domain anchors for Comix.to chapter links.
 * Pattern: /title/{slug}/{id}-chapter-{num}
 * Multiple groups may have uploaded the same chapter — we deduplicate by chapter number,
 * keeping the first link found (usually highest view count = most popular group).
 */
function buildComixToChapterList($, seriesUrl) {
    const chapterMap = new Map(); // num → { url, title }
    const seriesPathPrefix = (() => {
        try {
            const u = new URL(seriesUrl);
            return u.pathname.replace(/\/$/, ''); // e.g. /title/nnl80-...
        } catch { return ''; }
    })();

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!href) return;

        // Must be under the same series path
        const absHref = href.startsWith('http') ? href : ('https://comix.to' + (href.startsWith('/') ? href : '/' + href));
        let pathname;
        try { pathname = new URL(absHref).pathname; } catch { return; }

        if (seriesPathPrefix && !pathname.startsWith(seriesPathPrefix + '/')) return;

        // Must match /{id}-chapter-{num} at the end
        const m = pathname.match(/\/\d+-chapter-([\d]+(?:\.\d+)?)(?:\/|$)/i);
        if (!m) return;

        const num = parseFloat(m[1]);
        if (!isValidChapterNum(num)) return;
        if (chapterMap.has(num)) return; // keep first (deduplicate multi-group uploads)

        const text = $(el).text().replace(/\s+/g, ' ').trim();
        chapterMap.set(num, {
            url: absHref,
            title: cleanChapterTitle(text, num),
        });
    });

    if (chapterMap.size === 0) return null;
    return Array.from(chapterMap.entries())
        .map(([num, info]) => ({ chapter_number: num, title: info.title || `Chapter ${num}`, chapter_url: info.url, pages_source: 'html' }))
        .sort((a, b) => a.chapter_number - b.chapter_number);
}

/**
 * Comix.to-specific chapter extractor.
 * Digs through __NEXT_DATA__ looking for arrays that look like chapter lists,
 * handling many different key naming conventions used by Comix.to.
 */
function extractComixToChapters($, seriesUrl) {
    const scriptEl = $('script#__NEXT_DATA__');
    if (!scriptEl.length) return null;

    let data;
    try { data = JSON.parse(scriptEl.html() || '{}'); } catch { return null; }

    const origin = (() => { try { return new URL(seriesUrl).origin; } catch { return 'https://comix.to'; } })();
    const chapters = [];

    function digForChapters(obj, depth) {
        if (depth > 12 || !obj) return;

        if (Array.isArray(obj)) {
            // Check if this array looks like a chapter list (each item has number-like data)
            if (obj.length > 0 && typeof obj[0] === 'object') {
                const firstKeys = Object.keys(obj[0] || {}).map(k => k.toLowerCase());
                const looksLikeChapterList =
                    firstKeys.some(k => /^(chap|chapter|num|no|ep|episode)/.test(k)) ||
                    firstKeys.includes('id') && firstKeys.some(k => /url|slug|href|link/.test(k));

                if (looksLikeChapterList) {
                    for (const item of obj) {
                        const num = extractChapterNumFromChapterObj(item);
                        if (!isValidChapterNum(num)) continue;
                        const url = extractChapterUrlFromObj(item, origin, seriesUrl);
                        const rawTitle = item.title || item.name || item.chapterTitle || item.chapter_title || '';
                        chapters.push({
                            chapter_number: num,
                            title: cleanChapterTitle(rawTitle, num),
                            chapter_url: url,
                            pages_source: 'html',
                        });
                    }
                    if (chapters.length > 0) return; // found it
                }
            }
            obj.forEach(v => digForChapters(v, depth + 1));
            return;
        }

        if (typeof obj === 'object') {
            // Common page props paths first
            const priorityKeys = ['chapterList', 'chapters', 'chapter_list', 'chapterListArr', 'chaps', 'episodeList'];
            for (const k of priorityKeys) {
                if (Array.isArray(obj[k]) && obj[k].length > 0) {
                    digForChapters(obj[k], depth + 1);
                    if (chapters.length > 0) return;
                }
            }
            Object.values(obj).forEach(v => digForChapters(v, depth + 1));
        }
    }

    digForChapters(data, 0);

    if (chapters.length === 0) return null;
    return chapters
        .filter((c, i, arr) => arr.findIndex(x => x.chapter_number === c.chapter_number) === i) // dedupe
        .sort((a, b) => a.chapter_number - b.chapter_number);
}

function extractChapterNumFromChapterObj(item) {
    // Try various keys that carry the chapter number
    const candidates = [
        item.chap, item.chapter, item.chapter_number, item.chapterNumber,
        item.number, item.num, item.ep, item.episode,
        item.chap_number, item.chapNum,
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null) {
            const n = parseFloat(String(c));
            if (isValidChapterNum(n)) return n;
        }
    }
    // Last resort: try extracting from slug/url
    const urlVal = item.url || item.slug || item.href || item.link || item.path || '';
    if (urlVal) return extractChapterNumFromUrl(String(urlVal));
    return null;
}

function extractChapterUrlFromObj(item, origin, seriesUrl) {
    const raw = item.url || item.href || item.link || item.path || item.slug || item.chapter_url || '';
    if (!raw) return seriesUrl;
    const s = String(raw);
    if (s.startsWith('http')) return s;
    if (s.startsWith('/')) return origin + s;
    try { return new URL(s, seriesUrl).toString(); } catch { return seriesUrl; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Manganato / MangaKakalot
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeManganato(seriesUrl) {
    const html = await fetchHtml(seriesUrl, { 'Referer': 'https://manganato.com/' });
    const $ = cheerio.load(html);

    const title = $('h1.story-info-right, h1.manga-info-text, h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content')?.trim() || 'Unknown';
    const coverUrl = $('span.info-image img, .manga-info-pic img').attr('src') ||
        $('meta[property="og:image"]').attr('content') || null;
    const description = $('#panel-story-info-description, .panel-story-info-description').text().replace(/Description\s*:/i, '').trim();
    const author = $('[class*="author"] a').first().text().trim();
    const genres = [];
    $('td.table-value a[class*="a-h"]').each((_, el) => { const g = $(el).text().trim(); if (g) genres.push(g); });

    const chapters = buildChapterListFromAnchors($, seriesUrl);

    return { meta: { title, description, status: 'ongoing', author, artist: '', coverUrl, genres }, chapters };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generic fallback
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeGeneric(seriesUrl) {
    const origin = (() => { try { return new URL(seriesUrl).origin; } catch { return ''; } })();
    const html = await fetchHtml(seriesUrl, { 'Referer': origin + '/' });
    const $ = cheerio.load(html);

    // Try Next.js embedded data first
    const nextChapters = tryExtractNextData($, seriesUrl);

    let title = $('h1.entry-title, h1.manga-title, .series-title, [class*="series-name"]').first().text().trim() ||
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content')?.split(/[|\-–—]/)[0].trim() || 'Unknown';
    title = title.replace(/\s*manga\s*$/i, '').trim();

    const coverUrl = $('meta[property="og:image"]').attr('content') ||
        $('[class*="cover"] img, [class*="poster"] img, [class*="thumb"] img, div.thumb img').first().attr('src') || null;

    const description = $('meta[property="og:description"]').attr('content') ||
        $('[class*="description"], [class*="synopsis"], [class*="summary"]').first().text().trim() || '';

    const author = $('[class*="author"] a, .author').first().text().trim();
    const genres = [];
    $('[class*="genre"] a, .genres a').each((_, el) => { const g = $(el).text().trim(); if (g) genres.push(g); });

    const pageText = $('body').text().toLowerCase();
    const status = pageText.includes('completed') || pageText.includes('finished') ? 'completed' :
        pageText.includes('hiatus') ? 'hiatus' : 'ongoing';

    const chapters = (nextChapters && nextChapters.length > 0)
        ? nextChapters
        : buildChapterListFromAnchors($, seriesUrl);

    return { meta: { title, description, status, author, artist: '', coverUrl, genres }, chapters };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Next.js __NEXT_DATA__ extraction helpers
// ═══════════════════════════════════════════════════════════════════════════════
function tryExtractNextData($, seriesUrl) {
    const scriptEl = $('script#__NEXT_DATA__');
    if (!scriptEl.length) return null;
    try {
        const data = JSON.parse(scriptEl.html() || '{}');
        const chapters = [];
        extractChaptersFromObject(data, chapters, seriesUrl);
        if (chapters.length > 0) return chapters.filter(c => isValidChapterNum(c.chapter_number)).sort((a, b) => a.chapter_number - b.chapter_number);
    } catch {}
    return null;
}

function extractChaptersFromObject(obj, result, baseUrl, depth = 0) {
    if (depth > 10 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(v => extractChaptersFromObject(v, result, baseUrl, depth + 1)); return; }
    const keys = Object.keys(obj);
    if ((keys.includes('chapter_number') || keys.includes('chapterNumber') || keys.includes('number')) &&
        (keys.includes('url') || keys.includes('slug') || keys.includes('id'))) {
        const num = parseFloat(obj.chapter_number || obj.chapterNumber || obj.number);
        if (isValidChapterNum(num)) {
            let url = obj.url || obj.slug || '';
            if (url && !url.startsWith('http')) { try { url = new URL(url, baseUrl).toString(); } catch {} }
            result.push({ chapter_number: num, title: cleanChapterTitle(obj.title || obj.name || '', num), chapter_url: url, pages_source: 'html' });
            return;
        }
    }
    Object.values(obj).forEach(v => extractChaptersFromObject(v, result, baseUrl, depth + 1));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chapter page image fetching (HTML readers)
// ═══════════════════════════════════════════════════════════════════════════════
export async function fetchHtmlChapterPages(chapterUrl) {
    const origin = (() => { try { return new URL(chapterUrl).origin; } catch { return ''; } })();
    const html = await fetchHtml(chapterUrl, { 'Referer': origin + '/' });
    const $ = cheerio.load(html);

    // Collect known "cover/meta" images to exclude from fallbacks
    const metaImages = new Set();
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) metaImages.add(ogImg);
    const twitterImg = $('meta[name="twitter:image"]').attr('content');
    if (twitterImg) metaImages.add(twitterImg);

    // 0. Astro.js HTML-encoded serialized data (e.g. AsuraScans)
    //    Data is stored as HTML entities inside script tags:
    //    &quot;url&quot;:[0,&quot;https://cdn.../page.webp&quot;]
    const astroImages = extractImagesFromAstroEncoded(html);
    if (astroImages.length > 0) return astroImages;

    // 1. JSON/script extraction (most reliable for modern readers)
    const jsonImages = extractImagesFromScripts($, chapterUrl);
    if (jsonImages.length > 0) return jsonImages;

    // 2. CSS selector sweep
    const SELECTORS = [
        '#readerarea img[src], #readerarea img[data-src]',
        '.reading-content img, .reading-content img[data-src]',
        '.read-img img, .read-content img',
        'div.page-break img, div.wp-manga-chapter-img img',
        '.chapter-content img, .chapter-images img',
        '#pages img, .pages img',
        '[class*="reader"] img',
        '[class*="chapter"] img',
        '.container-chapter-reader img',
        '.viewer img, [class*="viewer"] img',
    ];

    let images = [];
    for (const sel of SELECTORS) {
        const found = [];
        $(sel).each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || '';
            if (isValidImageUrl(src) && !metaImages.has(src)) found.push(src.trim());
        });
        if (found.length > 0) { images = dedupeUrls(found); break; }
    }

    // 3. All img tags fallback — exclude meta images and single-image results that look like covers
    if (images.length === 0) {
        const allImgs = [];
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
            if (isValidImageUrl(src) && !metaImages.has(src) && !/logo|icon|avatar|banner|ad[-_]|cover/i.test(src)) {
                allImgs.push(src.trim());
            }
        });
        images = dedupeUrls(allImgs);
        // If only 1 image, it's probably still a cover or placeholder — discard
        if (images.length <= 1) images = [];
    }

    // Absolutize
    return images.map(u => { try { return new URL(u, chapterUrl).toString(); } catch { return u; } }).filter(Boolean);
}

// ── Extract images from Astro.js HTML-encoded serialized data ────────────────
// AsuraScans uses Astro framework. Page data is stored as HTML-encoded JSON
// inside a `props` HTML attribute of a <script> island element.
// Format: props="{&quot;pages&quot;:[1,[[0,{&quot;url&quot;:[0,&quot;https://cdn.../page.webp&quot;]}],...]]}"
// The Astro serialization encoding: [0, primitive], [1, array]
function extractImagesFromAstroEncoded(rawHtml) {
    // The data may be in ANY HTML attribute (not just script content),
    // so we search the entire raw HTML for the encoded pattern directly.
    if (!rawHtml.includes('&quot;') || !rawHtml.includes('asura-images/chapters')) {
        // Fast-path: only try this for pages that look like AsuraScans chapter pages
        // Broaden: also try for any HTML-encoded image URL pattern
        if (!rawHtml.includes('&quot;url&quot;:[0,&quot;https')) return [];
    }

    // Decode the whole HTML to find image patterns
    const decoded = rawHtml
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    // Look for "url":[0,"https://...image..."] pattern (Astro serialization)
    // and also "src":[0,"https://..."] pattern
    const images = [];
    const urlPattern = /"(?:url|src|image|imageUrl|page_image|pageImage)":\s*\[0\s*,\s*"(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png|gif)(?:\?[^"]+)?)"/g;
    for (const m of decoded.matchAll(urlPattern)) {
        if (isValidImageUrl(m[1]) && !/logo|icon|avatar|banner|cover/i.test(m[1])) {
            images.push(m[1]);
        }
    }

    return dedupeUrls(images);
}

// ── Extract image URLs from inline scripts ────────────────────────────────────
function extractImagesFromScripts($, baseUrl) {
    const images = [];

    $('script').each((_, el) => {
        const src = $(el).html() || '';
        if (!src) return;

        // ── Pattern 1: ts_reader.run({...}) — Madara/WP-Manga chapter reader ──
        try {
            const tsMatch = src.match(/ts_reader\.run\s*\(\s*(\{[\s\S]*?\})\s*\)/);
            if (tsMatch) {
                const tsData = JSON.parse(tsMatch[1]);
                const sources = tsData.sources || [];
                for (const s of sources) {
                    const baseImgUrl = s.source || '';
                    const imgs = s.images || [];
                    for (const img of imgs) {
                        const full = img.startsWith('http') ? img : (baseImgUrl ? baseImgUrl.replace(/\/$/, '') + '/' + img.replace(/^\//, '') : img);
                        if (isValidImageUrl(full)) images.push(full);
                    }
                }
                if (images.length > 0) return;
            }
        } catch {}

        // ── Pattern 2: Next.js __NEXT_DATA__ — deep traversal ───────────────
        if (el.attribs?.id === '__NEXT_DATA__') {
            try {
                const data = JSON.parse(src);
                // First try: look for known image-array keys at any depth
                const deepImgs = extractPageImagesFromNextData(data);
                if (deepImgs.length > 0) { deepImgs.forEach(u => images.push(u)); return; }
                // Fallback: generic object traversal
                extractImagesFromObject(data, images);
            } catch {}
            return; // already handled
        }

        // ── Pattern 3: JSON array of image URLs ──────────────────────────────
        try {
            const arrMatch = src.match(/\["https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*"(?:,"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*")+\]/);
            if (arrMatch) {
                const arr = JSON.parse(arrMatch[0]);
                if (Array.isArray(arr) && arr.length >= 2) arr.forEach(u => { if (isValidImageUrl(u)) images.push(u); });
            }
        } catch {}

        // ── Pattern 4: cluster of quoted image URLs from the same CDN ────────
        const found = [];
        for (const m of src.matchAll(/"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"]+)?)"/g)) {
            if (!/logo|icon|banner|avatar|profile/i.test(m[1])) found.push(m[1]);
        }
        if (found.length >= 2) {
            const domains = {};
            found.forEach(u => { try { const h = new URL(u).hostname; domains[h] = (domains[h] || 0) + 1; } catch {} });
            const top = Object.entries(domains).sort((a, b) => b[1] - a[1])[0];
            if (top && top[1] >= 2) {
                found.filter(u => { try { return new URL(u).hostname === top[0]; } catch { return false; } })
                     .forEach(u => images.push(u));
            }
        }
    });

    return dedupeUrls(images);
}

/**
 * Deep extraction of page images from Next.js __NEXT_DATA__ JSON.
 * Looks for common patterns: images array, chapter.images, pageProps.images, etc.
 * Returns ALL image URLs found in the largest contiguous image array.
 */
function extractPageImagesFromNextData(data) {
    const candidates = []; // list of arrays found

    function dig(obj, depth) {
        if (depth > 15 || !obj) return;
        if (Array.isArray(obj)) {
            // Check if this array contains image URLs or image objects
            if (obj.length >= 1) {
                const imgUrls = [];
                for (const item of obj) {
                    if (typeof item === 'string' && isValidImageUrl(item)) {
                        imgUrls.push(item);
                    } else if (item && typeof item === 'object') {
                        // Common structures: { url }, { src }, { image }, { imageUrl }, { page_image }
                        const v = item.url || item.src || item.image || item.imageUrl || item.image_url ||
                                  item.page_image || item.pageImage || item.img || item.path || '';
                        if (typeof v === 'string' && isValidImageUrl(v)) imgUrls.push(v);
                    }
                }
                if (imgUrls.length >= 1 && imgUrls.length === obj.length) {
                    candidates.push(imgUrls); // whole array is images
                }
            }
            obj.forEach(v => dig(v, depth + 1));
            return;
        }
        if (typeof obj === 'object') {
            // Priority keys that commonly hold image lists
            const priorityKeys = [
                'images', 'pages', 'pageImages', 'page_images', 'chapterImages',
                'chapter_images', 'imageList', 'image_list', 'imgs', 'pics',
                'data', 'content', 'chapter', 'pageProps',
            ];
            for (const k of priorityKeys) {
                if (obj[k] !== undefined) dig(obj[k], depth + 1);
            }
            // Also traverse all other keys
            for (const [k, v] of Object.entries(obj)) {
                if (!priorityKeys.includes(k)) dig(v, depth + 1);
            }
        }
    }

    dig(data, 0);

    if (candidates.length === 0) return [];
    // Return the largest image array found
    return candidates.sort((a, b) => b.length - a.length)[0];
}

function extractImagesFromObject(obj, result, depth = 0) {
    if (depth > 12 || !obj) return;
    if (typeof obj === 'string') { if (isValidImageUrl(obj)) result.push(obj); return; }
    if (Array.isArray(obj)) { obj.forEach(v => extractImagesFromObject(v, result, depth + 1)); return; }
    if (typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
            if (['url', 'src', 'image', 'img', 'path', 'link', 'page'].some(kw => k.toLowerCase().includes(kw))) {
                if (typeof v === 'string' && isValidImageUrl(v)) result.push(v);
            }
            extractImagesFromObject(v, result, depth + 1);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════
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

// (buildServerPath kaldırıldı — sayfa görselleri artık imgbb'de barındırılıyor,
// yerel dosya sistemi yolu oluşturmaya gerek yok)

// Aynı anda kaç sayfa indirilip imgbb'ye yüklensin? Eskiden tamamen SIRALIYDI:
// 30 sayfalık bölüm = 30 × (indir + WebP + imgbb yükle) art arda → dakikalar sürüyordu.
// 5 paralel: ~5x hızlı, hem kaynak siteyi hem imgbb'yi boğmayacak kadar düşük.
const PAGE_CONCURRENCY = 5;

export async function downloadAndSaveChapterPages(db, chapterId, pageUrls, referer = '') {
    // Eski sayfa kayıtlarını temizle (imgbb'deki eski dosyalar otomatik silinmiyor,
    // sadece veritabanı kayıtları kaldırılıyor)
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

    // DB kayıtları sayfa sırasıyla yazılır (paralel indirme sırayı bozmaz)
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

// ═══════════════════════════════════════════════════════════════════════════════
// Bot Scraper — otomatik kaynak eşitleme servisi
//
// Bu fonksiyon, "auto_sync=1" olarak işaretlenmiş TÜM kaynakları tarar, yeni
// bölüm olup olmadığına bakar ve bulunanları scraper_pending_chapters
// tablosuna "pending" olarak yazar. Önceden bu mantık sadece
// app/api/admin/scrape/route.js içinde (yalnızca admin panelindeki "Tüm
// Kaynakları Eşitle" butonuna basılınca) çalışıyordu — hiçbir zamanlayıcı
// (cron/bot) bu kodu tetiklemediği için "Bot" hiçbir zaman kendiliğinden veri
// çekmiyordu. Mantık artık burada, tek bir yerde (servis katmanında) toplandı;
// hem admin panelindeki manuel "sync-all" action'ı hem de
// app/api/cron/scraper-sync/route.js (otomatik/zamanlanmış bot) bu aynı
// fonksiyonu çağırıyor — böylece iki yer birbirinden sapmıyor.
// ═══════════════════════════════════════════════════════════════════════════════
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

            // Yeni bölümleri sırayla ekle (Promise.all yerine sırayla — kaynak
            // sitenin rate-limit'ine takılmamak için)
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
