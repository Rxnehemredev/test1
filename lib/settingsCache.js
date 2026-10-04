// Modül-seviyesi singleton cache — tüm client component'lar aynı promise'i paylaşır.
// TTL: 60 saniye — bu süre geçince bir sonraki istekte yeniden çekilir.

const CACHE_TTL = 60_000; // 60 saniye

let _cache = null;
let _cacheAt = 0;
let _fetchingPromise = null;

export function getAppSettings() {
    // TTL geçmişse önbelleği geçersiz say
    if (_cache && Date.now() - _cacheAt < CACHE_TTL) return Promise.resolve(_cache);
    if (_fetchingPromise) return _fetchingPromise;
    _fetchingPromise = fetch('/api/settings')
        .then(r => r.json())
        .then(d => {
            _cache = d.settings || {};
            _cacheAt = Date.now();
            _fetchingPromise = null;
            return _cache;
        })
        .catch(() => {
            _fetchingPromise = null;
            return _cache || {}; // hata durumunda varsa eski cache'i döndür
        });
    return _fetchingPromise;
}

// Admin ayarları kaydettiğinde cache'i hemen temizlemek için çağrılabilir
export function invalidateAppSettingsCache() {
    _cache = null;
    _cacheAt = 0;
    _fetchingPromise = null;
}