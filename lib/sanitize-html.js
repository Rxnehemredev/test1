// GÜVENLİK DÜZELTMESİ: Önceki sürüm bir BLOCKLIST regex sanitizer'dı — yalnızca
// TIRNAKLI on*="..." ve href="javascript:..." kalıplarını yakalıyordu.
// Tırnaksız yazımlar (<img src=x onerror=alert(1)>, <svg onload=alert(1)>)
// tamamen sızıyordu. Artık ALLOWLIST tabanlı: sadece izin verilen etiketlere
// izin verilir, izinli etiketlerde bile TÜM attribute'lar atılır — yalnızca
// <a>/<img> için elle doğrulanmış http(s) href/src eklenir. "Tehlikeliyi
// yakala" yerine "sadece güvenli olduğunu bildiğimi geçir" mantığı, blocklist'in
// doğası gereği kaçırdığı varyasyonlara kapalıdır.
//
// NOT: Bu hâlâ tam bir HTML parser değil (regex tabanlı), sınırlı ve
// öngörülebilir (kendi ürettiğimiz blog/sayfa) içerik için yeterli bir
// güvenlik ağıdır. Üçüncü taraf/keyfi HTML için isomorphic-dompurify gibi
// test edilmiş bir kütüphane kullanılması önerilir.
const ALLOWED_TAGS = new Set([
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'a', 'img',
]);

export function sanitizeBlogHtml(html) {
    if (!html || typeof html !== 'string') return '';
    return html
        // HTML yorumları içine gizlenmiş payload'ları (conditional comments vb.) tamamen at
        .replace(/<!--[\s\S]*?-->/g, '')
        // Tehlikeli konteyner etiketlerin İÇERİĞİYLE BİRLİKTE tamamen atılması:
        // aşağıdaki allowlist geçişi sadece etiketleri siler, aradaki metni bırakır
        // (ör. <script>alert(1)</script> → "alert(1)" düz metin olarak kalır — XSS
        // değil ama istenmeyen çöp içerik). Bu yüzden script/style/iframe/object/embed
        // önce içerikleriyle birlikte tamamen kaldırılıyor.
        .replace(/<(script|style|iframe|object|embed|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
            const lower = tag.toLowerCase();
            if (!ALLOWED_TAGS.has(lower)) return '';

            const isClosing = match.startsWith('</');
            if (isClosing) return `</${lower}>`;

            if (lower === 'a') {
                const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
                const href = hrefMatch?.[1] || '';
                if (!/^https?:\/\//i.test(href)) return '<a>';
                return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer" target="_blank">`;
            }

            if (lower === 'img') {
                const srcMatch = attrs.match(/src\s*=\s*["']([^"']*)["']/i);
                const src = srcMatch?.[1] || '';
                if (!/^https?:\/\//i.test(src)) return '';
                const altMatch = attrs.match(/alt\s*=\s*["']([^"']*)["']/i);
                const alt = (altMatch?.[1] || '').replace(/"/g, '&quot;');
                return `<img src="${src.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy" />`;
            }

            // Diğer izinli etiketler: attribute'lar KOMPLE atılır (on*, style, class vb. dahil)
            return `<${lower}>`;
        });
}
