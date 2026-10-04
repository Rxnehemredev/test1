// lib/security/uaFilter.js
//
// ══════════════════════════════════════════════════════════════════════════
// UA FILTER — User-Agent'a göre bilinen scraper araçlarını tespit eder,
// SEO/sosyal medya botlarını (Googlebot, Discordbot vb.) muaf tutar.
//
// Ayrı dosyada tutulmasının sebebi: bu listeler sık güncellenir (yeni bir
// scraper kütüphanesi veya yeni bir "iyi" bot eklemek gerektiğinde) ve bu
// güncellemelerin rate limiter veya threat shield mantığını kazara
// bozma riski olmamalı.
// ══════════════════════════════════════════════════════════════════════════

// ── Bilinen scraper UA kalıpları ─────────────────────────────────────────
export const BLOCKED_UA_PATTERNS = [
    /python-requests/i, /\bscrapy\b/i, /^axios\//i, /node-fetch/i,
    /go-http-client/i, /\bcurl\//i, /\bwget\b/i, /libwww-perl/i,
    /okhttp/i, /HeadlessChrome/i, /PhantomJS/i, /^java\//i,
    /\bpostman\b/i, /\bhttpclient\b/i,
];

// ── SEO botları (muaf) ────────────────────────────────────────────────────
export const ALLOWED_BOT_PATTERNS = [
    /Googlebot/i, /bingbot/i, /Applebot/i, /DuckDuckBot/i,
    /facebookexternalhit/i, /Twitterbot/i, /WhatsApp/i,
    /Slackbot/i, /Discordbot/i, /YandexBot/i, /AhrefsBot/i, /SemrushBot/i,
];

/**
 * @param {string} ua User-Agent header değeri
 * @returns {boolean} İzin verilen (SEO/sosyal) bir bot mu?
 */
export function isGoodBot(ua) {
    return ALLOWED_BOT_PATTERNS.some((re) => re.test(ua));
}

/**
 * @param {string} ua User-Agent header değeri
 * @returns {boolean} Otomatik/scraper bir araç gibi mi görünüyor?
 *   (boş UA veya bilinen scraper imzası; iyi botlar hariç)
 */
export function looksAutomated(ua) {
    if (isGoodBot(ua)) return false;
    return ua.trim() === '' || BLOCKED_UA_PATTERNS.some((re) => re.test(ua));
}
