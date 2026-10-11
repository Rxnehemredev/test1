import 'server-only';
import sharp from 'sharp';
import { optimizeChapterPage } from '../imageOptimizer.js';
import { uploadToImgbb } from '../imgbb.js';
import { safeFetch } from '../security/ssrfGuard.js';

// ── Browser-like headers ──────────────────────────────────────────────────────
export const BROWSER_HEADERS = {
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
export function isCloudflareChallenge(status, html) {
    if (status === 403 || status === 503) return true;
    if (!html) return false;
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
export async function fetchJson(url, extraHeaders = {}, timeoutMs = 20000) {
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
            optimizedBuffer = await optimizeChapterPage(rawBuffer);
        } catch (sharpErr) {
            console.error(`Sharp chapter page optimization failed for page ${pageNum}:`, sharpErr.message);
            optimizedBuffer = rawBuffer;
        }

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

// ── Chapter number helpers ───────────────────────────────────────────────────
export function extractChapterNumFromUrl(href) {
    if (!href) return null;
    const patterns = [
        /\/\d+-chapter-([\d]+(?:[._][\d]+)?)(?:\/|$)/i,
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

export function extractChapterNumFromText(text) {
    if (!text) return null;
    const m = text.match(/(?:chapter|chap|ch\.?|episode|ep\.?)\s*[#]?\s*([\d]+(?:[._][\d]+)?)/i);
    if (m) {
        const num = parseFloat(m[1].replace(/_/g, '.'));
        if (isValidChapterNum(num)) return num;
    }
    return null;
}

export function isValidChapterNum(num) {
    return typeof num === 'number' && !isNaN(num) && num > 0 && num <= 9999;
}

export function cleanChapterTitle(rawText, chapterNum) {
    if (!rawText) return `Chapter ${chapterNum}`;
    let t = rawText
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s*\d{4}[-/]\d{2}[-/]\d{2}\s*$/, '')
        .replace(/\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$/, '')
        .replace(/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\s*$/i, '')
        .replace(/^(?:read\s+)?(?:first|last|latest|newest|prev(?:ious)?|next)\s+(?:chapter|chap|ch\.?)?\s*/i, '')
        .replace(/^read\s+/i, '')
        .replace(/\s*\(new\)\s*$/i, '')
        .trim();

    if (!t) return `Chapter ${chapterNum}`;

    if (/^(?:first|last|latest|newest|prev(?:ious)?|next)\s*(?:chapter|chap|ch\.?)?$/i.test(t)) {
        return `Chapter ${chapterNum}`;
    }
    return t;
}

export function makeAbsUrl(href, baseUrl) {
    if (!href) return '';
    try { return new URL(href, baseUrl).toString(); } catch { return href; }
}

export function isValidImageUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
    if (/\.(js|css|html|htm|php|json|xml|ico|svg)(\?|$)/i.test(url)) return false;
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(url)) return true;
    if (url.includes('/uploads/') || url.includes('/images/') || url.includes('/manga/') ||
        url.includes('/chapter/') || url.includes('cdn.') || url.includes('storage.')) return true;
    return false;
}

export function dedupeUrls(arr) {
    const seen = new Set();
    return arr.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
}

export function normalizeScrapedResult(result, sourceUrl) {
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

export function detectSiteType(url) {
    const u = url.toLowerCase();
    if (u.includes('mangadex.org')) return 'mangadex';
    if (u.includes('comick.io') || u.includes('comick.fun')) return 'comick';
    if (u.includes('asura')) return 'asurascans';
    if (u.includes('demonicscans.org')) return 'demonicscans';
    if (u.includes('comix.to')) return 'comixto';
    if (u.includes('mangakakalot') || u.includes('manganato') || u.includes('readmanganato')) return 'manganato';
    if (u.includes('mangafire.to')) return 'mangafire';
    return 'generic';
}

export function buildChapterListFromAnchors($, seriesUrl) {
    const chapterMap = new Map();
    const baseHost = (() => { try { return new URL(seriesUrl).hostname; } catch { return ''; } })();

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

            const numFromUrl = extractChapterNumFromUrl(href);
            const directText = a.clone().children().remove().end().text().trim();
            const fullText = a.text().replace(/\s+/g, ' ').trim();
            const numFromText = extractChapterNumFromText(directText) || extractChapterNumFromText(fullText);
            const num = numFromUrl || numFromText;

            if (!num || !isValidChapterNum(num)) return;
            if (chapterMap.has(num)) return;

            const cleanTitle = cleanChapterTitle(directText || fullText, num);
            chapterMap.set(num, { url: makeAbsUrl(href, seriesUrl), title: cleanTitle });
        });
        if (chapterMap.size > 0) break;
    }

    if (chapterMap.size === 0) {
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || '';
            if (!href) return;

            try {
                const linkHost = new URL(makeAbsUrl(href, seriesUrl)).hostname;
                if (linkHost !== baseHost) return;
            } catch { return; }

            const num = extractChapterNumFromUrl(href);
            if (!num || !isValidChapterNum(num)) return;
            if (chapterMap.has(num)) return;

            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (/^read\s+(first|latest|last)/i.test(text)) return;
            if (/^(first|last|latest|newest|previous|next)\s*(chapter|chap|ch)?$/i.test(text)) return;

            chapterMap.set(num, { url: makeAbsUrl(href, seriesUrl), title: cleanChapterTitle(text, num) });
        });
    }

    return Array.from(chapterMap.entries())
        .map(([num, info]) => ({ chapter_number: num, title: info.title || `Chapter ${num}`, chapter_url: info.url, pages_source: 'html' }))
        .sort((a, b) => a.chapter_number - b.chapter_number);
}
