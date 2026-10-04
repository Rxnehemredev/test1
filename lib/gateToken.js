// lib/gateToken.js
//
// DDoS-gate (Turnstile) doğrulamasının sonucunu tutan imzalı cookie için
// imzalama/doğrulama yardımcıları.
//
// ÖNEMLİ: Bu dosya HEM middleware.js (Edge runtime) HEM DE
// app/api/ddos-gate/route.js (Node runtime) tarafından import ediliyor.
import { requiredImageProxySecret } from './envGuard.js';
// Node crypto modülü Edge'de çalışmadığı için, her iki runtime'da da
// mevcut olan Web Crypto API'sini (globalThis.crypto.subtle) kullanıyoruz.
// Böylece iki ayrı imzalama implementasyonu bakımına gerek kalmıyor.

export const GATE_COOKIE_NAME = 'aerotoon_gate';
export const GATE_COOKIE_MAX_AGE_SEC = 12 * 60 * 60; // 12 saat — sessionStorage'a göre daha uzun ömürlü,
// yani gerçek kullanıcı sekmeyi kapatıp açsa bile (veya yeni sekme açsa bile)
// 12 saat boyunca tekrar Turnstile çözmek zorunda kalmıyor. Bandwidth/latency
// açısından bu, eski sessionStorage (sekme bazlı) yaklaşımından daha verimli.

const encoder = new TextEncoder();

// GÜVENLİK DÜZELTMESİ: Sabit/herkese açık fallback secret kaldırıldı. Bu
// dosya DDoS-gate cookie'sini imzalıyor — secret tahmin edilebilir olursa
// biri kendi geçerli "aerotoon_gate" cookie'sini üretip Turnstile'ı ve tüm
// gate mekanizmasını tamamen atlayabilirdi (yani asıl korumanın kendisi
// işe yaramaz hale gelirdi). Artık secret yoksa açıkça hata fırlatılıyor.
function getSecret() {
    // IMAGE_PROXY_SECRET zorunlu (JWT_SECRET'a geri düşülmez) — bkz. lib/envGuard.js.
    return requiredImageProxySecret();
}

let cachedKeyPromise = null;
function getKey() {
    if (!cachedKeyPromise) {
        cachedKeyPromise = crypto.subtle.importKey(
            'raw',
            encoder.encode(getSecret()),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify'],
        );
    }
    return cachedKeyPromise;
}

function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
    if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
}

/**
 * IP'nin "ağ önekini" döndürür: IPv4 → /24 (ilk 3 oktet), IPv6 → /48 (ilk 3 hextet).
 * Katı tek-IP bağlaması mobil ağlarda (CGNAT, operatör IP rotasyonu, Wi-Fi↔LTE geçişi)
 * gerçek kullanıcıları gate'ten düşürürdü; /24 çalınan bir cookie'nin başka bir ağdan
 * kullanılmasını engellerken bu kırılganlığı önler. Edge + Node uyumlu (saf string işleme).
 * Tanınmayan girdi → 'unknown' (tüm çözümlenemeyen istekler aynı kovaya düşer).
 * @param {string} ip
 * @returns {string}
 */
export function ipPrefix(ip) {
    if (typeof ip !== 'string') return 'unknown';
    let v = ip.trim().toLowerCase();
    const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/); // IPv4-mapped IPv6
    if (mapped) v = mapped[1];

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(v)) {
        const o = v.split('.').map(Number);
        if (o.some((n) => n > 255)) return 'unknown';
        return `${o[0]}.${o[1]}.${o[2]}`;
    }
    if (v.includes(':') && /^[0-9a-f:]+$/.test(v)) {
        const halves = v.split('::');
        if (halves.length > 2) return 'unknown';
        const head = halves[0] ? halves[0].split(':') : [];
        const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
        const missing = halves.length === 2 ? 8 - head.length - tail.length : 0;
        if (missing < 0) return 'unknown';
        const groups = [...head, ...Array(missing).fill('0'), ...tail];
        if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return 'unknown';
        return groups.slice(0, 3).map((g) => g.replace(/^0+(?=.)/, '')).join(':');
    }
    return 'unknown';
}

function gatePayload(exp, ip) {
    return `gate:${exp}:${ipPrefix(ip)}`;
}

/**
 * Turnstile doğrulaması başarılı olduğunda çağrılır, cookie value'sunu üretir.
 * HMAC payload'ı `gate:<exp>:<ip-öneki>` — cookie yalnızca verildiği ağ önekinden geçerlidir.
 * (Eski biçim `gate:<exp>` artık doğrulanmaz → mevcut cookie'ler bir kez yenilenir.)
 * @param {string} ip  İsteği yapan istemcinin IP'si (getClientIp)
 * @param {number} [ttlSeconds]
 */
export async function createGateCookieValue(ip, ttlSeconds = GATE_COOKIE_MAX_AGE_SEC) {
    const exp = Date.now() + ttlSeconds * 1000;
    const key = await getKey();
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(gatePayload(exp, ip)));
    return `${exp}.${toHex(sig)}`;
}

/**
 * Middleware'de her istekte cookie'nin geçerli olup olmadığını kontrol eder.
 * @param {string} value Cookie değeri
 * @param {string} ip    İsteği yapan istemcinin IP'si (getClientIp) — önek eşleşmeli
 */
export async function verifyGateCookieValue(value, ip) {
    if (!value || typeof value !== 'string') return false;
    const dotIndex = value.indexOf('.');
    if (dotIndex === -1) return false;
    const expStr = value.slice(0, dotIndex);
    const sigHex = value.slice(dotIndex + 1);
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const sigBytes = fromHex(sigHex);
    if (!sigBytes) return false;
    try {
        const key = await getKey();
        return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(gatePayload(exp, ip)));
    } catch {
        return false;
    }
}
