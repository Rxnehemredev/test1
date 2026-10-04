import fs from 'fs';
import path from 'path';
import { getDb } from './db';
import crypto from 'crypto';
import { requiredEncryptionKey, requiredJwtSecret } from './envGuard.js';

const TORII_API_BASE = 'https://api.toriitranslate.com';
const TRANSLATIONS_DIR = './public/uploads/translations';

// ─── Encryption for API keys (AES-256-GCM) ─────────────────
// GÜVENLİK DÜZELTMESİ: Şifreleme anahtarı artık JWT_SECRET'tan TÜRETİLMİYOR; ayrı
// ve zorunlu ENCRYPTION_KEY (32 byte = 64 hex karakter, crypto.randomBytes ile üretilir)
// kullanılıyor. Eksik/geçersizse requiredEncryptionKey() ilk kullanımda hata fırlatır.
//
// GERİYE DÖNÜK UYUMLULUK / MIGRATION: Eski sürümde şifrelenmiş kayıtlar
// scrypt(JWT_SECRET, 'torii-salt') anahtarıyla şifreliydi. decryptApiKey önce yeni
// anahtarı dener, olmazsa (ve JWT_SECRET tanımlıysa) eski anahtarı dener;
// getActiveApiKey eski anahtarla çözülen bir kaydı ilk okunuşunda YENİ anahtarla
// yeniden şifreleyip DB'ye yazar (tembel/otomatik migration). Bkz. CHANGELOG.md →
// "ENCRYPTION_KEY migration notu".
const AUTH_TAG_BYTES = 16;
let _encryptionKey = null;
function getEncryptionKey() {
    if (!_encryptionKey) {
        _encryptionKey = Buffer.from(requiredEncryptionKey(), 'hex'); // 32 byte
    }
    return _encryptionKey;
}

let _legacyKey = undefined;
function getLegacyEncryptionKey() {
    if (_legacyKey === undefined) {
        try {
            _legacyKey = crypto.scryptSync(requiredJwtSecret(), 'torii-salt', 32);
        } catch {
            _legacyKey = null; // JWT_SECRET yok → eski kayıtlar çözülemez
        }
    }
    return _legacyKey;
}

export function encryptApiKey(plainKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv, { authTagLength: AUTH_TAG_BYTES });
    let encrypted = cipher.update(plainKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptWithKey(encryptedKey, key) {
    const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Şifreli değeri çözer ve hangi anahtarın kullanıldığını bildirir.
 * @returns {{ plain: string, usedLegacyKey: boolean }}
 */
export function decryptApiKeyWithMeta(encryptedKey) {
    try {
        return { plain: decryptWithKey(encryptedKey, getEncryptionKey()), usedLegacyKey: false };
    } catch (primaryErr) {
        // ENCRYPTION_KEY eksik/geçersizse bu hatayı yutma — kurulum hatası net görünsün.
        if (/ENCRYPTION_KEY/.test(String(primaryErr?.message))) throw primaryErr;
        const legacy = getLegacyEncryptionKey();
        if (!legacy) throw primaryErr;
        return { plain: decryptWithKey(encryptedKey, legacy), usedLegacyKey: true };
    }
}

export function decryptApiKey(encryptedKey) {
    return decryptApiKeyWithMeta(encryptedKey).plain;
}

// ─── Get the active Torii API key ────────────────────────────
export async function getActiveApiKey() {
    // First try DB stored key
    const db = await getDb();
    const row = await db.prepare(
        'SELECT id, encrypted_key FROM api_keys WHERE service = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1'
    ).get('torii');

    if (row) {
        try {
            const { plain, usedLegacyKey } = decryptApiKeyWithMeta(row.encrypted_key);
            if (usedLegacyKey && row.id != null) {
                // Tembel migration: eski (JWT_SECRET türevi) anahtarla şifreli kaydı yeni anahtarla yeniden yaz.
                try {
                    await db.prepare('UPDATE api_keys SET encrypted_key = ? WHERE id = ?').run(encryptApiKey(plain), row.id);
                    console.warn('[torii] Saklı API anahtarı ENCRYPTION_KEY ile yeniden şifrelendi (id=%s).', row.id);
                } catch (reErr) {
                    console.error('[torii] Yeniden şifreleme başarısız (eski anahtar geçerli kalıyor):', reErr.message);
                }
            }
            return plain;
        } catch (e) {
            console.error('Failed to decrypt stored API key:', e.message);
        }
    }

    // Fallback to env variable
    return process.env.TORII_API_KEY || null;
}

// ─── Save API key to DB (encrypted) ─────────────────────────
export async function saveApiKey(keyName, plainKey, service = 'torii') {
    const db = await getDb();
    const encrypted = encryptApiKey(plainKey);

    // Deactivate old keys for this service
    await db.prepare('UPDATE api_keys SET is_active = 0 WHERE service = ?').run(service);

    // Insert new key
    await db.prepare(
        'INSERT INTO api_keys (key_name, encrypted_key, service, is_active) VALUES (?, ?, ?, 1)'
    ).run(keyName, encrypted, service);

    return true;
}

// ─── Languages supported ────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
    // European
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'sr', name: 'Srpski', flag: '🇷🇸' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    // Middle East / Africa
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
    // Asia
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文(简)', flag: '🇨🇳' },
    { code: 'zt', name: '中文(繁)', flag: '🇹🇼' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
];

/**
 * `relativePath`'i public/ altında çözümler; sonuç public/ dışına çıkıyorsa hata fırlatır.
 * Ayırıcı ekli karşılaştırma (`public + path.sep`) sayesinde `public-evil/` gibi ön ek
 * eşleşmeleri de reddedilir. Null byte içeren değerler reddedilir.
 */
export function resolveInsidePublic(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\0')) {
        throw new Error('Invalid image path');
    }
    const publicRoot = path.join(process.cwd(), 'public');
    // Baştaki "/" (ör. "/uploads/x.png") public'e göreli sayılır, dosya sistemi köküne değil.
    const resolved = path.resolve(publicRoot, relativePath.replace(/^[/\\]+/, ''));
    if (resolved !== publicRoot && !resolved.startsWith(publicRoot + path.sep)) {
        throw new Error('Invalid image path');
    }
    return resolved;
}

// ─── Translate a single manga page ──────────────────────────
export async function translatePage(pageId, targetLang) {
    const db = await getDb();

    // 1. Check cache first
    const cached = await db.prepare(
        'SELECT translated_image_path FROM translations WHERE page_id = ? AND language_code = ?'
    ).get(pageId, targetLang);

    if (cached) {
        return { cached: true, path: cached.translated_image_path };
    }

    // 2. Get original page
    const page = await db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);
    if (!page) {
        throw new Error('Page not found');
    }

    // 3. Get API key
    const apiKey = await getActiveApiKey();
    if (!apiKey) {
        throw new Error('No Torii API key configured. Please add your API key in Admin Settings.');
    }

    // 4. Read the original image
    // GÜVENLİK (path traversal): page.image_path DB'den gelir; `../../etc/passwd` gibi bir
    // değer public/ dışına çıkıp rastgele dosya okutabilirdi. path.resolve ile mutlak
    // yola çevirip sonucun public/ DİZİNİNİN İÇİNDE olduğunu doğruluyoruz.
    const imagePath = resolveInsidePublic(page.image_path);
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Original image not found: ${page.image_path}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath);
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    // 5. Call Torii Translate API v2
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), `page${ext}`);
    formData.append('target_lang', targetLang);
    formData.append('translator', 'gemini-2.5-flash');
    formData.append('font', 'wildwords');
    formData.append('text_align', 'auto');
    formData.append('stroke_disabled', 'false');
    formData.append('min_font_size', '12');

    const response = await fetch(`${TORII_API_BASE}/api/v2/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
    });

    // Parse JSON body first (API returns success/error in body, not headers)
    let result;
    try {
        result = await response.json();
    } catch (e) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Torii API error: ${errorText}`);
    }

    if (!response.ok || result.error || result.success === false) {
        throw new Error(`Torii API error: ${result.error || result.message || `HTTP ${response.status}`}`);
    }

    // 6. Save translated image 
    const translationsDir = path.join(process.cwd(), TRANSLATIONS_DIR, targetLang);
    if (!fs.existsSync(translationsDir)) {
        fs.mkdirSync(translationsDir, { recursive: true });
    }

    const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
    const outputFileName = `page_${pageId}_${targetLang}${ext}`;
    const outputPath = path.join(translationsDir, outputFileName);
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

    const publicPath = `/uploads/translations/${targetLang}/${outputFileName}`;

    // 7. Cache in database
    await db.prepare(
        'INSERT OR REPLACE INTO translations (page_id, language_code, translated_image_path) VALUES (?, ?, ?)'
    ).run(pageId, targetLang, publicPath);

    return { cached: false, path: publicPath };
}

// ─── Translate all pages of a chapter ────────────────────────
export async function translateChapter(chapterId, targetLang) {
    const db = await getDb();
    const pages = await db.prepare(
        'SELECT * FROM pages WHERE chapter_id = ? ORDER BY page_number'
    ).all(chapterId);

    const results = [];
    for (const page of pages) {
        try {
            const result = await translatePage(page.id, targetLang);
            results.push({ pageId: page.id, pageNumber: page.page_number, ...result });
        } catch (error) {
            results.push({ pageId: page.id, pageNumber: page.page_number, error: error.message });
        }
    }

    return results;
}
