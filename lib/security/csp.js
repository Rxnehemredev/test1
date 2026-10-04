// lib/security/csp.js
//
// Nonce tabanlı Content-Security-Policy. Her istekte middleware yeni bir nonce
// üretir; CSP header'ı hem request'e (Next.js kendi script'lerine nonce'u buradan
// okuyup uygular) hem response'a yazılır. layout.js, inline script'lere
// `x-nonce` request header'ındaki değeri basar.
//
// script-src'te 'unsafe-inline' YOK: nonce'suz inline script (XSS ile enjekte
// edilen <script>, onerror= vb.) çalışmaz. 'strict-dynamic' sayesinde nonce'lu
// bir script'in sonradan eklediği script'ler (GTM, Turnstile, admin'in
// custom_head_scripts'i) çalışmaya devam eder.

export function generateNonce() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

export function buildCsp(nonce) {
    const isDev = process.env.NODE_ENV === 'development';
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "frame-src 'self' https://challenges.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
    ].join('; ');
}
