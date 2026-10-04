// lib/security/rateLimiters.js
//
// ══════════════════════════════════════════════════════════════════════════
// ROUTE BAZLI RATE LIMITER'LAR — her biri lib/ratelimit.js'teki temel
// createRateLimiter() üzerine kurulu, sadece limit/pencere değerleri burada
// tanımlı. Bir limiti değiştirmek (örn. adminLimiter'ı 300'den 500'e
// çıkarmak) middleware.js'in geri kalanına dokunmadan yapılabilir.
// ══════════════════════════════════════════════════════════════════════════

import { createRateLimiter } from '@/lib/ratelimit';

export const authFloodLimiter = createRateLimiter(10, 60 * 1000, { sensitive: true });   // 10 istek / 1 dk / IP
export const catalogLimiter   = createRateLimiter(30, 60 * 1000);   // 30 istek / 1 dk / IP
export const adminLimiter     = createRateLimiter(300, 60 * 1000, { sensitive: true });
export const globalApiLimiter = createRateLimiter(120, 60 * 1000);
// "İyi bot" (Googlebot vb.) User-Agent'ı kolayca sahtelenebilir; DDoS gate'ten muaf olan bu
// istekler için IP başına sıkı bir tavan (sahte-Googlebot ile toplu kazımayı keser).
export const goodBotLimiter  = createRateLimiter(60, 60 * 1000);
