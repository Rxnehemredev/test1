import sharp from 'sharp';

/**
 * Aşama 3 — Güvenlik: Yükleme uç noktaları yalnızca istemcinin gönderdiği
 * `file.type` (kolayca sahtelenebilen bir MIME header'ı) alanına güvenmemeli.
 * Bu yardımcı fonksiyon, buffer'ın sharp ile gerçekten parse edilebilir,
 * desteklenen bir görsel formatında olduğunu doğrular. Sahte uzantılı /
 * içeriği görsel olmayan dosyalar (ör. HTML, script, SVG-with-script, ya da
 * bozuk/rastgele veri) burada reddedilir.
 *
 * Aşırı büyük piksel boyutlarına sahip "decompression bomb" tarzı dosyaları
 * da (küçük dosya boyutu, devasa çözünürlük) reddeder.
 */
const MAX_IMAGE_PIXELS = 40_000_000; // ~40 megapiksel (ör. 8000x5000)

/**
 * @param {Buffer} buffer - Doğrulanacak ham dosya verisi
 * @param {string[]} allowedFormats - sharp'ın algıladığı format adları (ör. 'png', 'jpeg', 'webp', 'gif')
 * @returns {Promise<sharp.Metadata>} geçerliyse sharp metadata'sını döner
 * @throws {Error} dosya geçersiz/bozuk/desteklenmeyen bir görselse veya boyutları sınırı aşıyorsa
 */
export async function assertValidImage(buffer, allowedFormats) {
    let meta;
    try {
        meta = await sharp(buffer, { animated: true }).metadata();
    } catch {
        throw new Error('Geçersiz veya bozuk görsel dosyası.');
    }

    if (!meta.format || !allowedFormats.includes(meta.format)) {
        throw new Error('Desteklenmeyen görsel formatı.');
    }

    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width <= 0 || height <= 0) {
        throw new Error('Geçersiz görsel boyutları.');
    }
    if (width * height > MAX_IMAGE_PIXELS) {
        throw new Error('Görsel boyutları izin verilen en büyük çözünürlüğü aşıyor.');
    }

    return meta;
}

/** file.type MIME değerini sharp'ın format adına eşler ('image/jpg' → 'jpeg' vb.) */
export const MIME_TO_SHARP_FORMAT = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/gif': 'gif',
};
