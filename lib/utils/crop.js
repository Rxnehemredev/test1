/**
 * Canvas tabanlı kırpma: görüntünün kırpılmış halini blob olarak döner.
 * @param {string} imageSrc  - ObjectURL veya data URL
 * @param {object} cropData  - { x, y, scale } (CSS transform değerleri)
 * @param {number} vpW       - Önizleme kapsayıcı genişliği (px)
 * @param {number} vpH       - Önizleme kapsayıcı yüksekliği (px)
 * @param {number} outW      - Çıktı genişliği (px)
 * @param {number} outH      - Çıktı yüksekliği (px)
 * @returns {Promise<Blob>}
 */
export function getCroppedBlob(imageSrc, cropData, vpW, vpH, outW, outH) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const { x: cropX, y: cropY, scale: cropScale } = cropData;
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;

                // CSS transform: scale(cropScale) translate(cropX, cropY)
                // Transform sırası: önce translate uygulanır, sonra scale.
                // transform-origin merkez (vpW/2, vpH/2).
                const sfPrev = Math.max(vpW / imgW, vpH / imgH);

                // Görüntü merkez pikseli: CSS translate'i image-space'e çevir
                const cx_img = imgW / 2 - cropX / sfPrev;
                const cy_img = imgH / 2 - cropY / sfPrev;

                // Çıktı için toplam ölçek faktörü
                const sfOut = Math.max(outW / imgW, outH / imgH);
                const totalSF = sfOut * cropScale;

                // Canvas kurulumu
                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d');

                // Görüntüyü çiz: merkez pikseli canvas merkezine hizala
                const drawX = outW / 2 - cx_img * totalSF;
                const drawY = outH / 2 - cy_img * totalSF;
                ctx.drawImage(img, drawX, drawY, imgW * totalSF, imgH * totalSF);

                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob başarısız'));
                }, 'image/webp', 0.92);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.src = imageSrc;
    });
}

export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Görsel önizlemesi oluşturulamadı.'));
        reader.readAsDataURL(file);
    });
}
