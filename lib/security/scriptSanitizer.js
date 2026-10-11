// lib/security/scriptSanitizer.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin custom_body_js alanı için Katı Beyaz Liste (Strict Whitelist) Doğrulayıcısı.
//
// GÜVENLİK MİMARİSİ:
// Keyfi (arbitrary) JavaScript kodunu bir blacklist/regex ile güvenli hale getirmek
// teorik olarak imkansızdır (string birleştirme, computed properties, eval varyasyonları vb.).
// Ayrıca bu koda geçerli CSP nonce verilmesi, tüm CSP savunmasını anlamsız kılabilir.
//
// Bu nedenle sistem BEYAZ LİSTE (Whitelist) modeline geçirilmiştir:
// 1. Harici scriptler (<script src="...">): Yalnızca doğrulanmış resmi analitik / widget
//    alan adlarından (Google Analytics, GTM, Cloudflare, Yandex, Plausible, Umami vb.) HTTPS ile yüklenebilir.
// 2. Inline scriptler: Yalnızca bilinen ve güvenli resmi analitik başlatıcı şablonlarına
//    (GA4 gtag, GTM container, Yandex Metrica init) izin verilir; keyfi JS fonksiyonları,
//    DOM erişimleri ve yabancı API çağrıları kesin olarak reddedilir (Fail-Closed).
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SCRIPT_LENGTH = 8192;

export const ALLOWED_SCRIPT_DOMAINS = [
    'www.googletagmanager.com',
    'googletagmanager.com',
    'www.google-analytics.com',
    'google-analytics.com',
    'static.cloudflareinsights.com',
    'challenges.cloudflare.com',
    'mc.yandex.ru',
    'plausible.io',
    'analytics.umami.is',
    'embed.tawk.to',
    'client.crisp.chat',
    'call.chatra.io',
];

// İzin verilen resmi inline analitik şablonları (whitelist regex)
const ALLOWED_INLINE_PATTERNS = [
    // 1) Google Analytics (gtag.js) standart başlatma
    {
        name: 'Google Analytics (gtag)',
        test: (code) => {
            const normalized = code.replace(/\s+/g, ' ').trim();
            // window.dataLayer = window.dataLayer || []; function gtag()... gtag('js', ...); gtag('config', 'G-XXX');
            return /window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]\s*;\s*function\s+gtag\s*\(\s*\)\s*\{\s*dataLayer\.push\s*\(\s*arguments\s*\)\s*;\s*\}\s*gtag\s*\(\s*['"]js['"]\s*,\s*new\s+Date\(\)\s*\)\s*;\s*gtag\s*\(\s*['"]config['"]\s*,\s*['"](?:G-[A-Za-z0-9_-]+|UA-[0-9]+-[0-9]+)['"](?:\s*,\s*\{[^}]*\})?\s*\)\s*;?/i.test(normalized);
        }
    },
    // 2) Google Tag Manager standart container başlatma
    {
        name: 'Google Tag Manager (GTM)',
        test: (code) => {
            const normalized = code.replace(/\s+/g, ' ').trim();
            return /\(function\s*\(w,d,s,l,i\)\s*\{\s*w\[l\]=w\[l\]\|\|\[\];w\[l\]\.push\(\{'gtm\.start':\s*new\s+Date\(\)\.getTime\(\),event:'gtm\.js'\}\);var\s+f=d\.getElementsByTagName\(s\)\[0\],\s*j=d\.createElement\(s\),dl=l!='dataLayer'\?'&l='\+l:'';j\.async=true;j\.src=['"]https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=['"]\+i\+dl;f\.parentNode\.insertBefore\(j,f\);\s*\}\)\(window,document,['"]script['"],['"]dataLayer['"],['"]GTM-[A-Za-z0-9]+['"]\);?/i.test(normalized);
        }
    },
    // 3) Yandex Metrica sayaç başlatma
    {
        name: 'Yandex Metrica',
        test: (code) => {
            const normalized = code.replace(/\s+/g, ' ').trim();
            return /ym\s*\(\s*\d+\s*,\s*['"]init['"]\s*,\s*\{[\s\S]*\}\s*\)\s*;?/i.test(normalized) &&
                   !/(document\s*\.\s*cookie|localStorage|sessionStorage|eval|fetch|XMLHttpRequest)/i.test(code);
        }
    },
    // 4) Cloudflare Web Analytics beacon JSON
    {
        name: 'Cloudflare Analytics Beacon',
        test: (code) => {
            const normalized = code.replace(/\s+/g, ' ').trim();
            return /^\{\s*["']token["']\s*:\s*["'][a-f0-9]{32}["']\s*\}$/i.test(normalized);
        }
    }
];

/**
 * Validates and extracts custom_body_js script entries.
 * Returns { valid: boolean, error?: string, scripts?: Array<{ type: 'external'|'inline', src?: string, code?: string, attrs?: Record<string, string> }> }
 *
 * @param {string} raw
 * @returns {{ valid: boolean, error?: string, scripts?: Array<any> }}
 */
export function validateCustomBodyJs(raw) {
    if (!raw || typeof raw !== 'string') return { valid: true, scripts: [] };
    const trimmed = raw.trim();
    if (!trimmed) return { valid: true, scripts: [] };

    if (trimmed.length > MAX_SCRIPT_LENGTH) {
        return { valid: false, error: `Script boyutu çok büyük (maksimum ${MAX_SCRIPT_LENGTH} karakter).` };
    }

    // HTML içinde <script> haricinde herhangi bir etiket (img, iframe, svg, div, a vb.) var mı?
    const nonScriptTags = trimmed.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                                 .replace(/<script\b[^>]*\/>/gi, '')
                                 .trim();
    if (/<[a-z!/]/i.test(nonScriptTags)) {
        return {
            valid: false,
            error: 'Güvenlik politikası gereği bu alanda yalnızca <script> etiketleri kullanılabilir; iframe, resim veya diğer HTML etiketleri yasaktır.'
        };
    }

    // Script etiketlerini ayrıştır
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    const matches = [...trimmed.matchAll(scriptRegex)];

    if (matches.length === 0) {
        // Kullanıcı doğrudan tag olmadan kod yazmış olabilir (ör. gtag(...) veya tek satır)
        // Güvenlik gereği doğrudan kod da inline pattern kontrolüne tabi tutulur
        const matchedPattern = ALLOWED_INLINE_PATTERNS.find(p => p.test(trimmed));
        if (matchedPattern) {
            return { valid: true, scripts: [{ type: 'inline', code: trimmed }] };
        }
        return {
            valid: false,
            error: 'Güvenlik politikası gereği keyfi JavaScript kodu çalıştırılamaz. Yalnızca Google Analytics (gtag), Google Tag Manager, Cloudflare ve Yandex Metrica gibi onaylı analitik servislerinin standart kodları kabul edilir.'
        };
    }

    const parsedScripts = [];

    for (const match of matches) {
        const attrStr = match[1] || '';
        const innerCode = (match[2] || '').trim();

        // src özniteliğini kontrol et
        const srcMatch = attrStr.match(/\bsrc=["']([^"']+)["']/i);
        if (srcMatch) {
            const srcUrl = srcMatch[1].trim();
            let parsed;
            try {
                parsed = new URL(srcUrl, 'https://dummy.local');
            } catch {
                return { valid: false, error: 'Geçersiz script src adresi.' };
            }

            if (parsed.protocol !== 'https:') {
                return { valid: false, error: 'Harici scriptler yalnızca güvenli HTTPS üzerinden yüklenebilir.' };
            }

            const host = parsed.hostname.toLowerCase();
            const isAllowed = ALLOWED_SCRIPT_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
            if (!isAllowed) {
                return {
                    valid: false,
                    error: `Güvenlik politikası gereği bilinmeyen kaynaktan (${host}) script yüklenemez. Yalnızca Google Analytics, GTM, Cloudflare ve bilinen güvenli analitik servislerine izin verilir.`
                };
            }

            parsedScripts.push({
                type: 'external',
                src: srcUrl,
                async: /\basync\b/i.test(attrStr),
                defer: /\bdefer\b/i.test(attrStr),
            });
        } else if (innerCode) {
            // Inline script: mutlaka onaylı analitik şablonlarından biriyle eşleşmeli
            const matchedPattern = ALLOWED_INLINE_PATTERNS.find(p => p.test(innerCode));
            if (!matchedPattern) {
                return {
                    valid: false,
                    error: 'Güvenlik engeli: Serbest inline JavaScript çalıştırılması yasaktır. Yalnızca Google Analytics, GTM veya Yandex Metrica başlatma kodları kullanılabilir.'
                };
            }

            parsedScripts.push({
                type: 'inline',
                code: innerCode,
            });
        }
    }

    return { valid: true, scripts: parsedScripts };
}
