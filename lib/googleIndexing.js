import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

/**
 * Base64url encoding helper
 */
function base64url(str, encoding = 'utf8') {
    return Buffer.from(str, encoding)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Generates Google OAuth2 Access Token using Service Account Key JSON
 */
async function getAccessToken(key) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        exp,
        iat
    };

    const signatureInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = base64url(sign.sign(key.private_key));

    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to obtain Google OAuth2 token: ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
}

/**
 * Publishes a URL notification to Google Indexing API.
 * Returns true on success, false on failure (non-throwing version for background use).
 * @param {string} url The page URL to index/update
 */
export async function notifyGoogleIndexing(url) {
    try {
        const result = await notifyGoogleIndexingWithDetail(url);
        return result.success;
    } catch (err) {
        console.error('[Google Indexing] Error occurred during Google Indexing notification:', err.message);
        return false;
    }
}

/**
 * Publishes a URL notification to Google Indexing API.
 * Returns { success, message, error } with full detail for admin UI.
 * @param {string} url The page URL to index/update
 */
export async function notifyGoogleIndexingWithDetail(url) {
    const keyPath = path.join(process.cwd(), 'google-indexing-key.json');
    if (!fs.existsSync(keyPath)) {
        return { success: false, error: 'google-indexing-key.json bulunamadı. Lütfen önce anahtarı yükleyin.' };
    }

    let key;
    try {
        key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch {
        return { success: false, error: 'google-indexing-key.json geçersiz JSON içeriyor.' };
    }

    if (!key.client_email || !key.private_key) {
        return { success: false, error: 'Anahtar dosyasında client_email veya private_key eksik.' };
    }

    let accessToken;
    try {
        console.log(`[Google Indexing] OAuth token alınıyor: ${key.client_email}`);
        accessToken = await getAccessToken(key);
    } catch (tokenErr) {
        const msg = tokenErr.message || String(tokenErr);
        console.error('[Google Indexing] OAuth token hatası:', msg);
        return { success: false, error: `OAuth token alınamadı: ${msg}` };
    }

    console.log(`[Google Indexing] URL bildirimi gönderiliyor: ${url}`);
    let res, resText;
    try {
        res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ url, type: 'URL_UPDATED' })
        });
        resText = await res.text();
    } catch (fetchErr) {
        return { success: false, error: `Indexing API'ye bağlanılamadı: ${fetchErr.message}` };
    }

    if (!res.ok) {
        console.error(`[Google Indexing] API hatası (${res.status}):`, resText);
        // Parse Google error message for clearer output
        let detail = resText;
        try {
            const parsed = JSON.parse(resText);
            detail = parsed?.error?.message || parsed?.error?.status || resText;
        } catch {}
        return { success: false, error: `Google Indexing API hatası (HTTP ${res.status}): ${detail}` };
    }

    console.log(`[Google Indexing] Başarılı: ${url}`);
    return { success: true, message: `URL başarıyla Google'a bildirildi: ${url}` };
}
