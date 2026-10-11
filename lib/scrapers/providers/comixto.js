import * as cheerio from 'cheerio';
import {
    fetchHtml,
    isValidChapterNum,
    cleanChapterTitle,
    extractChapterNumFromUrl,
    buildChapterListFromAnchors,
} from '../utils.js';
import { tryExtractNextData } from './generic.js';

export async function scrapeComixTo(seriesUrl) {
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

    const chapters = buildComixToChapterList($, seriesUrl)
        || extractComixToChapters($, seriesUrl)
        || tryExtractNextData($, seriesUrl)
        || buildChapterListFromAnchors($, seriesUrl);

    return { meta: { title, description, status: 'ongoing', author, artist: '', coverUrl, genres }, chapters: chapters || [] };
}

export function buildComixToChapterList($, seriesUrl) {
    const chapterMap = new Map();
    const seriesPathPrefix = (() => {
        try {
            const u = new URL(seriesUrl);
            return u.pathname.replace(/\/$/, '');
        } catch { return ''; }
    })();

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!href) return;

        const absHref = href.startsWith('http') ? href : ('https://comix.to' + (href.startsWith('/') ? href : '/' + href));
        let pathname;
        try { pathname = new URL(absHref).pathname; } catch { return; }

        if (seriesPathPrefix && !pathname.startsWith(seriesPathPrefix + '/')) return;

        const m = pathname.match(/\/\d+-chapter-([\d]+(?:\.\d+)?)(?:\/|$)/i);
        if (!m) return;

        const num = parseFloat(m[1]);
        if (!isValidChapterNum(num)) return;
        if (chapterMap.has(num)) return;

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

export function extractComixToChapters($, seriesUrl) {
    const scriptEl = $('script#__NEXT_DATA__');
    if (!scriptEl.length) return null;

    let data;
    try { data = JSON.parse(scriptEl.html() || '{}'); } catch { return null; }

    const origin = (() => { try { return new URL(seriesUrl).origin; } catch { return 'https://comix.to'; } })();
    const chapters = [];

    function digForChapters(obj, depth) {
        if (depth > 12 || !obj) return;

        if (Array.isArray(obj)) {
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
                    if (chapters.length > 0) return;
                }
            }
            obj.forEach(v => digForChapters(v, depth + 1));
            return;
        }

        if (typeof obj === 'object') {
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
        .filter((c, i, arr) => arr.findIndex(x => x.chapter_number === c.chapter_number) === i)
        .sort((a, b) => a.chapter_number - b.chapter_number);
}

export function extractChapterNumFromChapterObj(item) {
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
    const urlVal = item.url || item.slug || item.href || item.link || item.path || '';
    if (urlVal) return extractChapterNumFromUrl(String(urlVal));
    return null;
}

export function extractChapterUrlFromObj(item, origin, seriesUrl) {
    const raw = item.url || item.href || item.link || item.path || item.slug || item.chapter_url || '';
    if (!raw) return seriesUrl;
    const s = String(raw);
    if (s.startsWith('http')) return s;
    if (s.startsWith('/')) return origin + s;
    try { return new URL(s, seriesUrl).toString(); } catch { return seriesUrl; }
}
