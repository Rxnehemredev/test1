// lib/security/bodyLimit.js
//
// İstek gövdesi boyut sınırı. Vercel fonksiyonları gövdeyi ~4.5 MB ile sınırlar;
// kendi sunucunuzda böyle bir sınır YOKTUR → sınırsız yükleme ile disk/bellek
// doldurma mümkün olur. Burası Content-Length'e göre yolun sınıfına özel tavan koyar
// (nginx'te client_max_body_size ile ikinci kez uygulanır).

const MB = 1024 * 1024;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function num(env, key, def) {
    const v = Number(env[key]);
    return Number.isFinite(v) && v > 0 ? v : def;
}

/** @returns {number} bayt */
export function bodyLimitFor(pathname, env = process.env) {
    if (pathname.startsWith('/api/admin')) return num(env, 'BODY_LIMIT_ADMIN_MB', 64) * MB;
    if (
        pathname.startsWith('/api/auth/profile') ||
        pathname.startsWith('/api/comments') ||
        pathname.startsWith('/api/chat') ||
        pathname.startsWith('/api/favicon')
    ) return num(env, 'BODY_LIMIT_UPLOAD_MB', 8) * MB;
    if (pathname.startsWith('/api/')) return num(env, 'BODY_LIMIT_API_MB', 1) * MB;
    return num(env, 'BODY_LIMIT_PAGE_MB', 5) * MB; // Server Action sınırıyla (5mb) uyumlu
}

/** @returns {{status:number, reason:string, weight:number} | null} */
export function checkBodySize(method, pathname, headers, env = process.env) {
    if (!MUTATING.has(String(method).toUpperCase())) return null;
    const cl = headers.get('content-length');
    if (cl === null) return null;
    const n = Number(cl);
    if (!Number.isFinite(n) || n < 0) return { status: 400, reason: 'body:bad_length', weight: 2 };
    if (n > bodyLimitFor(pathname, env)) return { status: 413, reason: 'body:too_large', weight: 1 };
    return null;
}
