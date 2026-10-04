import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { getClientIp } from '@/lib/security/requestHelpers';

const welcomeLimiter = createRateLimiter(20, 60000);

// Bir IP adresini kalıcı olarak (site_traffic_log'un aksine süresiz) saklamak
// yerine geri döndürülemez bir hash'ini tutuyoruz — ham IP hiçbir yerde
// kaydedilmiyor, sadece "bu IP'yi daha önce gördük mü" sorusuna cevap veriyor.
function hashIp(ip) {
    return crypto.createHash('sha256').update(`welcome_v1_${ip}`).digest('hex');
}

// POST — bu isteği yapan IP siteye daha önce hiç girmemişse kaydeder ve
// { firstVisit: true } döner; daha önce görülmüşse { firstVisit: false } döner.
// Bir defaya mahsus "hoş geldin" ekranını tetiklemek için kullanılır.
export async function POST(request) {
    const rl = await welcomeLimiter(request);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    try {
        const ip = getClientIp(request);
        const ua = request.headers.get('user-agent') || '';

        // Botlar için gereksiz kayıt / hoş geldin ekranı tetiklenmesin
        if (/bot|crawler|spider|scraper|headless/i.test(ua)) {
            return NextResponse.json({ firstVisit: false });
        }
        if (ip === 'unknown') {
            return NextResponse.json({ firstVisit: false });
        }

        const db = await getDb();
        const ipHash = hashIp(ip);

        const existing = await db.prepare('SELECT ip_hash FROM known_visitors WHERE ip_hash = ?').get(ipHash);
        if (existing) {
            return NextResponse.json({ firstVisit: false });
        }

        try {
            await db.prepare('INSERT OR IGNORE INTO known_visitors (ip_hash) VALUES (?)').run(ipHash);
        } catch {
            // Yarış durumu (aynı IP aynı anda iki istek) — yine de ilk ziyaret say
        }

        return NextResponse.json({ firstVisit: true });
    } catch (err) {
        console.error('welcome-check POST error:', err);
        return NextResponse.json({ firstVisit: false });
    }
}
