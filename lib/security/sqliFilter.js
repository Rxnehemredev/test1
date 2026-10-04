// lib/security/sqliFilter.js
//
// ══════════════════════════════════════════════════════════════════════════
// SQL INJECTION TARAYICI / PAYLOAD FİLTRESİ
//
// ÖNEMLİ: Asıl SQL injection koruması bu dosya DEĞİL. Sitedeki sorguların hepsi
// parametreli (`?` yer tutucuları) çalışıyor; kullanıcı girdisi SQL metnine hiç
// karışmıyor. Bu dosya ikinci bir savunma hattı:
//   1) sqlmap, nikto, nmap gibi bilinen zafiyet tarayıcılarını User-Agent'tan tanıyıp keser,
//   2) URL'deki (query string) bariz SQL injection kalıplarını (UNION SELECT, OR 1=1,
//      SLEEP(5), information_schema ...) veritabanına hiç ulaşmadan 403 ile reddeder.
// Sadece query string'e bakar (gövdeyi okumak middleware'de pahalı). Yanlış pozitifi
// önlemek için kalıplar bilerek dar tutuldu: normal arama kelimeleri ("Solo Leveling",
// "select") etkilenmez.
// ══════════════════════════════════════════════════════════════════════════

export const SCANNER_UA_PATTERNS = [
    /sqlmap/i, /\bnikto\b/i, /\bnmap\b/i, /masscan/i, /acunetix/i, /netsparker/i,
    /\bnessus\b/i, /wpscan/i, /dirbuster/i, /gobuster/i, /\bhavij\b/i, /\bw3af\b/i,
    /openvas/i, /\bjaeles\b/i, /\bnuclei\b/i, /\bzgrab\b/i, /\bferoxbuster\b/i,
    // Ek pentest/tarama araçları — daha geniş kapsama için genişletildi.
    /burpsuite/i, /\bburp\b/i, /zaproxy/i, /owasp\s*zap/i, /\bzap\b\/?[\d.]*$/i,
    /\bhydra\b/i, /medusa/i, /metasploit/i, /\bnexpose\b/i, /qualys/i,
    /\barachni\b/i, /skipfish/i, /\bwapiti\b/i, /\bwhatweb\b/i, /sqlninja/i,
    /commix/i, /xsstrike/i, /\bdirb\b/i, /\bpatator\b/i, /\bdnsrecon\b/i,
    /\bsublist3r\b/i, /shodan/i, /censys/i, /\bnmap[\s\-]scripting/i,
    /vega\/[\d.]*/i, /\bappscan\b/i, /rapid7/i, /\btrivy\b/i, /\bcurlsqli\b/i,
];

/** @returns {boolean} User-Agent bilinen bir zafiyet tarayıcısına mı ait? */
export function isScannerUA(ua) {
    return !!ua && SCANNER_UA_PATTERNS.some((re) => re.test(ua));
}

const SQLI_PATTERNS = [
    /\bunion\b[\s/*+]+(all[\s/*+]+)?select\b/i,                       // UNION [ALL] SELECT
    /information_schema|sqlite_master|pg_catalog|sys\.tables|mysql\.user/i,
    /\b(sleep|pg_sleep|benchmark|randomblob|load_extension)\s*\(/i,   // zaman tabanlı (blind) sızma
    /\bwaitfor\s+delay\b/i,
    /['"`)]\s*(or|and)\s+['"`(]?\d+['"`)]?\s*=\s*['"`(]?\d+/i,        // ' OR '1'='1  /  ') AND 5=5
    /\b(or|and)\s+\d+\s*=\s*\d+\b/i,                                  // OR 1=1  /  AND 1=1
    /['"`]\s*(or|and)\s+['"`]/i,                                      // ' OR '...
    /;\s*(drop|insert|update|delete|alter|create|attach)\s+\w+/i,     // yığılmış sorgu
    /\b(extractvalue|updatexml)\s*\(/i,
    /\bconcat\s*\(\s*0x[0-9a-f]+/i,
    // Ek kalıplar — komut yürütme, dosya okuma/yazma, yorum tabanlı gizleme
    // ve hex/char tabanlı obfuscation girişimlerini de kapsar.
    /\bxp_cmdshell\b/i,
    /\bload_file\s*\(/i,
    /\binto\s+(outfile|dumpfile)\b/i,
    /\bexec\s*\(\s*(sp|xp)_/i,
    /\/\*!\d*/,                                                       // MySQL yorum tabanlı bypass: /*!50000 ...
    /\bchar\s*\(\s*\d+\s*,/i,                                          // CHAR(65,66,...) obfuscation
    /0x[0-9a-f]{8,}/i,                                                 // uzun hex literal (hex-encoded payload)
    /\bor\s+sleep\s*\(/i,
];

function safeDecode(str) {
    let s = str.replace(/\+/g, ' ');
    // Çift kodlamayı da yakalamak için en fazla 2 kez çöz
    for (let i = 0; i < 2; i++) {
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

/**
 * @param {string} search  request.nextUrl.search (ör. "?q=Solo+Leveling&page=2")
 * @returns {boolean} Query string bariz bir SQL injection denemesi içeriyor mu?
 */
export function looksLikeSqlInjection(search) {
    if (!search || search.length < 8) return false;
    const decoded = safeDecode(search.slice(0, 2000)); // çok uzun girdilerle CPU harcatma
    return SQLI_PATTERNS.some((re) => re.test(decoded));
}
