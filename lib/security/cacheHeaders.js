// lib/security/cacheHeaders.js
//
// ══════════════════════════════════════════════════════════════════════════
// CDN CACHE HEADER'LARI — Cloudflare/Vercel Edge'in cache'e alabileceği GET
// endpoint'leri. Bu bir "koruma" katmanı değil ama middleware.js içindeki
// diğer güvenlik mantığından bağımsız, sık değişen bir liste olduğu için
// ayrı dosyada tutuluyor (yeni bir cache kuralı eklerken güvenlik
// kodlarına dokunma riski olmasın diye).
// ══════════════════════════════════════════════════════════════════════════

// endpoint pattern                      s-maxage  stale-while-revalidate
export const CACHEABLE_GET_ROUTES = [
    [/^\/api\/series\/top/,                  30,       60   ],  // 30 sn
    [/^\/api\/series\/trending/,             30,       60   ],  // 30 sn
    [/^\/api\/series\/similar/,              3600,     1800 ],  // 1 saat
    [/^\/api\/series\/editor-pick/,          30,       60   ],  // 30 sn
    [/^\/api\/chapters\/latest/,             300,      600  ],  // 5 dk
    [/^\/api\/languages$/,                   86400,    3600 ],  // 1 gün
    [/^\/api\/announcements$/,               300,      600  ],  // 5 dk
    [/^\/api\/series\/latest-updates/,       15,       30   ],  // 15 sn (sayfalı, değişken)
    [/^\/api\/series$/,                      15,       30   ],  // 15 sn
];

/**
 * Eşleşen route için Cache-Control header'ını response üzerine uygular.
 * @param {NextResponse} response
 * @param {string} pathname
 */
export function applyCacheHeaders(response, pathname) {
    for (const [re, smaxage, swr] of CACHEABLE_GET_ROUTES) {
        if (re.test(pathname)) {
            response.headers.set(
                'Cache-Control',
                `public, s-maxage=${smaxage}, stale-while-revalidate=${swr}`
            );
            break;
        }
    }
}
