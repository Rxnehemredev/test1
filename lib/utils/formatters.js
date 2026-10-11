/**
 * Metin ve tür biçimlendirme yardımcıları.
 * Türkçe karakter duyarlı ve tutarlı biçimlendirme sağlar.
 */

export function formatType(type) {
    if (!type) return '';
    const lower = type.toLowerCase();
    if (lower === 'manga') return 'Manga';
    if (lower === 'manhwa') return 'Manhwa';
    if (lower === 'manhua') return 'Manhua';
    if (lower === 'webtoon') return 'Webtoon';
    if (lower === 'novel') return 'Roman';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function capitalizeFirst(str) {
    if (!str) return '';
    let first = str.charAt(0);
    if (first === 'i') first = 'İ';
    else if (first === 'ı') first = 'I';
    else if (first === 'ş') first = 'Ş';
    else if (first === 'ğ') first = 'Ğ';
    else if (first === 'ü') first = 'Ü';
    else if (first === 'ö') first = 'Ö';
    else if (first === 'ç') first = 'Ç';
    else first = first.toUpperCase();
    return first + str.slice(1);
}

export function toTitleCaseTr(str) {
    if (!str) return '';
    const lower = str.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
    return lower.split(' ').map(word => {
        if (!word) return '';
        let first = word.charAt(0);
        if (first === 'i') first = 'İ';
        else if (first === 'ı') first = 'I';
        else if (first === 'ş') first = 'Ş';
        else if (first === 'ğ') first = 'Ğ';
        else if (first === 'ü') first = 'Ü';
        else if (first === 'ö') first = 'Ö';
        else if (first === 'ç') first = 'Ç';
        else first = first.toUpperCase();
        return first + word.slice(1);
    }).join(' ');
}

export function fmtCh(n) {
    const num = Number(n);
    if (isNaN(num)) return n;
    return num % 1 === 0 ? String(Math.floor(num)) : String(num);
}
