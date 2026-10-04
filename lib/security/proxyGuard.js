// lib/security/proxyGuard.js
//
// ══════════════════════════════════════════════════════════════════════════
// ÖN PROXY KİLİDİ (SELF_HOSTED=1) — Vercel dışında "arka kapıyı" kapatır.
//
// Sorun: Vercel'de internete bakan tek kapı Vercel'in edge ağıdır. VPS'te ise
// Node sürecine (ör. :3000) doğrudan bağlanabilen herkes nginx'i, TLS'i, hız
// sınırlarını ve fail2ban'ı ATLAYIP uygulamaya ulaşabilir; ayrıca X-Forwarded-For'u
// kendisi yazarak IP korumalarını kandırabilir.
//
// Çözüm: nginx her isteğe gizli bir başlık (X-Asteria-Proxy) ekler. SELF_HOSTED=1
// iken bu başlığı taşımayan HER istek 403 alır. Böylece uygulamaya yalnızca
// nginx üzerinden girilebilir; X-Forwarded-For da yalnızca nginx'in yazdığı için
// güvenilirdir.
//
// SELF_HOSTED=1 ama PROXY_SHARED_SECRET eksik/kısaysa istekler 503 ile REDDEDİLİR
// (fail-closed): yanlış yapılandırılmış güvensiz bir site yerine çalışmayan bir
// site tercih edilir. Vercel'de (VERCEL=1) bu katman hiçbir şey yapmaz.
// ══════════════════════════════════════════════════════════════════════════

export const PROXY_HEADER = 'x-asteria-proxy';
const MIN_SECRET_LENGTH = 32;

export function isSelfHosted(env = process.env) {
    return env.SELF_HOSTED === '1' && env.VERCEL !== '1' && !env.VERCEL_ENV;
}

/** Edge uyumlu sabit-zamanlı karşılaştırma (Node 'crypto' kullanmaz). */
export function constantTimeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const len = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < len; i++) {
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diff === 0;
}

/**
 * @param {Headers} headers
 * @returns {{status:number, reason:string, weight:number} | null}  null = geçti / kontrol yok
 */
export function checkProxy(headers, env = process.env) {
    if (!isSelfHosted(env)) return null;
    const secret = env.PROXY_SHARED_SECRET || '';
    if (secret.length < MIN_SECRET_LENGTH) {
        return { status: 503, reason: 'proxy_secret_not_configured', weight: 0 };
    }
    const provided = headers.get(PROXY_HEADER) || '';
    if (!constantTimeEqual(provided, secret)) {
        // weight 0: IP bilgisi bu aşamada güvenilmez (sahte XFF olabilir) → banlama yok.
        return { status: 403, reason: 'direct_access', weight: 0 };
    }
    return null;
}

/**
 * Uygulamanın KENDİNE attığı istekler (ör. middleware → /api/settings) için başlıklar.
 * SELF_HOSTED değilse boş döner.
 */
export function internalHeaders(env = process.env) {
    if (!isSelfHosted(env)) return {};
    return {
        [PROXY_HEADER]: env.PROXY_SHARED_SECRET || '',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'AsteriaInternal/1.0',
    };
}
