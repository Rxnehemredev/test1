import 'server-only';

/**
 * Vercel Blob üzerinden görsel yükleme yardımcı fonksiyonu.
 *
 * imgbb'nin alternatifi olarak eklendi — imgbb'de sık yaşanan "rate limit"
 * hatalarını aşmak için, bölüm sayfaları (toplu ve normal yükleme) isteğe
 * bağlı olarak Vercel'in kendi Blob depolama servisine yüklenebilir.
 *
 * Gerekli ortam değişkeni: BLOB_READ_WRITE_TOKEN
 * - Proje Vercel'de bir Blob store'a bağlıysa bu değişken Vercel tarafından
 *   otomatik olarak eklenir (Storage > Blob > Connect Project).
 * - Yerelde çalışırken .env.local dosyasına Vercel dashboard'undan alınan
 *   token'ı elle eklemen gerekir.
 *
 * Paket: @vercel/blob (package.json içinde tanımlı)
 */

let _put = null;
async function getPut() {
    if (!_put) {
        const mod = await import('@vercel/blob');
        _put = mod.put;
    }
    return _put;
}

/**
 * @param {Buffer|ArrayBuffer} fileBuffer - Yüklenecek görselin ham verisi
 * @param {string} [name] - Blob'un dosya adı/yolu (opsiyonel, benzersizlik için otomatik son ek eklenir)
 * @returns {Promise<{url: string, deleteUrl: string, thumbUrl: string}>}
 */
export async function uploadToVercelBlob(fileBuffer, name) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error(
            'BLOB_READ_WRITE_TOKEN ortam değişkeni tanımlı değil. Vercel proje ayarlarından ' +
            'Storage > Blob bölümünden bir Blob store oluşturup projene bağla ' +
            '(https://vercel.com/docs/vercel-blob adresinden detaylı bilgi alabilirsin).'
        );
    }

    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const filename = `${name || `img_${Date.now()}`}.webp`;

    const put = await getPut();
    const blob = await put(filename, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: 'image/webp',
    });

    return {
        url: blob.url,           // kalıcı, doğrudan erişilebilir görsel URL'i
        thumbUrl: blob.url,      // Vercel Blob thumbnail üretmiyor, aynı URL döner
        deleteUrl: blob.url,     // silme işlemi için `del(blob.url)` kullanılır, DB'de saklanmıyor
    };
}

/**
 * Next.js'in `request.formData()` çağrısından gelen bir File/Blob nesnesini
 * doğrudan Vercel Blob'a yükler.
 * @param {File} file
 * @param {string} [name]
 */
export async function uploadFileToVercelBlob(file, name) {
    const arrayBuffer = await file.arrayBuffer();
    return uploadToVercelBlob(arrayBuffer, name);
}

/**
 * Ortak arayüz: storageProvider değerine göre imgbb, Vercel Blob veya Supabase Storage'a yükler.
 * @param {Buffer|ArrayBuffer} fileBuffer
 * @param {string} name
 * @param {'imgbb'|'vercel'|'supabase'} storageProvider
 */
export async function uploadImage(fileBuffer, name, storageProvider) {
    if (storageProvider === 'vercel') {
        return uploadToVercelBlob(fileBuffer, name);
    }
    if (storageProvider === 'supabase') {
        const { uploadToSupabase } = await import('@/lib/supabase');
        return uploadToSupabase(fileBuffer, name);
    }
    const { uploadToImgbb } = await import('@/lib/imgbb');
    return uploadToImgbb(fileBuffer, name);
}
