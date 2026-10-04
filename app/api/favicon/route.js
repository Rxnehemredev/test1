import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { safeFetch } from '@/lib/security/ssrfGuard';
const routeLimiter = createRateLimiter(60, 60000);


export const dynamic = 'force-dynamic';

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'favicon_url'").get();
        const faviconUrl = row?.setting_value?.trim();

        if (!faviconUrl) {
            // Varsayılan favicon
            return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
        }

        // Yerel (göreli) yol → proxy'lemeden doğrudan yönlendir (kendi sitemize sunucu-tarafı istek yok).
        if (!faviconUrl.startsWith('http://') && !faviconUrl.startsWith('https://')) {
            const localPath = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`;
            // "//evil.com" gibi protokol-göreli değerlerle açık yönlendirme olmasın.
            if (localPath.startsWith('//')) {
                return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
            }
            return NextResponse.redirect(new URL(localPath, request.url), { status: 302 });
        }
        const targetUrl = faviconUrl;

        // Harici URL → proxy olarak servis et. URL admin ayarından geldiği için ham fetch()
        // yerine safeFetch (SSRF: iç ağ/metadata IP'leri ve yönlendirme zincirleri engellenir).
        {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 5000);
                let response;
                try {
                    response = await safeFetch(targetUrl, { signal: controller.signal });
                } finally {
                    clearTimeout(timer);
                }
                if (!response.ok) {
                    return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
                }
                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength > 2 * 1024 * 1024) { // 2MB üst sınır
                    return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
                }
                const buffer = Buffer.from(arrayBuffer);

                // MIME type belirle
                const urlLower = targetUrl.toLowerCase();
                let contentType = 'image/png';
                if (urlLower.includes('.svg')) contentType = 'image/svg+xml';
                else if (urlLower.includes('.webp')) contentType = 'image/webp';
                else if (urlLower.includes('.ico')) contentType = 'image/x-icon';
                else if (urlLower.includes('.gif')) contentType = 'image/gif';
                else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) contentType = 'image/jpeg';

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=0, must-revalidate',
                    },
                });
            } catch {
                return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
            }
        }

    } catch (error) {
        console.error('Favicon API error:', error);
        return NextResponse.redirect(new URL('/icon-192.png', request.url), { status: 302 });
    }
}
