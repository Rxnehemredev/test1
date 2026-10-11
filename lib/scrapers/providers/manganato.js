import * as cheerio from 'cheerio';
import { fetchHtml, buildChapterListFromAnchors } from '../utils.js';

export async function scrapeManganato(seriesUrl) {
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
