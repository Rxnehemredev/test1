import { NextResponse } from 'next/server';
import { verifyImageToken } from '@/lib/imageProxyToken';
import { createRateLimiter } from '@/lib/ratelimit';
import { safeFetch } from '@/lib/security/ssrfGuard';
import { getClientIp } from '@/lib/security/requestHelpers';

const imgLimiter = createRateLimiter(400, 60 * 1000);

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_CONCURRENT_PER_IP = 12;        // IP başına aynı anda açık tutulabilecek maksimum indirme
const MAX_CONCURRENT_GLOBAL = 60;        // Sunucu örneği başına toplam eşzamanlı indirme tavanı

let activeGlobalRequests = 0;
const activeIpRequests = new Map();

function acquireSlot(ip) {
    if (activeGlobalRequests >= MAX_CONCURRENT_GLOBAL) {
        return false;
    }
    const currentIpActive = activeIpRequests.get(ip) || 0;
    if (currentIpActive >= MAX_CONCURRENT_PER_IP) {
        return false;
    }
    activeGlobalRequests++;
    activeIpRequests.set(ip, currentIpActive + 1);
    return true;
}

function releaseSlot(ip) {
    activeGlobalRequests = Math.max(0, activeGlobalRequests - 1);
    const current = activeIpRequests.get(ip) || 0;
    if (current <= 1) {
        activeIpRequests.delete(ip);
    } else {
        activeIpRequests.set(ip, current - 1);
    }
}

export async function GET(request) {
    const rl = await imgLimiter(request);
    if (!rl.success) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    const clientIp = getClientIp(request);

    // Eşzamanlı büyük resim istekleriyle kaynak tüketimini (CPU/bellek/bant genişliği) sınırla
    if (!acquireSlot(clientIp)) {
        return new NextResponse('Too Many Concurrent Requests', {
            status: 429,
            headers: { 'Retry-After': '1' },
        });
    }

    let slotReleased = false;
    const releaseOnce = () => {
        if (!slotReleased) {
            slotReleased = true;
            releaseSlot(clientIp);
        }
    };

    const { searchParams } = new URL(request.url);
    const result = verifyImageToken({
        u: searchParams.get('u'),
        e: searchParams.get('e'),
        s: searchParams.get('s'),
    });

    if (!result.valid) {
        releaseOnce();
        return new NextResponse('Forbidden', { status: 403 });
    }

    const referer = request.headers.get('referer') || '';
    const host = request.headers.get('host') || '';
    if (referer && host && !referer.includes(host)) {
        releaseOnce();
        return new NextResponse('Forbidden', { status: 403 });
    }

    // İstemci bağlantıyı kapatır veya iptal ederse slotu derhal serbest bırak
    if (request.signal) {
        request.signal.addEventListener('abort', releaseOnce, { once: true });
    }

    try {
        // GÜVENLİK (SSRF): URL imzalı ve host allowlist'li olsa da kaynak (scraper/admin verisi)
        // harici. safeFetch her adımda DNS çözümünü + özel/iç IP kontrolünü yeniden yapar.
        const upstream = await safeFetch(result.url, {
            headers: { 'User-Agent': 'AerotoonImageProxy/1.0' },
        });

        if (!upstream.ok || !upstream.body) {
            releaseOnce();
            return new NextResponse('Not Found', { status: 404 });
        }

        // Boyut kontrolü (Content-Length başlığında varsa hemen reddet)
        const contentLengthHeader = upstream.headers.get('content-length');
        if (contentLengthHeader) {
            const parsedLength = parseInt(contentLengthHeader, 10);
            if (Number.isFinite(parsedLength) && parsedLength > MAX_IMAGE_SIZE) {
                releaseOnce();
                return new NextResponse('Payload Too Large', { status: 413 });
            }
        }

        // GÜVENLİK: upstream'den gelen Content-Type yalnızca image/* ise (svg hariç) geçirilir
        const upstreamType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const contentType = /^image\/(jpeg|png|gif|webp|avif)$/.test(upstreamType) ? upstreamType : 'application/octet-stream';

        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400, immutable',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'Content-Disposition': contentType === 'application/octet-stream' ? 'attachment' : 'inline',
        };

        if (contentLengthHeader) {
            headers['Content-Length'] = contentLengthHeader;
        }

        // Chunked veya eksik Content-Length yanıtlarında bellek şişmesini önleyen sayaçlı stream
        let bytesStreamed = 0;
        const sizeLimiter = new TransformStream({
            transform(chunk, controller) {
                bytesStreamed += chunk.length;
                if (bytesStreamed > MAX_IMAGE_SIZE) {
                    releaseOnce(); // Sayaç sızıntısını önle (controller.error sonrası flush/cancel çalışmaz)
                    controller.error(new Error('Payload Too Large: exceeded 15MB'));
                } else {
                    controller.enqueue(chunk);
                }
            },
            flush() {
                releaseOnce();
            },
            cancel() {
                releaseOnce();
            }
        });

        const limitedStream = upstream.body.pipeThrough(sizeLimiter);
        return new NextResponse(limitedStream, { status: 200, headers });
    } catch {
        releaseOnce();
        return new NextResponse('Bad Gateway', { status: 502 });
    }
}
