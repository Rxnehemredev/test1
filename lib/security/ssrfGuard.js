// lib/security/ssrfGuard.js
// ─────────────────────────────────────────────────────────────────────────────
// SSRF KORUMASI — sunucunun kullanıcı/admin'in verdiği URL'lere istek atması gereken
// yerlerde (scraper, kapak indirme) kullanılır.
//
// Engellenen: http/https dışı protokoller, URL içinde kullanıcı:şifre, localhost,
// özel/iç ağ IP'leri (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x → bulut
// metadata servisi dahil, 100.64/10 CGNAT, ::1, fc00::/7, fe80::/10, IPv4-mapped IPv6)
// ve bunlara çözülen alan adları (DNS rebinding'e karşı her yönlendirme adımında yeniden
// çözülür). Yönlendirmeler (redirect) elle, en fazla 5 adım ve her adımda doğrulanarak izlenir.
// ─────────────────────────────────────────────────────────────────────────────
import 'server-only';
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 5;
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal', 'metadata']);

function isPrivateIPv4(ip) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true; // bozuk → engelle
    const [a, b] = p;
    return (
        a === 0 || a === 10 || a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||      // CGNAT
        (a === 169 && b === 254) ||                // link-local + bulut metadata
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0) ||                  // 192.0.0.0/24, TEST-NET
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||   // benchmark
        a >= 224                                   // multicast + rezerve
    );
}

function isPrivateIPv6(ip) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isPrivateIPv4(mapped[1]);
    if (v.startsWith('::ffff:')) return true;
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff'); // ULA, link-local, multicast
}

export function isPrivateAddress(ip) {
    const kind = net.isIP(ip);
    if (kind === 4) return isPrivateIPv4(ip);
    if (kind === 6) return isPrivateIPv6(ip);
    return true;
}

/** URL herkese açık bir adrese mi gidiyor? Değilse Error fırlatır. Geçerliyse URL nesnesi döner. */
export async function assertPublicUrl(rawUrl) {
    let u;
    try { u = new URL(rawUrl); } catch { throw new Error('Geçerli bir URL girin.'); }
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Yalnızca http/https adreslerine izin verilir.');
    if (u.username || u.password) throw new Error('URL içinde kullanıcı adı/şifre kullanılamaz.');

    const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host || BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
        throw new Error('Bu adrese istek atılamaz (iç ağ).');
    }
    if (net.isIP(host)) {
        if (isPrivateAddress(host)) throw new Error('Bu adrese istek atılamaz (özel/iç IP).');
        return u;
    }
    let addrs;
    try { addrs = await dns.lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error(`Alan adı çözümlenemedi: ${host}`); }
    if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) {
        throw new Error('Bu alan adı iç ağ adresine çözülüyor, istek engellendi.');
    }
    return u;
}

/**
 * fetch() yerine kullan: her adımı (ilk istek + yönlendirmeler) doğrular.
 * init.redirect === 'manual' verilirse yönlendirme izlenmez (ilk yanıt döner).
 */
export async function safeFetch(rawUrl, init = {}) {
    const followRedirects = (init.redirect || 'follow') === 'follow';
    let current = rawUrl;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
        const u = await assertPublicUrl(current);
        const res = await fetch(u.toString(), { ...init, redirect: 'manual' });
        const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get('location');
        if (!isRedirect || !followRedirects) return res;
        current = new URL(res.headers.get('location'), u).toString();
    }
    throw new Error('Çok fazla yönlendirme.');
}
