// ══════════════════════════════════════════════════════════════════════════
// .env.example'daki ÖRNEK değerlerin gerçek değer sanılmasını engeller.
//
// Vercel, projeyi içe aktarırken .env.example'daki tüm değişkenleri hazır getirebiliyor
// (BURAYA_UZUN_RASTGELE_BIR_ANAHTAR_YAZ, SENIN_TURSO_TOKEN_DEGERIN gibi). Bu örnek
// değerler herkese açık olduğu için gerçek sır (JWT_SECRET, admin şifresi vb.) olarak
// KULLANILAMAZ — bilinen bir anahtarla oturum token'ı üretmek mümkün olurdu.
// ══════════════════════════════════════════════════════════════════════════

const PLACEHOLDER = /^(BURAYA_|SENIN_|SENIN-|EN_AZ_10_KARAKTERLIK|senin-eposta@ornek\.com|senin-proje-adin)/i;

export function isPlaceholder(value) {
    return typeof value === 'string' && PLACEHOLDER.test(value.trim());
}

/** Ortam değişkenini döndürür; boşsa ya da örnek değerse '' döner. */
export function realEnv(name) {
    const v = process.env[name];
    if (!v || !v.trim() || isPlaceholder(v)) return '';
    return v;
}

// ══════════════════════════════════════════════════════════════════════════
// GÜVENLİK DÜZELTMESİ: JWT_SECRET için sabit/herkese açık fallback ("fallback-secret",
// "fallback-key") kaldırıldı. Önceden birkaç dosya (app/layout.js, maintenance-status
// route'u, lib/torii.js) JWT_SECRET tanımsızsa bu sabit string'e sessizce düşüyordu.
// lib/auth.js zaten secret eksikse hata fırlatıyordu — ama bu üç dosya o kuralı
// bypass ediyordu. Bilinen bir secret ile kimliği doğrulanmış "admin" rolünde
// bir JWT üretmek mümkün olurdu. Artık TEK merkezi fonksiyon var; secret yoksa
// açıkça hata fırlatılıyor, "güvensiz ama çalışan" tercih edilmiyor.
export function requiredJwtSecret() {
    const secret = realEnv('JWT_SECRET');
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required but not set. Vercel → Settings → Environment Variables kısmına ekleyip Redeploy yap.');
    }
    return secret;
}

// ══════════════════════════════════════════════════════════════════════════
// ENCRYPTION_KEY — kayıtlı üçüncü parti API anahtarlarını (Torii vb.) şifrelemek
// için AYRI bir anahtar. Önceden şifreleme anahtarı JWT_SECRET'tan türetiliyordu;
// JWT_SECRET sızarsa/rotasyona girerse hem oturumlar hem depolanan API anahtarları
// birlikte etkileniyordu. Artık iki sır birbirinden bağımsız.
//
// Format: 32 byte'ın hex gösterimi = 64 hex karakter. Üretmek için:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// JWT_SECRET ile aynı fail-fast mantığı: eksik/geçersizse ilk kullanımda hata fırlatır
// (modül yüklenirken değil → `next build` env olmadan da çalışır).
// Edge uyumluluğu için bu dosya Node 'crypto' import etmez; Buffer'a çevirme
// çağıran tarafta (lib/torii.js) yapılır.
// ══════════════════════════════════════════════════════════════════════════
const ENCRYPTION_KEY_HEX = /^[0-9a-fA-F]{64}$/;

/** @returns {string} 64 karakterlik hex string (32 byte). Eksik/geçersizse Error fırlatır. */
export function requiredEncryptionKey() {
    const key = realEnv('ENCRYPTION_KEY').trim();
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required but not set. Üretmek için: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" — çıkan değeri Vercel → Settings → Environment Variables kısmına ekleyip Redeploy yap.');
    }
    if (!ENCRYPTION_KEY_HEX.test(key)) {
        throw new Error('ENCRYPTION_KEY geçersiz: tam olarak 32 byte\'ın hex gösterimi (64 hex karakter) olmalı.');
    }
    return key;
}

// ══════════════════════════════════════════════════════════════════════════
// IMAGE_PROXY_SECRET — /api/img imzalı linklerinin HMAC anahtarı. Artık JWT_SECRET'a
// geri düşülmüyor: iki sırrın ayrı olması, görsel linki imzasından oturum
// anahtarına (veya tersine) bir sızıntı yolu bırakmaz.
// ══════════════════════════════════════════════════════════════════════════
const IMAGE_PROXY_SECRET_MIN_LENGTH = 32;

/** @returns {string} Eksik/kısa ise Error fırlatır. */
export function requiredImageProxySecret() {
    const secret = realEnv('IMAGE_PROXY_SECRET');
    if (!secret) {
        throw new Error('IMAGE_PROXY_SECRET environment variable is required but not set. Üretmek için: openssl rand -hex 32 — Vercel → Settings → Environment Variables kısmına ekleyip Redeploy yap.');
    }
    if (secret.length < IMAGE_PROXY_SECRET_MIN_LENGTH) {
        throw new Error(`IMAGE_PROXY_SECRET çok kısa (en az ${IMAGE_PROXY_SECRET_MIN_LENGTH} karakter olmalı).`);
    }
    if (secret === process.env.JWT_SECRET) {
        console.warn('[envGuard] IMAGE_PROXY_SECRET, JWT_SECRET ile aynı. Ayrı bir değer kullan (openssl rand -hex 32).');
    }
    return secret;
}

/**
 * Giriş/kayıt gibi route'larda beklenmedik bir hata olduğunda, hatanın AYAR/VERİTABANI
 * kaynaklı olup olmadığını sınıflandırır.
 *
 * GÜVENLİK: Gerçek hata metni (env değişken adları, veritabanı host'u, SQL/driver
 * mesajları, dosya yolları) ASLA istemciye döndürülmez. Tam ayrıntı yalnızca
 * `console.error`'a (sunucu log'una) yazılır. Eski `DEBUG_ERRORS=1` teşhis modu
 * tamamen kaldırıldı — log'lar artık tek teşhis kanalı.
 *
 * @param {unknown} error
 * @returns {string | null} Ayar/veritabanı kaynaklıysa GENERİC bir mesaj, değilse null
 *   (route kendi genel mesajını kullanır).
 */
export function describeConfigError(error) {
    const m = String(error?.message || error || '');
    let kind = null;
    if (/JWT_SECRET|ENCRYPTION_KEY|IMAGE_PROXY_SECRET/.test(m)) kind = 'config:secret';
    else if (/TURSO_/.test(m)) kind = 'config:database';
    else if (/R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME|R2_PUBLIC_URL/.test(m)) kind = 'config:storage';
    else if (/libsql|sqlite|hrana|turso|ENOTFOUND|ECONNREFUSED|fetch failed|Unauthorized|SERVER_ERROR|URL_INVALID|no such (table|column)/i.test(m)) kind = 'database';

    if (kind) {
        console.error(`[describeConfigError] ${kind}:`, error);
        return 'Sunucu yapılandırma hatası. Lütfen daha sonra tekrar deneyin; sorun sürerse site yöneticisine bildirin.';
    }
    console.error('[describeConfigError] unclassified:', error);
    return null;
}
