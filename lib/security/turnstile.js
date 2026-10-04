// lib/security/turnstile.js
//
// Login / admin login / register için ortak Cloudflare Turnstile doğrulaması.
// Önceden üç route'ta kopya halinde duruyordu ve üçü de "secret yoksa atla"
// diyordu → site key girilmiş (widget görünüyor) ama secret eksik/silinmişse
// botlar doğrulamayı tamamen atlayabiliyordu.
//
// Davranış (FAIL-CLOSED):
//  • Turnstile "açık" sayılır = turnstile_site_key ayarı dolu (widget gösteriliyor).
//    Açıkken secret yoksa, token yoksa, siteverify hata verirse/ulaşılamazsa
//    istek REDDEDİLİR.
//  • Site key de secret de boşsa Turnstile hiç kurulmamıştır → doğrulama yok
//    (ilk kurulumda kimse kendini dışarıda bırakmasın diye).
//  • DISABLE_TURNSTILE=1 SADECE NODE_ENV=development'ta etkilidir; production'da
//    yok sayılır (ve uyarı loglanır).

import { getDb } from '@/lib/db';
import { getClientIp } from '@/lib/security/requestHelpers';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

const FAILED = { ok: false, error: 'Human verification failed. Please try again.', status: 400 };
const REQUIRED = { ok: false, error: 'Human verification required', status: 400 };
const UNAVAILABLE = { ok: false, error: 'Human verification is temporarily unavailable. Please try again later.', status: 503 };

/**
 * @param {string | undefined} token  Client'tan gelen cf-turnstile-response
 * @param {Request} [request]         remoteip için (opsiyonel)
 * @returns {Promise<{ok: true} | {ok: false, error: string, status: number}>}
 */
export async function verifyTurnstile(token, request) {
    if (process.env.DISABLE_TURNSTILE === '1') {
        if (process.env.NODE_ENV === 'development') return { ok: true };
        console.warn('[turnstile] DISABLE_TURNSTILE production\'da yok sayılır.');
    }

    let secret = '';
    let siteKey = '';
    try {
        const db = await getDb();
        const rows = await db.prepare(
            "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('turnstile_secret_key', 'turnstile_site_key')"
        ).all();
        for (const r of rows || []) {
            const v = typeof r.setting_value === 'string' ? r.setting_value.trim() : '';
            if (r.setting_key === 'turnstile_secret_key') secret = v;
            if (r.setting_key === 'turnstile_site_key') siteKey = v;
        }
    } catch (err) {
        console.error('[turnstile] ayarlar okunamadı, istek reddediliyor:', err?.message || err);
        return UNAVAILABLE;
    }

    // Hiç kurulmamış → doğrulama yok.
    if (!secret && !siteKey) return { ok: true };

    // Site key var ama secret yok = yanlış yapılandırma → fail-closed.
    if (!secret) {
        console.error('[turnstile] turnstile_site_key ayarlı ama turnstile_secret_key yok — istek reddedildi.');
        return UNAVAILABLE;
    }

    if (!token || typeof token !== 'string') return REQUIRED;

    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (request) {
        const ip = getClientIp(request);
        if (ip !== '0.0.0.0') form.append('remoteip', ip);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    try {
        const res = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
            signal: controller.signal,
        });
        if (!res.ok) return UNAVAILABLE;
        const data = await res.json();
        return data?.success ? { ok: true } : FAILED;
    } catch (err) {
        console.error('[turnstile] siteverify hatası, istek reddediliyor:', err?.message || err);
        return UNAVAILABLE;
    } finally {
        clearTimeout(timer);
    }
}
