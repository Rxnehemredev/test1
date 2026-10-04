// lib/security/pathBlock.js
//
// ══════════════════════════════════════════════════════════════════════════
// PATH BLOCK — bilinen zararlı/tarama amaçlı URL kalıplarını engeller
// (.env, .git, wp-admin, xmlrpc.php, .ssh, id_rsa vb.)
//
// Bu dosya middleware.js'ten AYRI tutuluyor ki bu listeyi güncellerken
// (yeni bir kalıp eklerken/çıkarırken) diğer koruma katmanlarına (rate
// limit, threat shield, DDoS gate) dokunma riski olmasın. Bir regex'te
// yazım hatası olsa bile bu modül tek başına import edilip test edilebilir.
// ══════════════════════════════════════════════════════════════════════════

export const BLOCKED_PATH_PATTERNS = [
    /(^|\/)\.env(\.|$)/i, /(^|\/)\.git(\/|$)/i, /\.bak$/i, /\.sql$/i,
    /(^|\/)\.htaccess$/i, /(^|\/)\.htpasswd$/i, /wp-admin/i, /wp-login/i,
    /wp-content/i, /phpmyadmin/i, /xmlrpc\.php$/i, /(^|\/)\.ssh\//i,
    /id_rsa/i, /\.well-known\/(?!acme-challenge)/i, /composer\.json$/i,
    /\.DS_Store$/i,
    // Ek kalıplar — sunucu/altyapı bilgisi sızdırabilecek veya yaygın olarak
    // taranan diğer dosya/dizinler (config dökümleri, VCS, IDE, konteyner
    // tanımları, framework debug/actuator uçları vb.).
    /(^|\/)\.aws\//i, /(^|\/)\.idea\//i, /(^|\/)\.vscode\//i,
    /(^|\/)\.svn(\/|$)/i, /(^|\/)\.hg(\/|$)/i, /(^|\/)\.bzr(\/|$)/i,
    /config\.php$/i, /configuration\.php$/i, /settings\.py$/i,
    /web\.config$/i, /docker-compose\.ya?ml$/i, /(^|\/)Dockerfile$/i,
    /(^|\/)\.npmrc$/i, /(^|\/)\.pgpass$/i, /(^|\/)\.netrc$/i,
    /actuator(\/|$)/i, /server-status/i, /server-info/i, /phpinfo\.php$/i,
    /(^|\/)adminer\.php$/i, /id_dsa/i, /id_ecdsa/i, /id_ed25519/i,
    /\.pem$/i, /\.pfx$/i, /\.p12$/i,
    /elmah\.axd$/i, /trace\.axd$/i, /\.vscode\/sftp\.json$/i,
    /backup\.(zip|tar|tar\.gz|tgz|rar|7z)$/i, /dump\.(sql|rdb)$/i,
    // Vercel dışı (VPS) kurulumda sık taranan yollar. Hepsi yolun BAŞINA sabitli:
    // /seri/console-xyz gibi meşru slug'lar etkilenmez.
    /^\/(?:cgi-bin|cgi|scripts|vendor|boaform|HNAP1|solr|jenkins|manager|console|_ignition|telescope|_profiler|debug|actuator|jmx-console|axis2|struts|geoserver|ecp|owa|autodiscover|mgmt|remote|vpn|sslvpn|admin\.php|administrator|wp-json|phpunit|containers|v2\/_catalog|api\/v1\/pods|\.docker|\.kube|\.terraform|\.circleci|\.travis|\.gitlab)(?:\/|$|\?)/i,
    /^\/(?:login\.(?:php|asp|aspx|jsp|cgi)|index\.(?:php|asp|aspx|jsp)|shell\.(?:php|jsp)|eval-stdin\.php|setup\.php|install\.php|test\.php|info\.php|config\.(?:json|ya?ml|inc|bak|old)|database\.(?:sql|yml|yaml)|\.env\.[a-z]+|\.git\/config|package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|\.next\/server)/i,
    /\.(?:php\d?|asp|aspx|jsp|jspx|cgi|pl|py|sh|bash|exe|dll|ini|log|old|orig|save|swp|tar|gz|tgz|zip|rar|7z|bak~|conf|cfg|yml|yaml|toml)$/i,
];

/**
 * Verilen path zararlı bir kalıba uyuyor mu?
 * @param {string} pathname
 * @returns {boolean}
 */
export function isBlockedPath(pathname) {
    return BLOCKED_PATH_PATTERNS.some((re) => re.test(pathname));
}
