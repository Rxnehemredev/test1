import { NextResponse } from 'next/server';
import { checkRequest, recordViolation, logBlock } from '@/lib/threatShield';
import { isScannerUA, looksLikeSqlInjection } from '@/lib/security/sqliFilter';
import { GATE_COOKIE_NAME, verifyGateCookieValue } from '@/lib/gateToken';

import { isBlockedPath } from '@/lib/security/pathBlock';
import { isGoodBot, looksAutomated } from '@/lib/security/uaFilter';
import { getGateSettings, isGatablePage } from '@/lib/security/ddosGate';
import {
    authFloodLimiter,
    catalogLimiter,
    adminLimiter,
    globalApiLimiter,
    goodBotLimiter,
} from '@/lib/security/rateLimiters';
import { applyCacheHeaders } from '@/lib/security/cacheHeaders';
import { getClientIp, deny, denyRateLimited } from '@/lib/security/requestHelpers';
import { generateNonce, buildCsp } from '@/lib/security/csp';
import { inspectRequest } from '@/lib/security/waf';
import { checkProxy, isSelfHosted, PROXY_HEADER } from '@/lib/security/proxyGuard';
import { checkBodySize } from '@/lib/security/bodyLimit';
import { csrfViolation } from '@/lib/security/csrfGuard';

// ══════════════════════════════════════════════════════════════════════════
// ASTERIA SCANS — Edge Middleware (Vercel'e BAĞIMLI DEĞİL)
//
// Katman sırası (en ucuz / en kritik önce):
//   0. Ön proxy kilidi        — SELF_HOSTED=1: nginx'i atlayan doğrudan erişim reddedilir
//   1. Admin IP allowlist     — opsiyonel, fail-closed
//   2. Ban / saldırı modu     — Threat Shield (Redis varsa Redis, yoksa bellek)
//   3. WAF                    — metod, Host, smuggling, URL anomalisi, payload kalıpları,
//                               gövde boyutu, CSRF (Origin)
//   4. Zararlı path / tarayıcı UA / SQLi
//   5. Otomasyon UA'ları, DDoS gate (Turnstile), saldırı-modu API meydan okuması
//   6. Rate limitler
//
// Her katman kendi try/catch'inde çalışır: bir katmanda hata olursa (Redis zaman
// aşımı, bozuk regex...) o katman atlanır ve LOGLANIR, SİTE ÇÖKMEZ. İSTİSNA: ön proxy
// kilidi bilerek fail-closed'dır (yanlış yapılandırma = çalışmayan site, açık site değil).
// ══════════════════════════════════════════════════════════════════════════

const STATUS_TEXT = {
    400: 'Bad Request',
    403: 'Forbidden',
    405: 'Method Not Allowed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    416: 'Range Not Satisfiable',
    421: 'Misdirected Request',
    431: 'Request Header Fields Too Large',
    503: 'Service Unavailable',
};

// Saldırı modunda bile gate cookie'si OLMADAN erişilebilen API'ler.
const CHALLENGE_EXEMPT_PREFIXES = [
    '/api/ddos-gate', '/api/settings', '/api/health', '/api/maintenance-status',
    '/api/favicon', '/api/cron/',
];

async function penalize(ip, finding) {
    logBlock(ip, finding.reason);
    if (finding.weight > 0) {
        try { await recordViolation(ip, finding.reason, finding.weight); } catch { /* yoksay */ }
    }
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const method = request.method;
    const ua = request.headers.get('user-agent') || '';

    // ── 0) Ön proxy kilidi (yalnız SELF_HOSTED=1) — FAIL-CLOSED ────────────
    const proxyProblem = checkProxy(request.headers);
    if (proxyProblem) {
        if (proxyProblem.status === 503) {
            console.error('[ASTERIA-SHIELD] YAPILANDIRMA HATASI: SELF_HOSTED=1 ama PROXY_SHARED_SECRET (en az 32 karakter) tanımlı değil — istekler reddediliyor.');
        }
        return deny(proxyProblem.status, STATUS_TEXT[proxyProblem.status] || 'Forbidden');
    }

    const clientIp = getClientIp(request);
    if (isSelfHosted() && clientIp === '0.0.0.0') {
        // Proxy zinciri doğru kurulmamış (X-Forwarded-For yok/eksik). Herkesi tek IP'ye
        // toplayıp rate limitleri kendi kendine kilitlemek yerine açıkça reddet.
        console.error('[ASTERIA-SHIELD] YAPILANDIRMA HATASI: istemci IP\'si çözümlenemedi. nginx X-Forwarded-For ($remote_addr) göndermeli ve TRUSTED_PROXY_COUNT=1 olmalı.');
        return deny(400, 'Bad Request');
    }

    // ── 1) Admin IP allowlist (opsiyonel) — FAIL-CLOSED ───────────────────
    if (pathname.startsWith('/admin-panel') || pathname.startsWith('/api/admin')) {
        const allowlist = (process.env.ADMIN_ALLOWED_IPS || '')
            .split(',').map((s) => s.trim()).filter(Boolean);
        if (allowlist.length > 0 && (clientIp === '0.0.0.0' || !allowlist.includes(clientIp))) {
            return deny(403, 'Forbidden');
        }
    }

    // ── 2) THREAT SHIELD: ban kontrolü + global trafik / saldırı modu ──────
    let threatState = { banned: false, attackActive: false };
    try {
        threatState = await checkRequest(clientIp);
    } catch (err) {
        if (err?.message?.includes('UPSTASH_REDIS_REST_URL')) {
            console.error('[ASTERIA-SHIELD] YAPILANDIRMA HATASI:', err.message);
            return deny(503, 'Service Unavailable');
        }
        console.error('[middleware] threatShield hatası, katman atlanıyor:', err);
    }
    if (threatState.banned) {
        return deny(403, 'Forbidden');
    }

    // ── 3) WAF: yapısal anomaliler, Host, smuggling, payload, gövde boyutu, CSRF ──
    let finding = null;
    try {
        finding =
            inspectRequest({ method, pathname, search: request.nextUrl.search, headers: request.headers }) ||
            checkBodySize(method, pathname, request.headers) ||
            csrfViolation(method, pathname, request.headers);
    } catch (err) {
        console.error('[middleware] WAF hatası, katman atlanıyor:', err);
    }
    if (finding) {
        await penalize(clientIp, finding);
        return deny(finding.status, STATUS_TEXT[finding.status] || 'Forbidden');
    }

    // ── 4) Zararlı path / tarayıcı araçları / SQLi ─────────────────────────
    if (isBlockedPath(pathname)) {
        await penalize(clientIp, { reason: 'blocked_path', weight: 2 });
        return deny(403, 'Forbidden');
    }
    if (isScannerUA(ua) || looksLikeSqlInjection(request.nextUrl.search)) {
        await penalize(clientIp, { reason: 'scanner_or_sqli', weight: 3 });
        return deny(403, 'Forbidden');
    }

    const goodBot = isGoodBot(ua);

    // ── 5a) Otomasyon araçları: API'ye her zaman, saldırı modunda her yere ──
    if ((pathname.startsWith('/api/') || threatState.attackActive) && looksAutomated(ua)) {
        await penalize(clientIp, { reason: 'automated_ua', weight: 1 });
        return deny(403, 'Forbidden');
    }

    // ── 5b) DDoS Gate (Turnstile) — sayfa render/SSR ÇALIŞMADAN ÖNCE ───────
    // Saldırı modunda (Vercel "Attack Challenge Mode" karşılığı) ayrıca API'ler de
    // gate cookie'si olmayan istemcilere kapanır: tarayıcı sayfaya girerken cookie'yi
    // zaten almıştır, doğrudan API'yi kazıyan botlar almamıştır.
    const isPageGate = method === 'GET' && isGatablePage(pathname) && !goodBot;
    const isApiChallenge =
        threatState.attackActive &&
        pathname.startsWith('/api/') &&
        !CHALLENGE_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

    if (isPageGate || isApiChallenge) {
        try {
            const gate = await getGateSettings(request.nextUrl.origin);
            const gateShouldRun = (gate.enabled || threatState.attackActive) && gate.siteKey;
            if (gateShouldRun) {
                const cookieVal = request.cookies.get(GATE_COOKIE_NAME)?.value;
                const valid = cookieVal ? await verifyGateCookieValue(cookieVal, clientIp) : false;
                if (!valid) {
                    if (isPageGate) {
                        const url = new URL('/dogrulama', request.nextUrl.origin);
                        url.searchParams.set('next', pathname + (request.nextUrl.search || ''));
                        return NextResponse.redirect(url, 307);
                    }
                    return deny(403, 'Challenge required');
                }
            }
        } catch (err) {
            console.error('[middleware] DDoS gate hatası, katman atlanıyor:', err);
        }
    }

    // ── 6) Rate limitler: endpoint grubuna göre ────────────────────────────
    try {
        if (goodBot && !pathname.startsWith('/api/')) {
            // User-Agent sahtelenebilir → "iyi bot" muafiyeti sınırsız değildir.
            const result = await goodBotLimiter(request);
            if (!result.success) {
                await recordViolation(clientIp, 'bot_ua_flood', 1);
                return denyRateLimited(result.retryAfter);
            }
        }
        if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
            const result = await authFloodLimiter(request);
            if (!result.success) {
                await recordViolation(clientIp, 'auth_flood', 2);
                return denyRateLimited(result.retryAfter);
            }
        } else if (pathname.startsWith('/api/chapters') || pathname.startsWith('/api/series')) {
            const result = await catalogLimiter(request);
            if (!result.success) {
                await recordViolation(clientIp, 'catalog_scrape');
                return denyRateLimited(result.retryAfter);
            }
        } else if (pathname.startsWith('/admin-panel') || pathname.startsWith('/api/admin')) {
            const result = await adminLimiter(request);
            if (!result.success) {
                await recordViolation(clientIp, 'admin_flood', 2);
                return denyRateLimited(result.retryAfter);
            }
        } else if (pathname.startsWith('/api/img')) {
            // kendi route'unda limit var
        } else if (pathname.startsWith('/api/')) {
            const result = await globalApiLimiter(request);
            if (!result.success) {
                await recordViolation(clientIp, 'global_api_flood');
                return denyRateLimited(result.retryAfter);
            }
        }
    } catch (err) {
        if (err?.message?.includes('UPSTASH_REDIS_REST_URL')) {
            console.error('[ratelimit] YAPILANDIRMA HATASI:', err.message);
            return deny(503, 'Service Unavailable');
        }
        console.error('[middleware] rate limiter hatası, katman atlanıyor:', err);
    }

    // ── x-pathname / CSP nonce ─────────────────────────────────────────────
    const nonce = generateNonce();
    const csp = buildCsp(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
    requestHeaders.delete(PROXY_HEADER); // gizli anahtar uygulama koduna hiç ulaşmasın
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);

    // ── CDN Cache header'ları ─────────────────────────────────────────────
    if (method === 'GET') {
        try {
            applyCacheHeaders(response, pathname);
        } catch (err) {
            console.error('[middleware] cache header hatası, katman atlanıyor:', err);
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|_vercel|favicon\\.ico|icon-192|icon-192-maskable|icon-512|icon-512-maskable|apple-touch-icon|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml).*)',
    ],
};
