// lib/security/ddosGate.js
//
// ══════════════════════════════════════════════════════════════════════════
// DDOS GATE (Turnstile) — ayar cache'i + hangi sayfaların gate'e tabi
// olduğunu belirleyen mantık.
//
// Cookie imzalama/doğrulama lib/gateToken.js'te kalmaya devam ediyor (o
// dosya hem middleware hem de /api/ddos-gate route'u tarafından paylaşılıyor
// ve Edge+Node runtime uyumluluğu gerektiriyor — ayrı bir sorumluluk).
// Burada sadece "gate ayarları ne, hangi path'ler gate'e girer" mantığı var.
// ══════════════════════════════════════════════════════════════════════════

// /api/settings zaten kendi içinde 30sn'lik cache'e sahip (settings-cache.js);
// burada AYRICA modül-seviyesinde bir cache tutuyoruz ki her sayfa isteğinde
// middleware'den network isteği atılmasın.
import { internalHeaders } from '@/lib/security/proxyGuard';

let gateSettingsCache = { enabled: false, siteKey: '', fetchedAt: 0 };
const GATE_SETTINGS_TTL = 30 * 1000;

/**
 * Turnstile gate ayarlarını (enabled/siteKey) 30sn cache'li olarak döner.
 * Ayarlara ulaşılamazsa eski değeri korur (siteyi kırmaz).
 * @param {string} origin
 */
export async function getGateSettings(origin) {
    const now = Date.now();
    if (now - gateSettingsCache.fetchedAt < GATE_SETTINGS_TTL) return gateSettingsCache;
    try {
        // PERFORMANS: middleware kendi /api/settings'ine istek atıyor — zaman aşımı olmazsa
        // bu istek takılınca her sayfa açılışı bekliyordu. 1.5sn sonra vazgeç, eski değeri koru.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        let res;
        try {
            // SELF_HOSTED: INTERNAL_ORIGIN (ör. http://127.0.0.1:3000) varsa istek dışarı çıkıp
            // nginx'e dönmez (hairpin yok) ve client'ın Host başlığı hiçbir zaman fetch hedefini
            // belirleyemez. Host zaten waf.js'te allowlist'ten geçmiştir; bu ikinci emniyet kemeridir.
            const base = (process.env.INTERNAL_ORIGIN || origin).replace(/\/+$/, '');
            res = await fetch(`${base}/api/settings`, {
                next: { revalidate: 30 },
                signal: controller.signal,
                headers: internalHeaders(),
            });
        } finally {
            clearTimeout(timer);
        }
        const data = await res.json();
        const s = data?.settings || {};
        gateSettingsCache = {
            enabled: s.ddos_gate_enabled === '1',
            siteKey: s.turnstile_site_key || '',
            fetchedAt: now,
        };
    } catch {
        gateSettingsCache = { ...gateSettingsCache, fetchedAt: now };
    }
    return gateSettingsCache;
}

/**
 * Gate kontrolüne tabi olacak yollar: sayfalar (HTML). API, statik dosyalar,
 * admin panel ve doğrulama sayfasının kendisi hariç.
 * @param {string} pathname
 */
export function isGatablePage(pathname) {
    if (pathname.startsWith('/api/')) return false;
    if (pathname.startsWith('/_next/')) return false;
    if (pathname.startsWith('/admin-panel')) return false;
    if (pathname === '/admin5') return false; // yönetici giriş sayfası
    if (pathname === '/dogrulama') return false;
    if (/\.[a-zA-Z0-9]+$/.test(pathname)) return false; // .css, .js, .png vb.
    return true;
}
