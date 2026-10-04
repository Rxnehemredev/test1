// lib/security/securityHeaders.js
// ─────────────────────────────────────────────────────────────────────────────
// Tarayıcı güvenlik başlıkları (clickjacking, MIME sniffing, HTTPS zorlama, izin kısıtlama).
// next.config.js içinde şöyle bağla (mevcut config'ini ezmemek için bu dosyayı ayrı tuttum):
//
//   import { securityHeaders } from './lib/security/securityHeaders.js';
//   const nextConfig = {
//     // ...mevcut ayarların...
//     async headers() {
//       return [{ source: '/:path*', headers: securityHeaders }];
//     },
//   };
//
// NOT: Content-Security-Policy bilerek eklenmedi — Turnstile, Firebase Analytics, imgbb ve GIPHY gibi
// harici kaynakları tek tek listelemeden eklenirse siteyi bozar. İstersen ayrıca hazırlarım.
// ─────────────────────────────────────────────────────────────────────────────
export const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
