import 'server-only';

/**
 * imgbb.com üzerinden görsel yükleme yardımcı fonksiyonu.
 *
 * Vercel'in serverless fonksiyonları diske kalıcı yazamadığı (her istek/deploy
 * sonrası dosya sistemi sıfırlanır) için, tüm kullanıcı yüklemesi görseller
 * (kapak resimleri, sayfa görselleri, avatarlar, watermark vb.) artık ücretsiz
 * bir görsel barındırma servisi olan imgbb'ye yükleniyor ve dönen kalıcı URL
 * veritabanına kaydediliyor.
 *
 * Ortam değişkeni: IMGBB_API_KEY (https://api.imgbb.com/ adresinden ücretsiz alınır)
 */

import sharp from 'sharp';

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 2;

function getUploadError(json, status) {
    return json?.error?.message ||
        json?.error?.error?.message ||
        `imgbb yükleme hatası (HTTP ${status})`;
}


/**
 * Tüm görseller WebP olarak saklanır (PNG/JPEG/GIF/AVIF → WebP).
 * Zaten WebP ise dokunulmaz. Animasyonlu GIF'ler animasyonlu WebP'ye çevrilir.
 * Şeffaflık (alpha) korunur. Favicon gibi istisnalar için { keepFormat: true }.
 */
async function ensureWebP(buffer) {
    const meta = await sharp(buffer, { animated: true }).metadata();
    if (meta.format === 'webp') return buffer;
    const isAnimated = (meta.pages || 1) > 1;
    return sharp(buffer, { animated: isAnimated })
        .webp({ quality: 88, effort: 4, ...(isAnimated ? {} : { alphaQuality: 100 }) })
        .toBuffer();
}

/**
 * @param {Buffer|ArrayBuffer} fileBuffer - Yüklenecek görselin ham verisi
 * @param {string} [name] - imgbb'de görünecek dosya adı (opsiyonel)
 * @returns {Promise<{url: string, deleteUrl: string, thumbUrl: string}>}
 */
export async function uploadToImgbb(fileBuffer, name, options = {}) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error(
            'IMGBB_API_KEY ortam değişkeni tanımlı değil. Vercel proje ayarlarından ' +
            'Environment Variables kısmına ekle (https://api.imgbb.com/ üzerinden ücretsiz alınır).'
        );
    }

    let buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    if (!options.keepFormat) {
        try {
            buffer = await ensureWebP(buffer);
        } catch (convErr) {
            throw new Error('Görsel WebP formatına dönüştürülemedi (geçersiz veya bozuk dosya): ' + convErr.message);
        }
    }
    const base64 = buffer.toString('base64');

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const form = new FormData();
            form.append('key', apiKey);
            form.append('image', base64);
            if (name) form.append('name', name);

            const res = await fetch(IMGBB_ENDPOINT, {
                method: 'POST',
                body: form,
                signal: controller.signal,
            });
            const json = await res.json().catch(() => null);

            if (res.ok && json?.success && json.data?.url) {
                return {
                    url: json.data.url,
                    thumbUrl: json.data.thumb?.url || json.data.url,
                    deleteUrl: json.data.delete_url,
                };
            }

            lastError = new Error(getUploadError(json, res.status));
            const retryable = res.status === 429 || res.status >= 500;
            if (!retryable || attempt === MAX_RETRIES) break;
        } catch (error) {
            lastError = error.name === 'AbortError'
                ? new Error('Görsel yükleme zaman aşımına uğradı.')
                : error;
            if (attempt === MAX_RETRIES) break;
        } finally {
            clearTimeout(timer);
        }

        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    }

    throw lastError || new Error('Görsel yüklenemedi.');
}

/**
 * Next.js'in `request.formData()` çağrısından gelen bir File/Blob nesnesini
 * doğrudan imgbb'ye yükler.
 * @param {File} file
 * @param {string} [name]
 */
export async function uploadFileToImgbb(file, name, options = {}) {
    if (!file || typeof file.arrayBuffer !== 'function') {
        throw new Error('Geçerli bir görsel dosyası gönderilmedi.');
    }
    const arrayBuffer = await file.arrayBuffer();
    return uploadToImgbb(arrayBuffer, name, options);
}
