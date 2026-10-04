import crypto from 'crypto';
import { requiredImageProxySecret } from './envGuard.js';

// ══════════════════════════════════════════════════════════════════════════
// GÜVENLİK DÜZELTMESİ — imzalı proxy YENİDEN AKTİF
//
// Önceki sürümde getProxiedImageUrl() bilinçli olarak bypass edilip orijinal
// imgbb (i.ibb.co) URL'i doğrudan döndürülüyordu ("bandwidth fix"). Bunun
// sonucu: sayfa görselleri kalıcı, tahmin edilebilir, token'sız, login
// gerektirmeyen linklerdi → herhangi bir scraper network sekmesinden bu
// linkleri toplayıp tüm bölümü indirebiliyordu. Bu proxy'yi anlamsız kılan
// en kritik açıktı, o yüzden geri açıldı.
//
// TTL = 24 SAAT (86400 saniye). Önceki 30 günlük TTL'e göre bandwidth/cache
// verimliliğinden biraz ödün veriyoruz ama sızan/paylaşılan bir linkin
// kullanılabilir ömrünü aylardan saatlere indiriyor. /api/img route'u zaten
// 'public, s-maxage=...' ile CDN'de (Cloudflare varsa orada) cache'lendiği
// için 24 saat içinde tekrarlanan isteklerin büyük çoğunluğu yine de origin'e
// (imgbb'ye) gitmeden CDN'den karşılanır — bandwidth kaybı sınırlı kalır.
// Referer kontrolü (app/api/img/route.js) ayrıca linkin başka sitelere
// doğrudan hotlink'lenmesini de zorlaştırır.
// ══════════════════════════════════════════════════════════════════════════

const ALLOWED_PROXY_HOSTS = new Set(['i.ibb.co']);

// GÜVENLİK DÜZELTMESİ: İmza anahtarı artık YALNIZCA IMAGE_PROXY_SECRET'tır; JWT_SECRET'a
// geri düşülmüyor (ve önceden de tahmin edilebilir sabit bir string'e düşülüyordu). Eksik
// ya da 32 karakterden kısaysa requiredImageProxySecret() açıkça hata fırlatır —
// "güvensiz ama çalışan" yerine "güvenli ama deploy'u durduran" tercih edildi.
// Not: Anahtar DEĞİŞİRSE daha önce üretilmiş /api/img linkleri geçersiz olur
// (TTL zaten 24 saat; sayfalar yeniden render olunca yeni linkler üretilir).
function getSecret() {
    return requiredImageProxySecret();
}

function sign(payload) {
    return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 32);
}

/**
 * Sayfa görselinin gerçek (imgbb) URL'ini imzalı, süreli bir /api/img
 * linkine sarar. Böylece:
 *  - Gerçek imgbb URL'i HTML/network sekmesinde görünmez, sadece imzalı
 *    token görünür — sıralı/tahmin edilebilir URL taraması işe yaramaz.
 *  - Token süresi dolunca (bkz. verifyImageToken) link çalışmaz olur.
 *  - Sadece bilinen host'lara (ALLOWED_PROXY_HOSTS) izin verilir.
 *  - /api/img route'u ayrıca referer kontrolü ve rate limit uygular.
 */
export function getProxiedImageUrl(originalUrl, _ttlSeconds = 86400) {
    if (!originalUrl || typeof originalUrl !== 'string') return originalUrl;
    if (originalUrl.startsWith('/')) return originalUrl;

    let hostname;
    try {
        hostname = new URL(originalUrl).hostname;
    } catch {
        return originalUrl;
    }
    if (!ALLOWED_PROXY_HOSTS.has(hostname)) return originalUrl;

    const exp = Date.now() + _ttlSeconds * 1000;
    const payload = `${originalUrl}|${exp}`;
    const sig = sign(payload);
    const u = Buffer.from(originalUrl, 'utf8').toString('base64url');

    return `/api/img?u=${u}&e=${exp}&s=${sig}`;
}

/**
 * /api/img route'unun aldığı u/e/s parametrelerini doğrular.
 */
export function verifyImageToken({ u, e, s }) {
    if (!u || !e || !s) return { valid: false };

    const exp = Number(e);
    if (!Number.isFinite(exp) || Date.now() > exp) return { valid: false };

    let originalUrl;
    try {
        originalUrl = Buffer.from(u, 'base64url').toString('utf8');
    } catch {
        return { valid: false };
    }

    let hostname;
    try {
        hostname = new URL(originalUrl).hostname;
    } catch {
        return { valid: false };
    }
    if (!ALLOWED_PROXY_HOSTS.has(hostname)) return { valid: false };

    const expectedSig = sign(`${originalUrl}|${exp}`);
    const a = Buffer.from(String(s), 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };

    return { valid: true, url: originalUrl };
}
