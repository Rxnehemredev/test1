// lib/security/ipUtil.js
//
// IP anahtarlama yardımcıları (Edge + Node uyumlu, bağımlılık yok).
//
// NEDEN: IPv6'da tek bir kullanıcıya/saldırgana en az /64 (2^64 adres) verilir.
// Ban ve rate-limit sayaçlarını ham adrese bağlarsak saldırgan her istekte
// farklı bir adres kullanıp tüm korumaları atlatır. Bu yüzden IPv6 adresleri
// /64 ön ekine indirgenir; IPv4 aynen kalır. IPv4-mapped IPv6 adresleri
// (::ffff:1.2.3.4) gerçek IPv4'e çevrilir.

const MAPPED_DOTTED = /^(?:::ffff:|0:0:0:0:0:ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * @param {string} ip
 * @returns {string} Sayaç/ban anahtarı olarak kullanılacak normalleştirilmiş IP.
 */
export function ipBucket(ip) {
    if (typeof ip !== 'string' || !ip.includes(':')) return ip;
    let s = ip.trim().toLowerCase().split('%')[0];

    const mapped = s.match(MAPPED_DOTTED);
    if (mapped) return mapped[1];

    let hextets;
    if (s.includes('::')) {
        const parts = s.split('::');
        if (parts.length !== 2) return ip;
        const head = parts[0] ? parts[0].split(':') : [];
        const tail = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - head.length - tail.length;
        if (missing < 1) return ip;
        hextets = [...head, ...Array(missing).fill('0'), ...tail];
    } else {
        hextets = s.split(':');
    }
    if (hextets.length !== 8) return ip;
    if (!hextets.every((h) => /^[0-9a-f]{1,4}$/.test(h))) return ip;

    // ::ffff:aabb:ccdd (onaltılı biçimli IPv4-mapped)
    if (hextets.slice(0, 5).every((h) => /^0+$/.test(h)) && /^0*ffff$/.test(hextets[5])) {
        const hi = parseInt(hextets[6], 16);
        const lo = parseInt(hextets[7], 16);
        return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
    }

    return hextets.slice(0, 4).map((h) => h.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}
