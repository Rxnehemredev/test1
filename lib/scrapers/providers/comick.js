import { fetchJson, isValidChapterNum } from '../utils.js';

export async function scrapeComick(seriesUrl) {
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

export async function fetchComickPages(hid) {
    const data = await fetchJson(`https://api.comick.fun/chapter/${hid}/`);
    return (data.chapter?.images || []).map(img => img.url);
}
