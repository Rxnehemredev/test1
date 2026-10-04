// lib/security/memStore.js
//
// ══════════════════════════════════════════════════════════════════════════
// SÜRELİ (TTL) BELLEK-İÇİ SAYAÇ DEPOSU — Edge + Node uyumlu, bağımlılık yok.
//
// Vercel dışında (VPS / Docker / `next start`) uygulama TEK sürekli çalışan
// süreçtir; yani bellek-içi sayaç serverless'taki gibi "her instance'ta ayrı"
// değil, gerçekten globaldir ve doğru çalışır. Bu modül, Upstash Redis
// olmadan da ban / saldırı-modu / rate-limit korumalarının TAM çalışmasını
// sağlar. (Birden çok süreç/sunucu çalıştırırsanız Redis kullanın.)
//
// DoS DAYANIKLILIĞI:
//  • Boyut sınırlı: sahte IP'lerle depoyu şişirerek belleği tüketmek mümkün değil.
//  • Süresi dolanlar fırsat buldukça (arka plan timer'ı olmadan) süpürülür.
//  • Ban kayıtları sayaçlardan AYRI bir depoda tutulur → sayaç doldurma
//    saldırısı mevcut banları "eskitip" düşüremez.
//  • globalThis üzerinde tutulur → dev HMR / modül yeniden yüklemesinde sıfırlanmaz.
// ══════════════════════════════════════════════════════════════════════════

function createTtlMap(maxEntries, sweepEveryMs = 30_000) {
    const map = new Map(); // key -> { v, exp }
    let lastSweep = 0;

    function sweep(now, force = false) {
        if (!force && now - lastSweep < sweepEveryMs) return;
        lastSweep = now;
        for (const [k, e] of map) if (e.exp <= now) map.delete(k);
    }

    function enforceCap(now) {
        if (map.size <= maxEntries) return;
        sweep(now, true);
        if (map.size <= maxEntries) return;
        // Hâlâ doluysa en eski %10'u at (Map ekleme sırasını korur).
        let drop = Math.ceil(maxEntries * 0.1);
        for (const k of map.keys()) {
            map.delete(k);
            if (--drop <= 0) break;
        }
    }

    return {
        /** Atomik artır. TTL yalnızca anahtar ilk oluştuğunda (NX) ayarlanır. */
        incr(key, ttlMs, by = 1, now = Date.now()) {
            sweep(now);
            const e = map.get(key);
            if (e && e.exp > now) {
                e.v += by;
                return { count: e.v, ttlMs: e.exp - now };
            }
            map.set(key, { v: by, exp: now + ttlMs });
            enforceCap(now);
            return { count: by, ttlMs };
        },
        get(key, now = Date.now()) {
            const e = map.get(key);
            if (!e) return null;
            if (e.exp <= now) { map.delete(key); return null; }
            return e.v;
        },
        set(key, value, ttlMs, now = Date.now()) {
            sweep(now);
            map.set(key, { v: value, exp: now + ttlMs });
            enforceCap(now);
        },
        del(key) { map.delete(key); },
        size() { return map.size; },
        clear() { map.clear(); },
    };
}

const g = globalThis;
if (!g.__asteriaShieldStores) {
    g.__asteriaShieldStores = {
        counters: createTtlMap(Number(process.env.SHIELD_MEM_MAX_ENTRIES) || 100_000),
        bans: createTtlMap(20_000, 60_000),
    };
}

/** rps / ihlal / log-sınırlama sayaçları */
export const counters = g.__asteriaShieldStores.counters;
/** banlı IP kayıtları (ayrı depo, bkz. yukarı) */
export const bans = g.__asteriaShieldStores.bans;
