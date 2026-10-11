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
// "fallback-key") kaldırıldı.
// ══════════════════════════════════════════════════════════════════════════
export function requiredJwtSecret() {
    const secret = realEnv('JWT_SECRET');
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required but not set. Vercel → Settings → Environment Variables kısmına ekleyip Redeploy yap.');
    }
    if (secret.length < 32) {
        throw new Error('JWT_SECRET en az 32 karakter olmalıdır.');
    }
    return secret;
}

// ══════════════════════════════════════════════════════════════════════════
// ENCRYPTION_KEY — kayıtlı üçüncü parti API anahtarlarını (Torii, Google Indexing vb.)
// şifrelemek için AYRI bir anahtar.
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
// IMAGE_PROXY_SECRET — /api/img imzalı linklerinin HMAC anahtarı.
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

// ══════════════════════════════════════════════════════════════════════════
// UPSTASH REDIS — Dağıtık rate limit ve Threat Shield için.
// Production ortamında in-memory fallback'e sessizce düşülmesini engeller.
// ══════════════════════════════════════════════════════════════════════════
export function requiredRedisConfig() {
    const url = realEnv('UPSTASH_REDIS_REST_URL').trim();
    const token = realEnv('UPSTASH_REDIS_REST_TOKEN').trim();

    const isProd = process.env.NODE_ENV === 'production';
    const isEnforce = process.env.ENFORCE_ALL_SECRETS === 'true';
    const allowMemoryFallback = process.env.ALLOW_IN_MEMORY_RATE_LIMIT === 'true' || process.env.ALLOW_IN_MEMORY_RATE_LIMIT === '1';

    if (isProd || isEnforce) {
        if (!allowMemoryFallback && (!url || !token)) {
            throw new Error(
                'Production ortamında rate limiting, Threat Shield ve IP ban için UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN zorunludur. ' +
                'Sistem sessizce in-memory moda düşemez (sunucusuz/küme mimarisinde rate limit aşılabilir). ' +
                'Lütfen Upstash Redis değişkenlerini tanımlayın (geliştirme/offline test için: ALLOW_IN_MEMORY_RATE_LIMIT=1).'
            );
        }
    }
    return { url, token, enabled: Boolean(url && token) };
}

// ══════════════════════════════════════════════════════════════════════════
// CRON_SECRET — Zamanlanmış görevler (blog kuyruğu, scraper sync) için.
// ══════════════════════════════════════════════════════════════════════════
export function requiredCronSecret() {
    const secret = realEnv('CRON_SECRET') || realEnv('BLOG_CRON_SECRET') || realEnv('SCRAPER_CRON_SECRET');
    if (!secret) {
        throw new Error('CRON_SECRET environment variable is required for scheduled tasks. Üretmek için: openssl rand -hex 32');
    }
    if (secret.length < 16) {
        throw new Error('CRON_SECRET çok kısa (en az 16 karakter olmalı).');
    }
    return secret;
}

// ══════════════════════════════════════════════════════════════════════════
// TÜM PRODUCTION VE KRİTİK SIRLARIN DOĞRULANMASI (ENFORCE_ALL_SECRETS)
// Eksik veya zayıf bir sır varsa fail-closed davranarak hata fırlatır.
// ══════════════════════════════════════════════════════════════════════════
export function validateAllSecrets({ failClosed = true } = {}) {
    const errors = [];

    try { requiredJwtSecret(); } catch (e) { errors.push(e.message); }
    try { requiredEncryptionKey(); } catch (e) { errors.push(e.message); }
    try { requiredImageProxySecret(); } catch (e) { errors.push(e.message); }

    // Sırların birbirinden bağımsız olması
    const secrets = [
        realEnv('JWT_SECRET'),
        realEnv('ENCRYPTION_KEY'),
        realEnv('IMAGE_PROXY_SECRET'),
        realEnv('PROXY_SHARED_SECRET'),
    ].filter(Boolean);

    if (new Set(secrets).size !== secrets.length) {
        errors.push('Farklı güvenlik anahtarları (JWT_SECRET, ENCRYPTION_KEY, IMAGE_PROXY_SECRET, PROXY_SHARED_SECRET) aynı değeri kullanamaz. Her birine ayrı rastgele anahtar atayın.');
    }

    const adminPassword = realEnv('ADMIN_PASSWORD');
    if (!adminPassword || adminPassword.length < 10) {
        errors.push('ADMIN_PASSWORD en az 10 karakter olmalıdır.');
    }

    // Production kontrolleri
    const isProd = process.env.NODE_ENV === 'production';
    const isEnforce = process.env.ENFORCE_ALL_SECRETS === 'true';

    if (isProd || isEnforce) {
        try { requiredRedisConfig(); } catch (e) { errors.push(e.message); }

        const dbUrl = realEnv('TURSO_DATABASE_URL') || realEnv('DATABASE_PATH');
        if (!dbUrl) {
            errors.push('TURSO_DATABASE_URL veritabanı adresi tanımlı değil.');
        }

        const cronSecret = realEnv('CRON_SECRET') || realEnv('BLOG_CRON_SECRET');
        if (!cronSecret) {
            errors.push('CRON_SECRET tanımlı değil; zamanlanmış cron işleri yetkilendirilemez.');
        }

        if (process.env.SELF_HOSTED === '1') {
            const proxySecret = realEnv('PROXY_SHARED_SECRET');
            if (!proxySecret || proxySecret.length < 32) {
                errors.push('SELF_HOSTED=1 iken PROXY_SHARED_SECRET en az 32 karakter olmalıdır.');
            }
        }
    }

    if (errors.length > 0) {
        const errorSummary = `[envGuard] Yapılandırma doğrulama başarısız (Fail-Closed):\n- ${errors.join('\n- ')}`;
        console.error(errorSummary);
        if (failClosed) {
            throw new Error(errorSummary);
        }
        return { valid: false, errors };
    }

    return { valid: true, errors: [] };
}

// ENFORCE_ALL_SECRETS=true bayrağı aktifse modül seviyesinde fail-closed çalıştır
if (process.env.ENFORCE_ALL_SECRETS === 'true') {
    validateAllSecrets({ failClosed: true });
}

/**
 * Giriş/kayıt gibi route'larda beklenmedik bir hata olduğunda, hatanın AYAR/VERİTABANI
 * kaynaklı olup olmadığını sınıflandırır.
 */
export function describeConfigError(error) {
    const m = String(error?.message || error || '');
    let kind = null;
    if (/JWT_SECRET|ENCRYPTION_KEY|IMAGE_PROXY_SECRET|CRON_SECRET/.test(m)) kind = 'config:secret';
    else if (/UPSTASH_REDIS/.test(m)) kind = 'config:redis';
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
