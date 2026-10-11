import * as cheerio from 'cheerio';
import {
    fetchHtml,
    isValidImageUrl,
    isValidChapterNum,
    cleanChapterTitle,
    dedupeUrls,
    buildChapterListFromAnchors,
} from '../utils.js';

export function tryExtractNextData($, seriesUrl) {
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

export function extractChaptersFromObject(obj, result, baseUrl, depth = 0) {
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

export async function scrapeGeneric(seriesUrl) {
    const origin = (() => { try { return new URL(seriesUrl).origin; } catch { return ''; } })();
    const html = await fetchHtml(seriesUrl, { 'Referer': origin + '/' });
    const $ = cheerio.load(html);

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

export async function fetchHtmlChapterPages(chapterUrl) {
    const origin = (() => { try { return new URL(chapterUrl).origin; } catch { return ''; } })();
    const html = await fetchHtml(chapterUrl, { 'Referer': origin + '/' });
    const $ = cheerio.load(html);

    const metaImages = new Set();
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) metaImages.add(ogImg);
    const twitterImg = $('meta[name="twitter:image"]').attr('content');
    if (twitterImg) metaImages.add(twitterImg);

    const astroImages = extractImagesFromAstroEncoded(html);
    if (astroImages.length > 0) return astroImages;

    const jsonImages = extractImagesFromScripts($, chapterUrl);
    if (jsonImages.length > 0) return jsonImages;

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

    if (images.length === 0) {
        const allImgs = [];
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
            if (isValidImageUrl(src) && !metaImages.has(src) && !/logo|icon|avatar|banner|ad[-_]|cover/i.test(src)) {
                allImgs.push(src.trim());
            }
        });
        images = dedupeUrls(allImgs);
        if (images.length <= 1) images = [];
    }

    return images.map(u => { try { return new URL(u, chapterUrl).toString(); } catch { return u; } }).filter(Boolean);
}

export function extractImagesFromAstroEncoded(rawHtml) {
    if (!rawHtml.includes('&quot;') || !rawHtml.includes('asura-images/chapters')) {
        if (!rawHtml.includes('&quot;url&quot;:[0,&quot;https')) return [];
    }

    const decoded = rawHtml
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    const images = [];
    const urlPattern = /"(?:url|src|image|imageUrl|page_image|pageImage)":\s*\[0\s*,\s*"(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png|gif)(?:\?[^"]+)?)"/g;
    for (const m of decoded.matchAll(urlPattern)) {
        if (isValidImageUrl(m[1]) && !/logo|icon|avatar|banner|cover/i.test(m[1])) {
            images.push(m[1]);
        }
    }

    return dedupeUrls(images);
}

export function extractImagesFromScripts($, baseUrl) {
    const images = [];

    $('script').each((_, el) => {
        const src = $(el).html() || '';
        if (!src) return;

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

        if (el.attribs?.id === '__NEXT_DATA__') {
            try {
                const data = JSON.parse(src);
                const deepImgs = extractPageImagesFromNextData(data);
                if (deepImgs.length > 0) { deepImgs.forEach(u => images.push(u)); return; }
                extractImagesFromObject(data, images);
            } catch {}
            return;
        }

        try {
            const arrMatch = src.match(/\["https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*"(?:,"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*")+\]/);
            if (arrMatch) {
                const arr = JSON.parse(arrMatch[0]);
                if (Array.isArray(arr) && arr.length >= 2) arr.forEach(u => { if (isValidImageUrl(u)) images.push(u); });
            }
        } catch {}

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

export function extractPageImagesFromNextData(data) {
    const candidates = [];

    function dig(obj, depth) {
        if (depth > 15 || !obj) return;
        if (Array.isArray(obj)) {
            if (obj.length >= 1) {
                const imgUrls = [];
                for (const item of obj) {
                    if (typeof item === 'string' && isValidImageUrl(item)) {
                        imgUrls.push(item);
                    } else if (item && typeof item === 'object') {
                        const v = item.url || item.src || item.image || item.imageUrl || item.image_url ||
                                  item.page_image || item.pageImage || item.img || item.path || '';
                        if (typeof v === 'string' && isValidImageUrl(v)) imgUrls.push(v);
                    }
                }
                if (imgUrls.length >= 1 && imgUrls.length === obj.length) {
                    candidates.push(imgUrls);
                }
            }
            obj.forEach(v => dig(v, depth + 1));
            return;
        }
        if (typeof obj === 'object') {
            const priorityKeys = [
                'images', 'pages', 'pageImages', 'page_images', 'chapterImages',
                'chapter_images', 'imageList', 'image_list', 'imgs', 'pics',
                'data', 'content', 'chapter', 'pageProps',
            ];
            for (const k of priorityKeys) {
                if (obj[k] !== undefined) dig(obj[k], depth + 1);
            }
            for (const [k, v] of Object.entries(obj)) {
                if (!priorityKeys.includes(k)) dig(v, depth + 1);
            }
        }
    }

    dig(data, 0);

    if (candidates.length === 0) return [];
    return candidates.sort((a, b) => b.length - a.length)[0];
}

export function extractImagesFromObject(obj, result, depth = 0) {
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
