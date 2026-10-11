/**
 * Tarih ve göreli zaman yardımcıları.
 * SQLite UTC string'lerini tarayıcı uyumlu ISO formatına dönüştürür.
 */

export function parseUtcDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    let str = String(dateInput).trim();
    // SQLite "YYYY-MM-DD HH:MM:SS" biçimi -> "YYYY-MM-DDTHH:MM:SSZ"
    if (!str.includes('T') && str.includes(' ')) {
        str = str.replace(' ', 'T');
    }
    if (!str.endsWith('Z') && !str.includes('+') && !str.includes('-', 10)) {
        str += 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Ana sayfa ve bölüm listesi için göreli zaman formatlayıcı.
 * Opsiyonel appSettings üzerinden özel dil anahtarlarını destekler.
 */
export function timeAgo(dateInput, appSettings = {}) {
    const d = parseUtcDate(dateInput);
    if (!d) return '';
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    const justNow = appSettings.lang_time_just_now || 'şimdi';
    const minAgo = appSettings.lang_time_min_ago || ' dk önce';
    const hourAgo = appSettings.lang_time_hour_ago || ' sa önce';
    const dayAgo = appSettings.lang_time_day_ago || ' gün önce';

    if (seconds < 60) return justNow;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${minAgo}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}${hourAgo}`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}${dayAgo}`;
    return d.toLocaleDateString('tr-TR');
}

/**
 * Yorumlar için kompakt göreli zaman formatlayıcı (örn: "2dk önce", "3sa önce", "5g önce").
 */
export function timeAgoCompact(dateInput) {
    const d = parseUtcDate(dateInput);
    if (!d) return '';
    const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    return `${Math.floor(hours / 24)}g önce`;
}

/**
 * Bildirimler için standart göreli zaman formatlayıcı (örn: "2 dk önce", "3 sa önce", "5 gün önce").
 */
export function timeAgoStandard(dateInput) {
    const d = parseUtcDate(dateInput);
    if (!d) return '';
    const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} sa önce`;
    return `${Math.floor(hours / 24)} gün önce`;
}

/**
 * Sohbet için sözel göreli zaman formatlayıcı (örn: "az önce", "5 dakika", "2 saat", "3 gün").
 */
export function timeAgoVerbose(dateInput) {
    const d = parseUtcDate(dateInput);
    if (!d) return '';
    const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (minutes < 1) return 'az önce';
    if (minutes < 60) return `${minutes} dakika`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat`;
    return `${Math.floor(hours / 24)} gün`;
}

/**
 * Statik tarih formatlayıcı (örn: "15 Ekim 2026")
 */
export function formatDate(dateInput, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
    const d = parseUtcDate(dateInput);
    if (!d) return '';
    return d.toLocaleDateString('tr-TR', options);
}
