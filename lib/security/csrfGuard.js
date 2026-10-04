// lib/security/csrfGuard.js
//
// Global CSRF / cross-site yazma koruması (middleware seviyesinde, TÜM /api/*).
// Route bazında isSameOrigin() çağrısına güvenmek yerine merkezi ve fail-safe:
//
//  • Durum değiştiren metodlarda `Origin` varsa, sitenin izin verilen host'larından
//    biri OLMALI (`Origin: null` da reddedilir).
//  • `Origin` yoksa ama tarayıcı `Sec-Fetch-Site: cross-site` bildiriyorsa reddedilir.
//  • Origin/Sec-Fetch-Site hiç yoksa (curl, cron, sunucudan sunucuya) geçilir —
//    tarayıcılar cross-site POST'ta Origin'i HER ZAMAN gönderir; bu istekler zaten
//    kimlik doğrulama (cookie/JWT/secret) gerektirir.
//  • İzin verilen host listesi SABİT yapılandırmadan gelir (NEXT_PUBLIC_BASE_URL /
//    ALLOWED_HOSTS); istemcinin gönderdiği X-Forwarded-Host'a güvenilmez.

import { getAllowedHosts, isHostAllowed } from '@/lib/security/waf';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** @returns {{status:number, reason:string, weight:number} | null} */
export function csrfViolation(method, pathname, headers, allowed = getAllowedHosts()) {
    if (!MUTATING.has(String(method).toUpperCase())) return null;
    if (!pathname.startsWith('/api/')) return null; // Server Actions'ın kendi Origin kontrolü var
    if (pathname.startsWith('/api/cron/')) return null; // gizli anahtarla korunur

    const origin = headers.get('origin');
    if (origin) {
        if (origin === 'null') return { status: 403, reason: 'csrf:null_origin', weight: 2 };
        let host;
        try { host = new URL(origin).host; } catch { return { status: 403, reason: 'csrf:bad_origin', weight: 2 }; }

        if (allowed) {
            if (!isHostAllowed(host, allowed)) return { status: 403, reason: 'csrf:cross_origin', weight: 2 };
        } else {
            // Allowlist yapılandırılmamış: Host başlığıyla karşılaştır.
            const reqHost = (headers.get('host') || '').toLowerCase();
            if (!reqHost || host.toLowerCase() !== reqHost) return { status: 403, reason: 'csrf:cross_origin', weight: 2 };
        }
        return null;
    }

    if (headers.get('sec-fetch-site') === 'cross-site') {
        return { status: 403, reason: 'csrf:cross_site_fetch', weight: 2 };
    }
    return null;
}
