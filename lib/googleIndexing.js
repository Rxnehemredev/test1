import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { encryptData, decryptData } from '@/lib/security/encryption';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

/**
 * Retrieves the Google Indexing Service Account key from app_settings (encrypted with AES-256-GCM).
 * If a legacy file exists on disk, it is migrated to the database and removed from the filesystem.
 */
export async function getStoredGoogleKey() {
    const db = await getDb();
    const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'google_indexing_key'").get();
    if (row && row.setting_value) {
        try {
            const jsonStr = decryptData(row.setting_value);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('[Google Indexing] Anahtar çözme hatası:', e.message);
            throw new Error('Kayıtlı Google Indexing anahtarı çözülemedi');
        }
    }

    // Geriye dönük uyumluluk: diskte kalan eski dosya varsa şifreleyerek DB'ye taşı ve diski temizle
    const legacyPath = path.join(process.cwd(), 'google-indexing-key.json');
    if (fs.existsSync(legacyPath)) {
        try {
            const content = fs.readFileSync(legacyPath, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed.client_email && parsed.private_key) {
                const encrypted = encryptData(content);
                await db.prepare("INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES ('google_indexing_key', ?)").run(encrypted);
                try { fs.unlinkSync(legacyPath); } catch {}
                console.log('[Google Indexing] Eski google-indexing-key.json DB\'ye taşındı ve diskten silindi.');
                return parsed;
            }
        } catch (e) {
            console.error('[Google Indexing] Eski dosya taşıma hatası:', e.message);
        }
    }

    return null;
}

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
 * Generates Google OAuth2 Access Token using Service Account Key JSON (in-memory)
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
    let key;
    try {
        key = await getStoredGoogleKey();
    } catch (err) {
        return { success: false, error: err.message };
    }

    if (!key) {
        return { success: false, error: 'Google Indexing anahtarı bulunamadı. Lütfen önce anahtarı yükleyin.' };
    }

    if (!key.client_email || !key.private_key) {
        return { success: false, error: 'Anahtarda client_email veya private_key eksik.' };
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
