// lib/og-image-fetch.js
//
// next/og (Satori) resolves <img src="..."> internally, and it fails SILENTLY
// on a lot of real-world image URLs: sites with hotlink/referrer protection,
// slow CDNs, redirects it doesn't follow well, or content-types it doesn't
// recognize. When that happens the cover just doesn't render in the OG image
// (WhatsApp/Discord/Twitter/Telegram embed previews) — no error, no fallback.
//
// This helper fetches the image ourselves with a real browser User-Agent and a
// hard timeout, checks it's actually an image, and returns it as a base64
// data URI so Satori never needs to do its own network fetch.

import { safeFetch } from './security/ssrfGuard.js';

const FETCH_TIMEOUT_MS = 4500;

export async function fetchImageAsDataUri(url) {
    if (!url || typeof url !== 'string') return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        // Kapak URL'i admin/scraper kaynaklı → ham fetch() yerine safeFetch (SSRF koruması).
        // Reddedilen/iç ağ URL'leri exception fırlatır → aşağıdaki catch null döner (caller fallback'e düşer).
        const res = await safeFetch(url, {
            signal: controller.signal,
            headers: {
                // Birçok manga/scan CDN'i tarayıcı gibi görünmeyen isteklerde
                // hotlink koruması uyguluyor (403 / boş yanıt). Gerçek bir
                // tarayıcı User-Agent + Referer göndermek bunu büyük ölçüde aşar.
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': new URL(url).origin + '/',
            },
        }).finally(() => clearTimeout(timeout));

        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) return null;

        // Satori (next/og) does not support SVG or animated formats reliably —
        // treat those as unusable and let the caller fall back gracefully.
        if (contentType.includes('svg')) return null;

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) return null; // sanity cap: 8MB

        const mime = contentType.split(';')[0].trim();
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
        // Timeout, network error, invalid URL, etc. — caller should fall back.
        return null;
    }
}
