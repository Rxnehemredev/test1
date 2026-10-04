// lib/security/safeUrl.js
// Kullanıcı/DB kaynaklı bir değeri href olarak basmadan önce süz: `javascript:`, `data:`,
// `vbscript:` gibi şemalar (XSS) ve `//evil.com` (protokol-göreli açık yönlendirme) engellenir.
// İstemci ve sunucuda kullanılabilir (server-only değil).
export function safeHref(url, fallback = '#') {
    if (typeof url !== 'string') return fallback;
    const v = url.trim();
    if (!v) return fallback;
    if (/[\u0000-\u001f\u007f]/.test(v)) return fallback;      // kontrol karakterleri (java\nscript: hilesi)
    if (v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\')) return v; // site içi yol
    if (v.startsWith('#') || v.startsWith('?')) return v;
    try {
        const u = new URL(v);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? v : fallback;
    } catch { return fallback; }
}
