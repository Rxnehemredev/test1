import { fetchJson, isValidChapterNum } from '../utils.js';

export async function scrapeMangaDex(seriesUrl, language = 'en') {
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

export async function fetchMangaDexPages(chapterId) {
    const data = await fetchJson(`https://api.mangadex.org/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = data;
    return chapter.data.map(f => `${baseUrl}/data/${chapter.hash}/${f}`);
}
