import sharp from 'sharp';
import { safeFetch } from './security/ssrfGuard.js';

/**
 * Bu modül artık diske YAZMIYOR — tüm fonksiyonlar bellek içi (Buffer) alıp
 * bellek içi (Buffer) döndürüyor. Çağıran taraf, dönen buffer'ı imgbb'ye
 * yükler (bkz. lib/imgbb.js). Bu değişiklik Vercel'in kalıcı olmayan dosya
 * sistemiyle uyumluluk için gerekliydi.
 */

async function isWebPAlreadyOptimized(inputBuffer, maxWidth, maxHeight) {
    try {
        const meta = await sharp(inputBuffer).metadata();
        if (meta.format !== 'webp') return false;
        const widthOk = !maxWidth || (meta.width && meta.width <= maxWidth);
        const heightOk = !maxHeight || (meta.height && meta.height <= maxHeight);
        return !!(widthOk && heightOk);
    } catch (err) {
        console.warn('isWebPAlreadyOptimized metadata check failed:', err.message);
    }
    return false;
}

/**
 * Kapak görseli optimize et: max 800x1200, WebP. Buffer döner.
 */
export async function optimizeCoverImage(inputBuffer) {
    if (await isWebPAlreadyOptimized(inputBuffer, 800, 1200)) {
        return inputBuffer;
    }
    return sharp(inputBuffer)
        .resize(800, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
}

/**
 * Watermark kaynağını (URL veya yerel yol) bir Buffer'a çevirir.
 */
async function loadWatermarkBuffer(source) {
    if (/^https?:\/\//i.test(source)) {
        // Watermark URL'i admin ayarından geliyor → safeFetch (SSRF koruması).
        const res = await safeFetch(source);
        if (!res.ok) throw new Error(`Watermark indirilemedi (HTTP ${res.status})`);
        return Buffer.from(await res.arrayBuffer());
    }
    // Geriye dönük uyumluluk: yerel dosya yolu (sadece local dev'de anlamlı)
    const fs = await import('fs');
    return fs.readFileSync(source);
}

/**
 * Bölüm sayfası optimize et: max 1200px genişlik, WebP.
 * watermarkOptions: { enabled: '1'|'0', path: <imgbb URL>, position, opacity, scale }
 * Buffer döner.
 */
export async function optimizeChapterPage(inputBuffer, watermarkOptions = null) {
    if (!watermarkOptions || watermarkOptions.enabled !== '1') {
        if (await isWebPAlreadyOptimized(inputBuffer, 1200, null)) {
            return inputBuffer;
        }
    }

    let pipeline = sharp(inputBuffer)
        .resize(1200, null, { fit: 'inside', withoutEnlargement: true });

    if (watermarkOptions && watermarkOptions.enabled === '1' && watermarkOptions.path) {
        try {
            const watermarkSourceBuffer = await loadWatermarkBuffer(watermarkOptions.path);

            const origMeta = await sharp(inputBuffer).metadata();
            const origWidth = origMeta.width || 1200;
            const origHeight = origMeta.height || 1600;

            let imgWidth, imgHeight;
            if (origWidth <= 1200) {
                imgWidth = origWidth;
                imgHeight = origHeight;
            } else {
                imgWidth = 1200;
                imgHeight = Math.round(origHeight * 1200 / origWidth);
            }

            const scalePercent = Math.min(50, Math.max(5, parseInt(watermarkOptions.scale) || 15));
            const wmTargetWidth = Math.round(imgWidth * scalePercent / 100);

            const opacityPercent = Math.min(100, Math.max(1, parseInt(watermarkOptions.opacity) || 60));
            const opacityFactor = opacityPercent / 100;

            const wmResized = await sharp(watermarkSourceBuffer)
                .resize(wmTargetWidth, null, { fit: 'inside', withoutEnlargement: false })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const { data: rawData, info: rawInfo } = wmResized;
            for (let i = 3; i < rawData.length; i += 4) {
                rawData[i] = Math.round(rawData[i] * opacityFactor);
            }

            const wmBuffer = await sharp(rawData, {
                raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 }
            }).png().toBuffer();

            const wmInfo = await sharp(wmBuffer).metadata();
            const wmWidth = wmInfo.width || wmTargetWidth;
            const wmHeight = wmInfo.height || 50;

            const margin = 12;
            let top, left;
            const pos = watermarkOptions.position || 'bottom-right';

            switch (pos) {
                case 'top-left':
                    top = margin; left = margin; break;
                case 'top-center':
                    top = margin; left = Math.round((imgWidth - wmWidth) / 2); break;
                case 'top-right':
                    top = margin; left = imgWidth - wmWidth - margin; break;
                case 'center':
                    top = Math.round((imgHeight - wmHeight) / 2);
                    left = Math.round((imgWidth - wmWidth) / 2); break;
                case 'bottom-left':
                    top = imgHeight - wmHeight - margin; left = margin; break;
                case 'bottom-center':
                    top = imgHeight - wmHeight - margin;
                    left = Math.round((imgWidth - wmWidth) / 2); break;
                case 'bottom-right':
                default:
                    top = imgHeight - wmHeight - margin;
                    left = imgWidth - wmWidth - margin; break;
            }

            top = Math.max(0, top);
            left = Math.max(0, left);

            pipeline = sharp(inputBuffer)
                .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
                .composite([{ input: wmBuffer, top, left, blend: 'over' }]);

        } catch (wmErr) {
            console.warn('Watermark uygulanamadı, orijinal görsel kaydediliyor:', wmErr.message);
            pipeline = sharp(inputBuffer)
                .resize(1200, null, { fit: 'inside', withoutEnlargement: true });
        }
    }

    return pipeline.webp({ quality: 85 }).toBuffer();
}

/**
 * Avatar optimize et: 200x200 kare, WebP. Buffer döner.
 */
export async function optimizeAvatar(inputBuffer, cropOptions = {}) {
    const cropX = Number(cropOptions.cropX) || 0;
    const cropY = Number(cropOptions.cropY) || 0;
    const cropScale = Number(cropOptions.cropScale) || 1;
    const cropApplied = cropOptions.cropApplied === true || cropOptions.cropApplied === 'true';

    if (cropApplied || (cropX === 0 && cropY === 0 && cropScale === 1)) {
        if (await isWebPAlreadyOptimized(inputBuffer, 200, 200)) {
            return inputBuffer;
        }
        return sharp(inputBuffer)
            .resize(200, 200, { fit: 'cover', position: 'centre' })
            .webp({ quality: 90 })
            .toBuffer();
    }

    const meta = await sharp(inputBuffer).metadata();
    const origW = meta.width;
    const origH = meta.height;
    if (!origW || !origH) throw new Error('Görsel boyutları okunamadı');

    const sf = Math.max(200 / origW, 200 / origH);
    const effectiveCropScale = Math.max(1, cropScale);
    const totalSF = sf * effectiveCropScale;

    const scaledW = Math.round(origW * totalSF);
    const scaledH = Math.round(origH * totalSF);

    let extractLeft = Math.round(scaledW / 2 - 100 - cropX);
    let extractTop  = Math.round(scaledH / 2 - 100 - cropY);

    extractLeft = Math.max(0, Math.min(scaledW - 200, extractLeft));
    extractTop  = Math.max(0, Math.min(scaledH - 200,  extractTop));

    return sharp(inputBuffer)
        .resize(scaledW, scaledH, { fit: 'fill' })
        .extract({ left: extractLeft, top: extractTop, width: 200, height: 200 })
        .webp({ quality: 90 })
        .toBuffer();
}

/**
 * Profil kapak görseli optimize et: 1200x400, WebP. Buffer döner.
 */
export async function optimizeProfileCover(inputBuffer, cropOptions = {}) {
    const cropX = Number(cropOptions.cropX) || 0;
    const cropY = Number(cropOptions.cropY) || 0;
    const cropScale = Number(cropOptions.cropScale) || 1;
    const cropApplied = cropOptions.cropApplied === true || cropOptions.cropApplied === 'true';

    if (cropApplied || (cropX === 0 && cropY === 0 && cropScale === 1)) {
        if (await isWebPAlreadyOptimized(inputBuffer, 1200, 400)) {
            return inputBuffer;
        }
        return sharp(inputBuffer)
            .resize(1200, 400, { fit: 'cover', position: 'centre' })
            .webp({ quality: 85 })
            .toBuffer();
    }

    const meta = await sharp(inputBuffer).metadata();
    const origW = meta.width;
    const origH = meta.height;
    if (!origW || !origH) throw new Error('Görsel boyutları okunamadı');

    const sf = Math.max(1200 / origW, 400 / origH);
    const effectiveCropScale = Math.max(1, cropScale);
    const totalSF = sf * effectiveCropScale;

    const scaledW = Math.round(origW * totalSF);
    const scaledH = Math.round(origH * totalSF);

    let extractLeft = Math.round(scaledW / 2 - 600 - cropX);
    let extractTop  = Math.round(scaledH / 2 - 200 - cropY);

    extractLeft = Math.max(0, Math.min(scaledW - 1200, extractLeft));
    extractTop  = Math.max(0, Math.min(scaledH - 400,  extractTop));

    return sharp(inputBuffer)
        .resize(scaledW, scaledH, { fit: 'fill' })
        .extract({ left: extractLeft, top: extractTop, width: 1200, height: 400 })
        .webp({ quality: 85 })
        .toBuffer();
}
