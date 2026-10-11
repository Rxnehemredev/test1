/**
 * Bölüm başlığı kontrolleri ve yardımcıları.
 * Kullanıcının girdiği başlığın sadece varsayılan ("Bölüm 5", "Chapter 5" vb.)
 * olup olmadığını kontrol eder.
 */

export function isDefaultTitle(title, chNum) {
    if (!title) return true;
    const cleanTitle = title.trim().toLowerCase();
    const cleanNum = String(chNum).trim().toLowerCase();
    const normalized = cleanTitle.replace(/\s+/g, ' ');
    const defaults = [
        `chapter ${cleanNum}`,
        `ch. ${cleanNum}`,
        `ch.${cleanNum}`,
        `bölüm ${cleanNum}`,
        `böl. ${cleanNum}`,
        `böl.${cleanNum}`,
        `bö. ${cleanNum}`,
        `bö.${cleanNum}`,
        `${cleanNum}. bölüm`,
        `${cleanNum}.bölüm`,
        `bölüm: ${cleanNum}`,
        `bölüm:${cleanNum}`,
        `bölüm-${cleanNum}`,
        `bölüm_${cleanNum}`,
        cleanNum,
    ];
    return defaults.includes(normalized);
}
