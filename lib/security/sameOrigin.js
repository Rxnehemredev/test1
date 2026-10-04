// lib/security/sameOrigin.js
// CSRF için ek katman: durum değiştiren (POST/PUT/DELETE) isteklerde tarayıcının gönderdiği
// Origin (yoksa Referer) başlığı sitenin kendi host'uyla eşleşmeli. Origin/Referer hiç yoksa
// (sunucudan sunucuya, cron, curl) izin verilir — tarayıcılar cross-site POST'ta Origin gönderir.
export function isSameOrigin(request) {
    const src = request.headers.get('origin') || request.headers.get('referer');
    if (!src) return true;
    let srcHost;
    try { srcHost = new URL(src).host.toLowerCase(); } catch { return false; }
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim().toLowerCase();
    if (host && srcHost === host) return true;
    try {
        const base = process.env.NEXT_PUBLIC_BASE_URL;
        if (base && new URL(base).host.toLowerCase() === srcHost) return true;
    } catch {}
    return false;
}
