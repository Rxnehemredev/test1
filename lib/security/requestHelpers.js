// lib/security/requestHelpers.js
//
// Küçük, bağımsız yardımcılar: client IP çözümleme ve standart deny/
// rate-limit response'ları. Diğer tüm koruma modülleri bunları kullanır;
// burada değişiklik yapmak site genelini etkiler ama en az kod satırına
// sahip dosya olduğu için hata riski en düşük olan yer burasıdır.

import { NextResponse } from 'next/server';

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:.]+$/;

function cleanIp(value) {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (!v || v.length > 45) return null;
    if (IPV4_RE.test(v) || (v.includes(':') && IPV6_RE.test(v))) return v;
    return null;
}

/**
 * Güvenilir proxy sayısı (TRUSTED_PROXY_COUNT). Geçersiz/negatif/boş → 0.
 * Üst sınır 10: yanlış yazılmış büyük bir değer her isteği '0.0.0.0'a düşürmesin.
 */
function trustedProxyCount() {
    const n = Number.parseInt(process.env.TRUSTED_PROXY_COUNT || '', 10);
    if (!Number.isInteger(n) || n < 1) return 0;
    return Math.min(n, 10);
}

function isVercel() {
    return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
}

/**
 * Gerçek client IP'sini döndürür. İstemci `X-Forwarded-For` / `X-Real-IP` /
 * `CF-Connecting-IP` header'larını kendisi gönderebildiği için, bir header SADECE
 * onu güvenilir bir proxy eklediyse okunur. Kaynak önceliği:
 *
 *  1. `TRUSTED_PROXY=cloudflare` → `cf-connecting-ip` (tüm trafik Cloudflare'den geçiyorsa).
 *  2. `TRUSTED_PROXY_COUNT=N` (kendi proxy zinciriniz; N = uygulamanın önündeki
 *     güvenilir proxy sayısı) → `x-forwarded-for` listesinde SAĞDAN N. eleman
 *     (`parts[len - N]`). Soldaki, istemcinin gönderdiği/uydurduğu girdiler ASLA
 *     kullanılmaz. Liste N'den kısaysa zincir bypass edilmiş demektir → '0.0.0.0'.
 *       N=1: nginx/ALB gibi tek proxy → son eleman.
 *       N=2: Cloudflare + nginx → sondan ikinci eleman.
 *  3. Vercel (`VERCEL=1`) → `x-real-ip`, yoksa `x-forwarded-for`'un İLK elemanı.
 *     Vercel bu header'ları kendi gördüğü bağlantı IP'siyle EZER; istemcinin
 *     gönderdiği değer buraya ulaşmaz.
 *  4. NODE_ENV=development → `x-real-ip` (yerel geliştirme).
 *  5. Geriye dönük uyumluluk (tanımsız ortam): `x-forwarded-for`'un SON elemanı
 *     (= TRUSTED_PROXY_COUNT=1 ile aynı).
 *
 * Request VEYA Headers nesnesi kabul eder (server component'ler için
 * `await headers()` sonucu doğrudan verilebilir).
 *
 * @param {Request | Headers} requestOrHeaders
 * @returns {string} Geçerli bir IP, bulunamazsa '0.0.0.0'
 */
export function getClientIp(requestOrHeaders) {
    const h = requestOrHeaders?.headers ?? requestOrHeaders;
    if (!h || typeof h.get !== 'function') return '0.0.0.0';

    // 1) Cloudflare
    if (process.env.TRUSTED_PROXY === 'cloudflare') {
        const cf = cleanIp(h.get('cf-connecting-ip'));
        if (cf) return cf;
    }

    const xff = h.get('x-forwarded-for');
    const parts = xff ? xff.split(',') : [];

    // 2) Kendi proxy zinciri
    const count = trustedProxyCount();
    if (count > 0) {
        if (parts.length < count) return '0.0.0.0';
        return cleanIp(parts[parts.length - count]) || '0.0.0.0';
    }

    // 3) Vercel
    if (isVercel()) {
        const real = cleanIp(h.get('x-real-ip'));
        if (real) return real;
        const first = cleanIp(parts[0]);
        if (first) return first;
        return '0.0.0.0';
    }

    // 4) Yerel geliştirme
    if (process.env.NODE_ENV === 'development') {
        const real = cleanIp(h.get('x-real-ip'));
        if (real) return real;
    }

    // 5) Geriye dönük uyumluluk: en sağdaki (en yakın proxy'nin eklediği) girdi
    if (parts.length > 0) {
        const last = cleanIp(parts[parts.length - 1]);
        if (last) return last;
    }

    return '0.0.0.0';
}

export function deny(status, message) {
    // no-store: bir CDN/proxy'nin 403/429'u cache'leyip meşru kullanıcılara sunmasını önler.
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function denyRateLimited(retryAfter) {
    return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } }
    );
}
