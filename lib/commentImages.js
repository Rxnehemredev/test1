// ─────────────────────────────────────────────────────────────────────────
// Yorumlara eklenebilen görseller için TEK merkezi izin listesi.
//
// Neden var? Yorumlara herhangi bir https adresinden görsel eklenebildiğinde,
// yorumu açan HER ziyaretçinin tarayıcısı o siteye istek atıyor (IP adresi,
// User-Agent vb. saldırganın sunucusuna gidiyor — "IP logger" görseli).
// Bu yüzden yalnızca güvendiğimiz servislerdeki görsellere izin veriyoruz:
//
//   • GIPHY  → media.giphy.com, media0..media9.giphy.com, i.giphy.com
//   • imgbb  → i.ibb.co
//
// Yeni bir servise izin vermek için ALLOWED_HOSTS'a alan adını eklemeniz yeterli;
// hem tarayıcıdaki görüntüleme hem de sunucudaki doğrulama bu listeyi kullanır.
//
// Bu dosya hiçbir Node/Next modülü import etmez — hem client hem server'da
// güvenle kullanılabilir.
// ─────────────────────────────────────────────────────────────────────────

export const ALLOWED_HOSTS = [
    /^media\d*\.giphy\.com$/,
    /^i\.giphy\.com$/,
    /^i\.ibb\.co$/,
];

// Kullanıcıya gösterilecek kısa açıklama
export const ALLOWED_HOSTS_LABEL = 'GIPHY (GIF) ve imgbb (i.ibb.co)';

// `![alt](url)` biçimindeki görsel işaretlerini yakalar
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]*)\)/g;

/**
 * URL'nin izinli bir servise ait, güvenli bir https görsel adresi olup olmadığını döner.
 * Alan adı, string üzerinde regex ile DEĞİL, URL ayrıştırıcısıyla kontrol edilir:
 * `https://i.ibb.co@evil.com/x.png` gibi userinfo hileleri bu sayede yakalanır.
 */
export function isAllowedImageUrl(raw) {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 500) return false;
    let u;
    try {
        u = new URL(raw.trim());
    } catch {
        return false;
    }
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== '443') return false;
    return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
}

/**
 * Metindeki `![...](url)` görsellerinden izinli olmayan İLK adresi döner;
 * hepsi izinliyse (ya da hiç görsel yoksa) null döner.
 * Sunucu tarafında yorum kaydedilmeden/düzenlenmeden önce kullanılır.
 */
export function findDisallowedImageUrl(text) {
    if (typeof text !== 'string') return null;
    for (const m of text.matchAll(MARKDOWN_IMAGE_RE)) {
        if (!isAllowedImageUrl(m[1])) return m[1];
    }
    return null;
}
