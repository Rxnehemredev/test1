import { NextResponse } from 'next/server';
import { verifyImageToken } from '@/lib/imageProxyToken';
import { createRateLimiter } from '@/lib/ratelimit';
import { safeFetch } from '@/lib/security/ssrfGuard';

const imgLimiter = createRateLimiter(400, 60 * 1000);

export const runtime = 'nodejs';

export async function GET(request) {
    const rl = await imgLimiter(request);
    if (!rl.success) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    const { searchParams } = new URL(request.url);
    const result = verifyImageToken({
        u: searchParams.get('u'),
        e: searchParams.get('e'),
        s: searchParams.get('s'),
    });

    if (!result.valid) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const referer = request.headers.get('referer') || '';
    const host = request.headers.get('host') || '';
    if (referer && host && !referer.includes(host)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        // GÜVENLİK (SSRF): URL imzalı ve host allowlist'li olsa da kaynak (scraper/admin verisi)
        // harici. Ham fetch() yönlendirmeleri doğrulamadan izlerdi (allowlist'teki host'tan iç ağa
        // 30x) → safeFetch her adımda DNS çözümünü + özel/iç IP kontrolünü yeniden yapar.
        const upstream = await safeFetch(result.url, {
            headers: { 'User-Agent': 'AerotoonImageProxy/1.0' },
        });

        if (!upstream.ok || !upstream.body) {
            return new NextResponse('Not Found', { status: 404 });
        }

        // GÜVENLİK: upstream'den gelen Content-Type yalnızca image/* ise (svg hariç) geçirilir —
        // aksi halde text/html gibi bir yanıt bizim origin'imizden inline servis edilip XSS olurdu.
        const upstreamType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const contentType = /^image\/(jpeg|png|gif|webp|avif)$/.test(upstreamType) ? upstreamType : 'application/octet-stream';
        const contentLength = upstream.headers.get('content-length');

        const headers = {
            'Content-Type': contentType,
            // ── BANDWIDTH FİXİ ──────────────────────────────────────────────────
            // Önceki sürümde 'private' vardı → Cloudflare cache'e almıyordu.
            // Artık 'public' + uzun s-maxage → Cloudflare bu görseli edge'de
            // saklıyor. Aynı görsele gelen 2. istek artık imgbb'ye (veya
            // Vercel'e) HİÇ ulaşmıyor — Cloudflare'den dönüyor.
            //
            // Token URL'deki 'e' (expiry timestamp) değişince Cloudflare farklı
            // bir kaynak olarak görüyor ve yeniden fetch ediyor. Bu nedenle
            // imageProxyToken.js'deki TTL'i de 30 güne çıkardık — URL sabit
            // kalırsa Cloudflare cache hit oranı %90+ oluyor.
            'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400, immutable',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'Content-Disposition': contentType === 'application/octet-stream' ? 'attachment' : 'inline',
        };

        if (contentLength) {
            headers['Content-Length'] = contentLength;
        }

        return new NextResponse(upstream.body, { status: 200, headers });
    } catch {
        return new NextResponse('Bad Gateway', { status: 502 });
    }
}
