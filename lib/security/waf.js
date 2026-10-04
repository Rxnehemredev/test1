// lib/security/waf.js
//
// ══════════════════════════════════════════════════════════════════════════
// UYGULAMA İÇİ WAF — saf fonksiyonlar (I/O yok, Edge + Node uyumlu)
//
// Vercel'in platform güvenlik duvarının yaptığı "temel hijyen" kontrollerinin
// uygulama içi karşılığı. Vercel dışında (VPS/Docker) bu kontrolleri artık
// hiçbir platform yapmadığı için burada yapılır:
//
//   • HTTP metod allowlist'i (TRACE/CONNECT vb. kapalı)
//   • Host başlığı doğrulaması (Host-header injection / cache poisoning /
//     middleware içindeki self-fetch SSRF'ini engeller)
//   • İstek kaçakçılığı (request smuggling): Content-Length + Transfer-Encoding çakışması
//   • Next.js'in iç başlıklarının (x-middleware-*) dışarıdan sahtelenmesi
//   • URL anomalileri: aşırı uzunluk, NUL/CRLF, path traversal, overlong UTF-8,
//     çift/üçlü kodlama
//   • Parametre kirliliği / prototype pollution / NoSQL operatör enjeksiyonu
//   • Belirgin XSS / LFI / komut enjeksiyonu / SSTI / Log4Shell / bulut-metadata SSRF payload'ları
//
// Bilerek DAR tutulmuştur: normal arama kelimeleri ve seri adları engellenmez.
// Asıl koruma (parametreli SQL, çıktı kodlama, CSP) uygulama kodundadır; bu katman
// veritabanına/route'a ulaşmadan kesen ikinci hattır.
// ══════════════════════════════════════════════════════════════════════════

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const DANGEROUS_METHODS = new Set(['TRACE', 'TRACK', 'CONNECT', 'DEBUG']);

const MAX_URL_LENGTH = 4096;
const MAX_QUERY_LENGTH = 3000;
const MAX_QUERY_PARAMS = 60;
const MAX_HEADER_COUNT = 80;
const MAX_HEADER_VALUE = 8192;
const MAX_UA_LENGTH = 1024;

// ── Host allowlist ────────────────────────────────────────────────────────
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:.]+\])(?::\d{1,5})?$/;

function hostnameOnly(host) {
    if (!host) return '';
    const h = String(host).trim().toLowerCase();
    if (h.startsWith('[')) {
        const end = h.indexOf(']');
        return end > 0 ? h.slice(0, end + 1) : h;
    }
    return h.replace(/:\d{1,5}$/, '');
}

let allowedCache = { sig: null, value: null };

/**
 * İzin verilen host listesi. Kaynaklar: NEXT_PUBLIC_BASE_URL, ALLOWED_HOSTS (virgüllü,
 * `*.ornek.com` desteklenir), Vercel ortam değişkenleri. Hiçbiri yoksa null (kontrol atlanır).
 * @returns {{exact:Set<string>, suffixes:string[]} | null}
 */
export function getAllowedHosts(env = process.env) {
    const sig = [
        env.NEXT_PUBLIC_BASE_URL, env.ALLOWED_HOSTS, env.VERCEL, env.VERCEL_URL,
        env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_BRANCH_URL, env.NODE_ENV,
    ].join('|');
    if (allowedCache.sig === sig) return allowedCache.value;

    const exact = new Set();
    const suffixes = [];
    const add = (raw) => {
        const h = hostnameOnly(raw);
        if (!h) return;
        if (h.startsWith('*.')) { suffixes.push(h.slice(1)); return; } // ".ornek.com"
        exact.add(h);
        if (!h.startsWith('[') && !/^\d+\.\d+\.\d+\.\d+$/.test(h) && h !== 'localhost') {
            exact.add(h.startsWith('www.') ? h.slice(4) : `www.${h}`);
        }
    };

    try { if (env.NEXT_PUBLIC_BASE_URL) add(new URL(env.NEXT_PUBLIC_BASE_URL).hostname); } catch { /* yoksay */ }
    (env.ALLOWED_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach(add);

    const onVercel = env.VERCEL === '1' || Boolean(env.VERCEL_ENV);
    if (onVercel) {
        [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_BRANCH_URL].forEach((u) => u && add(u));
        suffixes.push('.vercel.app');
    }
    if (env.NODE_ENV !== 'production') { add('localhost'); add('127.0.0.1'); add('[::1]'); }

    const value = exact.size || suffixes.length ? { exact, suffixes } : null;
    allowedCache = { sig, value };
    return value;
}

export function isHostAllowed(host, allowed = getAllowedHosts()) {
    if (!allowed) return true; // yapılandırılmamış → kontrol yok
    const h = hostnameOnly(host);
    if (!h) return false;
    if (allowed.exact.has(h)) return true;
    return allowed.suffixes.some((suf) => h.endsWith(suf) && h.length > suf.length);
}

// ── Çözme yardımcıları ────────────────────────────────────────────────────
function decodeDeep(str, rounds = 3) {
    let s = String(str).replace(/\+/g, ' ');
    for (let i = 0; i < rounds; i++) {
        try {
            const d = decodeURIComponent(s);
            if (d === s) break;
            s = d;
        } catch {
            break;
        }
    }
    return s;
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Overlong UTF-8 / çift kodlanmış nokta-slash-ters slash
const OVERLONG = /%c0%(?:ae|af|2e|2f|5c)|%c1%(?:1c|9c|af)|%e0%80%(?:ae|af)|%25(?:2e|2f|5c|00|0a|0d)|%u00(?:2e|2f|5c)|%u2215|%uff0e/i;

// ── Payload kalıpları (bilerek dar) ───────────────────────────────────────
const PAYLOAD_RULES = [
    ['xss', /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|meta|base|link)\b/i],
    ['xss', /<\s*(?:img|body|input|details|video|audio|marquee)\b[^>]{0,200}\bon[a-z]{3,20}\s*=/i],
    ['xss', /\b(?:javascript|vbscript)\s*:/i],
    ['xss', /\bon(?:error|load|mouseover|focus|toggle|animationstart|pointerover|begin)\s*=\s*['"`]?[^&\s]{2,}/i],
    ['xss', /\bdocument\s*\.\s*(?:cookie|domain|write|location)\b/i],
    ['xss', /\bdata\s*:\s*text\/html/i],
    ['lfi', /(?:^|[\\/=])(?:etc\/(?:passwd|shadow|group|hosts)\b|proc\/self\/|windows\/win\.ini|boot\.ini)/i],
    ['lfi', /\b(?:php|phar|zip|expect|gopher|dict|ldap|jar|glob):\/\//i],
    ['lfi', /\bfile:\/\/\//i],
    ['rce', /(?:;|\||&&|`|\$\()\s*(?:cat|whoami|uname|wget|curl|nc|ncat|bash|powershell|cmd|python\d?|perl|php)\b/i],
    ['rce', /\/bin\/(?:ba|z|da)?sh\b|cmd\.exe|powershell(?:\.exe)?\s+-/i],
    ['rce', /\$\{IFS\}|\$IFS\b/],
    ['jndi', /\$\{\s*(?:jndi|env|sys|java|ctx|lower|upper|date|::-)/i],
    ['ssti', /\{\{\s*\d+\s*[*+]\s*\d+\s*\}\}|\{\{[^}]{0,80}(?:__class__|__globals__|__builtins__|lipsum|cycler|joiner|config\.items)/i],
    ['ssti', /<%[=\-]|\$\{\{|\#\{[^}]{0,40}\}/],
    ['ssrf', /169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200|fd00:ec2::254/i],
    ['nosql', /(?:[\n?&\[])\$(?:ne|gt|gte|lt|lte|in|nin|or|and|nor|not|regex|where|exists|expr|function)\b/i],
    ['proto', /(?:[\n?&\[.])(?:__proto__|constructor|prototype)(?:[\]\.\[=&]|$)/i],
];

// Rapor ağırlıkları (threatShield.recordViolation): 3 = tek başına ban eşiği.
const WEIGHT = { structural: 3, payload: 3, softPayload: 2, host: 2, method: 2, limit: 1 };

function hit(status, reason, weight) {
    return { status, reason, weight };
}

/**
 * @param {{ method: string, pathname: string, search: string, headers: Headers }} req
 * @param {{ allowedHosts?: ReturnType<typeof getAllowedHosts> }} [opts]
 * @returns {{status:number, reason:string, weight:number} | null}  null = temiz
 */
export function inspectRequest(req, opts = {}) {
    const method = String(req.method || 'GET').toUpperCase();
    const pathname = req.pathname || '/';
    const search = req.search || '';
    const headers = req.headers;

    // 1) Metod
    if (DANGEROUS_METHODS.has(method)) return hit(405, `method:${method.toLowerCase()}`, 3);
    if (!ALLOWED_METHODS.has(method)) return hit(405, 'method:unknown', WEIGHT.method);

    // 2) Başlıklar
    if (headers && typeof headers.forEach === 'function') {
        let count = 0;
        let bad = null;
        headers.forEach((value, name) => {
            if (bad) return;
            count++;
            if (name.startsWith('x-middleware-') || name === 'x-invoke-path' || name === 'x-invoke-query') {
                bad = hit(400, 'header:internal_spoof', WEIGHT.structural);
            } else if (value.length > MAX_HEADER_VALUE) {
                bad = hit(431, 'header:too_large', WEIGHT.limit);
            }
        });
        if (bad) return bad;
        if (count > MAX_HEADER_COUNT) return hit(431, 'header:too_many', WEIGHT.limit);

        const cl = headers.get('content-length');
        const te = headers.get('transfer-encoding');
        if (cl !== null && te !== null) return hit(400, 'smuggling:cl_te', WEIGHT.structural);
        if (cl !== null && !/^\d{1,12}$/.test(cl.trim())) return hit(400, 'smuggling:bad_cl', WEIGHT.structural);
        if (te !== null && te.trim().toLowerCase() !== 'chunked') return hit(400, 'smuggling:bad_te', WEIGHT.structural);

        const ua = headers.get('user-agent');
        if (ua && ua.length > MAX_UA_LENGTH) return hit(400, 'header:ua_too_long', WEIGHT.limit);

        const range = headers.get('range');
        if (range && (range.match(/,/g) || []).length > 5) return hit(416, 'header:range_flood', WEIGHT.limit);

        // 3) Host
        const host = headers.get('host');
        if (host !== null) {
            const hl = host.trim().toLowerCase();
            if (!HOST_RE.test(hl)) return hit(400, 'host:malformed', WEIGHT.host);
            const allowed = opts.allowedHosts !== undefined ? opts.allowedHosts : getAllowedHosts();
            if (!isHostAllowed(hl, allowed)) return hit(421, 'host:not_allowed', WEIGHT.host);
            const xfh = headers.get('x-forwarded-host');
            if (xfh) {
                const first = xfh.split(',')[0].trim().toLowerCase();
                if (!HOST_RE.test(first) || !isHostAllowed(first, allowed)) return hit(421, 'host:xfh_not_allowed', WEIGHT.host);
            }
        }
    }

    // 4) URL boyutu
    if (pathname.length + search.length > MAX_URL_LENGTH || search.length > MAX_QUERY_LENGTH) {
        return hit(414, 'url:too_long', WEIGHT.limit);
    }

    // 5) URL anomalileri
    const rawLower = (pathname + search).toLowerCase();
    if (OVERLONG.test(rawLower)) return hit(400, 'url:overlong_or_double_encoded', WEIGHT.structural);

    const decodedPath = decodeDeep(pathname.replace(/\+/g, '%2B'));
    const decodedQuery = decodeDeep(search);
    if (CONTROL_CHARS.test(decodedPath) || CONTROL_CHARS.test(decodedQuery)) {
        return hit(400, 'url:control_chars', WEIGHT.structural);
    }
    if (decodedPath.includes('\\')) return hit(400, 'url:backslash', WEIGHT.structural);
    if (decodedPath.split('/').some((seg) => seg === '..' || seg === '.;' || seg.startsWith('..;'))) {
        return hit(400, 'url:traversal', WEIGHT.structural);
    }

    // 6) Parametre sayısı
    if (search.length > 1) {
        const paramCount = (search.match(/&/g) || []).length + 1;
        if (paramCount > MAX_QUERY_PARAMS) return hit(400, 'url:param_flood', WEIGHT.limit);
    }

    // 7) Payload kalıpları (path + query)
    const haystack = `${decodedPath}\n${decodedQuery}`;
    for (const [name, re] of PAYLOAD_RULES) {
        if (re.test(haystack)) {
            const soft = name === 'nosql' || name === 'proto';
            return hit(403, `payload:${name}`, soft ? WEIGHT.softPayload : WEIGHT.payload);
        }
    }

    return null;
}

/** Test yardımcısı: allowlist cache'ini sıfırla. */
export function resetWafCache() {
    allowedCache = { sig: null, value: null };
}
