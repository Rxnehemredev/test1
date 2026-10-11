import * as cheerio from 'cheerio';
import { fetchHtml, buildChapterListFromAnchors } from '../utils.js';

export async function scrapeDemonicScans(seriesUrl) {
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
