/**
 * SERVER-SIDE Settings Memory Cache (Node.js / Serverless Instance Runtime)
 * ---------------------------------------------------------------------------
 * Bu modül YALNIZCA SERVER tarafında (SSR ve API Route'larında) çalışır.
 * layout.js (SSR), /api/settings/route.js ve /api/admin/settings/route.js
 * bu modülü kullanarak Turso DB sorgularını önbelleğe alır.
 *
 * NOT: Client tarafındaki browser fetch önbelleği için bkz: lib/settingsCache.js
 * İki modül çalışma ortamı (Server vs Client) açısından farklı semantiklere sahiptir.
 * ---------------------------------------------------------------------------
 */

let _cache = null;
let _cacheAt = 0;
// 15 sn: Vercel'de her instance'ın kendi in-memory cache'i var; admin kaydı sadece kendi instance'ını
// temizleyebiliyor. Kısa TTL bunu ~15 sn'ye indirir (DB'ye 15 sn'de 1 hafif sorgu).
export const SETTINGS_CACHE_TTL = 15_000;

export function getSettingsCache() {
    return { cache: _cache, cacheAt: _cacheAt };
}

export function setSettingsCache(data) {
    _cache = data;
    _cacheAt = Date.now();
}

// Ham (filtrelenmemiş) setting_key -> setting_value map'i için ayrı bir cache
// slotu — /api/settings route'unun döndürdüğü şekil, layout.js'in SSR için
// kullandığı filtrelenmiş/varsayılanlı şekilden farklı olduğundan ayrı tutulur.
let _rawCache = null;
let _rawCacheAt = 0;

export function getRawSettingsCache() {
    return { cache: _rawCache, cacheAt: _rawCacheAt };
}

export function setRawSettingsCache(data) {
    _rawCache = data;
    _rawCacheAt = Date.now();
}

export function invalidateSettingsCache() {
    _cache = null;
    _cacheAt = 0;
    _rawCache = null;
    _rawCacheAt = 0;
}
