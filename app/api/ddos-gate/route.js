import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { createGateCookieValue, GATE_COOKIE_NAME, GATE_COOKIE_MAX_AGE_SEC } from '@/lib/gateToken';
import { getClientIp } from '@/lib/security/requestHelpers';

// IP başına dakikada 10 doğrulama denemesi — normal kullanıcı için yeterli,
// bot'ların bu endpoint'i flood etmesini engeller.
const limiter = createRateLimiter(10, 60 * 1000);

async function setGateCookie(response, ip) {
    const value = await createGateCookieValue(ip);
    response.cookies.set(GATE_COOKIE_NAME, value, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: GATE_COOKIE_MAX_AGE_SEC,
        secure: process.env.NODE_ENV === 'production',
    });
    return response;
}

export async function POST(request) {
    // Rate limit
    // limiter ASYNC: await edilmezse `rl` bir Promise olur, `rl.success` her zaman undefined
    // kalır ve (eski kodda) her istek yanlışlıkla 429 alırdı.
    const rl = await limiter(request);
    if (!rl.success) {
        return NextResponse.json(
            { ok: false, error: 'Çok fazla deneme. Lütfen bekle.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
        );
    }

    try {
        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ ok: false, error: 'Token eksik.' }, { status: 400 });
        }

        // Secret key'i DB'den çek (admin panelinden ayarlanmış)
        const db = await getDb();
        const secretRow = await db.prepare(
            "SELECT setting_value FROM app_settings WHERE setting_key = 'turnstile_secret_key'"
        ).get();
        const secret = secretRow?.setting_value?.trim();

        if (!secret) {
            // FAIL-CLOSED: Secret yokken doğrulama yapılamaz → gate cookie'si VERİLMEZ.
            // (Eskiden "siteyi kırma" diye cookie veriliyordu; bu, gate'i yapılandırma
            // hatasıyla herkes için sessizce devre dışı bırakıyordu.)
            console.error('[ddos-gate] turnstile_secret_key ayarlanmamış — gate cookie verilmiyor (503).');
            return NextResponse.json(
                { ok: false, error: 'Site koruması yapılandırılmamış' },
                { status: 503 }
            );
        }

        // Cloudflare Turnstile siteverify
        const ip = getClientIp(request);

        const formData = new FormData();
        formData.append('secret', secret);
        formData.append('response', token);
        if (ip) formData.append('remoteip', ip);

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const result = await verifyRes.json();

        if (result.success) {
            // Middleware'in okuyacağı imzalı cookie'yi set et. Bu, artık gerçek
            // koruma noktası: middleware her sayfa isteğinde bu cookie'yi
            // kontrol ediyor (bkz. middleware.js — isGatablePage).
            return setGateCookie(NextResponse.json({ ok: true }), ip);
        }

        // Başarısız — hata kodlarını logla ama kullanıcıya detay verme
        console.warn('[ddos-gate] Turnstile doğrulama başarısız:', result['error-codes']);
        return NextResponse.json(
            { ok: false, error: 'Doğrulama başarısız. Lütfen tekrar dene.' },
            { status: 403 }
        );
    } catch (err) {
        console.error('[ddos-gate] POST error:', err);
        return NextResponse.json(
            { ok: false, error: 'Sunucu hatası. Lütfen tekrar dene.' },
            { status: 500 }
        );
    }
}
