// lib/apiCache.js
// Sıralama / top-liste gibi sık istenen ama sık değişmesi gerekmeyen
// endpoint'ler için basit, modül-seviyesi (in-memory) TTL cache.

const _store = new Map(); // key -> { data, expiresAt }

/**
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fetcher
 * @returns {Promise<any>}
 */
export async function getCached(key, ttlMs, fetcher) {
    const now = Date.now();
    const entry = _store.get(key);

    if (entry && now < entry.expiresAt) {
        return entry.data;
    }

    const data = await fetcher();
    _store.set(key, { data, expiresAt: now + ttlMs });
    return data;
}

/** Belirli bir cache anahtarını (veya prefix'e uyan tüm anahtarları) temizler. */
export function invalidateCache(keyOrPrefix) {
    if (_store.has(keyOrPrefix)) {
        _store.delete(keyOrPrefix);
        return;
    }
    for (const key of _store.keys()) {
        if (key.startsWith(keyOrPrefix)) _store.delete(key);
    }
}

// Süresi dolmuş eski kayıtları periyodik temizle (memory leak önlemi)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of _store.entries()) {
            if (now >= entry.expiresAt) _store.delete(key);
        }
    }, 10 * 60 * 1000); // her 10 dakikada bir
}

// ── TTL sabitleri ──────────────────────────────────────────────────────────
// Cloudflare katmanı eklendiyse s-maxage zaten CDN'de tutuyor; bu cache
// sunucu-içi (cold-start sonrası ilk istek) fallback olarak çalışır.

/** Sıralama/top-liste: 2 dk. content_version değişince (seri ekle/sil) TTL beklenmeden yenilenir. */
export const RANKING_CACHE_TTL = 2 * 60 * 1000; // 2 dk (seri eklenince/silinince content_version ile anında geçersiz olur; zamanlanmış bölümler için üst sınır)

/** Trending: 2 dk. */
export const TRENDING_CACHE_TTL = 2 * 60 * 1000; // 2 dk

/** Seri detayı (genres, cover vb.): 15 dk. */
export const SERIES_CACHE_TTL = 15 * 60 * 1000; // 15 dk

/** Settings: 5 dk (admin değiştiğinde invalidate zaten var). */
export const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dk
