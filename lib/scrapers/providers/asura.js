import * as cheerio from 'cheerio';
import { fetchHtml, isValidChapterNum, buildChapterListFromAnchors } from '../utils.js';

export async function scrapeAsuraScans(seriesUrl) {
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

export async function extractChaptersFromAstroPropsSeries(html, origin) {
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
