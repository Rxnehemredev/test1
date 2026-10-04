// lib/ratelimit.js
//
// ══════════════════════════════════════════════════════════════════════════
// DAĞITIK RATE LIMIT — Upstash Redis (varsa) + in-memory fallback
//
// Önceki sürüm sadece bir modül-seviyesi `Map` kullanıyordu. Bu Vercel'in
// serverless/edge ortamında iki ciddi sorun yaratıyordu:
//  1) Her fonksiyon instance'ı (ve her cold start) kendi boş Map'iyle
//     başlıyor — aynı IP farklı instance'lara denk gelirse sayaç sıfırdan
//     başlıyor, yani "2 saniyede 50 sayfa açan bot" birden fazla instance'a
//     dağılırsa limiti hiç görmeyebiliyordu.
//  2) Bölgeler arası (multi-region) hiç paylaşılmıyordu.
//
// Çözüm: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN tanımlıysa
// (Vercel'in kendi Marketplace entegrasyonundan ücretsiz/düşük maliyetle
// eklenebilir), sayaç Redis'te INCR+PEXPIRE ile atomik ve TÜM instance'lar
// arasında paylaşılan tek bir yerde tutulur — gerçek "davranışsal" rate
// limit burada anlamlı hale gelir. Env değişkenleri yoksa (örn. yerel
// geliştirme) otomatik olarak eski in-memory davranışa düşer, hiçbir şey
// kırılmaz.
//
// NOT: checkRateLimit artık async — tüm çağıran route'lar `await` ile
// güncellendi.
// ══════════════════════════════════════════════════════════════════════════

import { getClientIp } from '@/lib/security/requestHelpers';
import { ipBucket } from '@/lib/security/ipUtil';

const rateLimitMap = new Map();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_ENABLED = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const IS_PROD = process.env.NODE_ENV === 'production';

// Madde 6 — Redis yapılandırılmamışsa production'da bellek-içi sayaç instance'lar
// arasında paylaşılmaz (serverless'ta her instance kendi sayacını tutar), yani
// gerçek limit N instance × limit kadar gevşer. Bu yüzden:
//  • Hassas uçlar (login/register/admin: createRateLimiter(..., { sensitive: true }))
//    Redis yokken/ulaşılamazken limitin 1/3'üne (en az 1) düşürülür — fail-closed'a yakın.
//  • Başlangıçta açık bir uyarı loglanır. UPSTASH_REDIS_REST_URL ve
//    UPSTASH_REDIS_REST_TOKEN production için ZORUNLUDUR (bkz. .env.example).
const SENSITIVE_FALLBACK_DIVISOR = 3;

if (!REDIS_ENABLED && typeof console !== 'undefined') {
  console.warn(
    '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN tanımlı değil — ' +
    'rate limit instance-local in-memory Map ile çalışıyor (serverless\'ta güvenilir değil). ' +
    (IS_PROD
      ? 'PRODUCTION: UPSTASH_REDIS_* ZORUNLU; hassas uçlara (login/admin) agresif limit uygulanıyor.'
      : 'Production\'da Upstash Redis ZORUNLUDUR.')
  );
}

// Aynı limit/windowMs değerlerine sahip farklı route'lar aynı bucket'ı
// paylaşmasın diye her createRateLimiter() çağrısına benzersiz bir id veriyoruz.
let limiterInstanceCounter = 0;

function getIp(request) {
  // IPv6'da /64 tek kullanıcıya verilir; ham adrese bağlı sayaç adres döndürerek aşılırdı.
  return ipBucket(getClientIp(request));
}

// Sahte IP'lerle bellek şişirmeyi önle (Vercel dışında süreç uzun yaşar).
const MEMORY_MAX_KEYS = Number(process.env.SHIELD_MEM_MAX_ENTRIES) || 100000;
function enforceMemoryCap(now) {
  if (rateLimitMap.size <= MEMORY_MAX_KEYS) return;
  for (const [k, e] of rateLimitMap) if (now > e.resetAt) rateLimitMap.delete(k);
  if (rateLimitMap.size <= MEMORY_MAX_KEYS) return;
  let drop = Math.ceil(MEMORY_MAX_KEYS * 0.1);
  for (const k of rateLimitMap.keys()) {
    rateLimitMap.delete(k);
    if (--drop <= 0) break;
  }
}

async function checkRedis(key, limit, windowMs) {
  // Tek round-trip'te atomik INCR + (gerekirse) PEXPIRE + PTTL.
  // NX: PEXPIRE sadece key'in hiç TTL'i yoksa (yani bu pencerenin ilk isteğiyse) uygulanır —
  // aksi halde her istekte pencereyi sıfırdan başlatıp limiti asla tetiklemeyen bir bug olurdu.
  const pipeline = [
    ['INCR', key],
    ['PEXPIRE', key, String(windowMs), 'NX'],
    ['PTTL', key],
  ];

  // PERFORMANS: zaman aşımı yok idi → Upstash yavaşlayınca tüm istekler dakikalarca bekliyordu.
  // 700ms içinde cevap gelmezse hata fırlatılır ve createRateLimiter in-memory fallback'e düşer.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 700);
  let results;
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    results = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const count = Number(results?.[0]?.result);
  const pttl = Number(results?.[2]?.result);

  if (!Number.isFinite(count)) throw new Error('Upstash: beklenmeyen yanıt');

  if (count > limit) {
    const retryAfter = Number.isFinite(pttl) && pttl > 0 ? Math.ceil(pttl / 1000) : Math.ceil(windowMs / 1000);
    return { success: false, retryAfter };
  }
  return { success: true };
}

function checkMemory(key, limit, windowMs) {
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    enforceMemoryCap(now);
    return { success: true };
  }

  const entry = rateLimitMap.get(key);

  if (now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count += 1;
  return { success: true };
}

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} success     true = istek izinli; false = limit aşıldı.
 * @property {number} [retryAfter] Yalnızca `success === false` iken: kaç saniye sonra tekrar denenebileceği.
 */

/**
 * @typedef {Object} RateLimiterOptions
 * @property {boolean} [sensitive] true ise Redis yokken/ulaşılamazken PRODUCTION'da limit 1/3'e (en az 1) düşer.
 */

/**
 * Rate limiter factory.
 *
 * ⚠️ DÖNEN FONKSİYON **ASENKRON**DUR (her zaman `Promise<RateLimitResult>` döner): Redis varken
 * ağ isteği yapar, yokken bile `async` olduğu için Promise döner. Bu yüzden HER çağrı `await`
 * ile yapılmalıdır:
 *
 *   const limiter = createRateLimiter(10, 60_000);
 *   const rl = await limiter(request);            // ✅
 *   const rl = limiter(request);                  // ❌ rl bir Promise; `rl.success` HER ZAMAN undefined
 *                                                 //    (→ `!rl.success` hep true: tüm istekler 429 alır)
 *
 * `npm run check:ratelimit` bu hatayı (await'siz çağrı) tarar.
 *
 * Aynı bucket'ı paylaşmamak için her createRateLimiter() çağrısı benzersiz bir id alır;
 * sayaç anahtarı `rl:<id>:<limit>:<windowMs>:<ip>`'dir (IP: getClientIp).
 *
 * @param {number} limit    Pencere başına izin verilen maksimum istek sayısı.
 * @param {number} windowMs Pencere uzunluğu (milisaniye).
 * @param {RateLimiterOptions} [options]
 * @returns {(request: Request | { headers: Headers }) => Promise<RateLimitResult>}
 *   Route handler'da `await` ile kullanılacak async checkRateLimit fonksiyonu.
 */
export function createRateLimiter(limit, windowMs, options = {}) {
  const instanceId = limiterInstanceCounter++;

  return async function checkRateLimit(request) {
    const ip = getIp(request);
    const key = `rl:${instanceId}:${limit}:${windowMs}:${ip}`;

    // Paylaşımlı (Redis) sayaç yoksa hassas uçlarda production'da limiti sıkılaştır.
    const strictLimit = options.sensitive && IS_PROD
      ? Math.max(1, Math.ceil(limit / SENSITIVE_FALLBACK_DIVISOR))
      : limit;

    if (REDIS_ENABLED) {
      try {
        return await checkRedis(key, limit, windowMs);
      } catch (err) {
        console.error('[ratelimit] Upstash erişilemedi, in-memory fallback kullanılıyor:', err?.message || err);
        return checkMemory(key, strictLimit, windowMs);
      }
    }

    return checkMemory(key, strictLimit, windowMs);
  };
}

// Belirli aralıklarla eski in-memory kayıtları temizle (memory leak önlemi).
if (typeof setInterval !== 'undefined') {
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60 * 1000); // Her dakika temizle
  // Zamanlayıcı süreci ayakta tutmasın (testler / graceful shutdown).
  if (sweepTimer && typeof sweepTimer.unref === 'function') sweepTimer.unref();
}
