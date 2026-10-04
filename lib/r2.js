import 'server-only';

/**
 * Cloudflare R2 üzerinden görsel yükleme yardımcı fonksiyonu.
 *
 * imgbb / Vercel Blob'a üçüncü bir alternatif olarak eklendi. R2, S3 uyumlu bir
 * API sunduğu için resmi AWS SDK'sının S3 istemcisiyle konuşuyoruz; Cloudflare'in
 * kendisi de entegrasyon için bu SDK'yı öneriyor.
 *
 * Gerekli ortam değişkenleri (Vercel → Settings → Environment Variables):
 * - R2_ACCOUNT_ID          Cloudflare hesap ID'n (R2 dashboard'unun sağında görünür)
 * - R2_ACCESS_KEY_ID       R2 API token'ının Access Key ID'si
 * - R2_SECRET_ACCESS_KEY   R2 API token'ının Secret Access Key'i
 * - R2_BUCKET_NAME         Yüklemelerin gideceği bucket adı
 * - R2_PUBLIC_URL          Bucket'ın herkese açık taban adresi (sonunda / OLMADAN),
 *                          örn. https://pub-xxxxxxxx.r2.dev veya bağladığın custom domain.
 *                          (R2 → bucket → Settings → Public Access)
 *
 * Paket: @aws-sdk/client-s3 (package.json içinde tanımlı)
 */

let _client = null;
let _PutObjectCommand = null;

async function getClient() {
    if (!_client) {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        _PutObjectCommand = PutObjectCommand;
        _client = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return { client: _client, PutObjectCommand: _PutObjectCommand };
}

function assertConfigured() {
    const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
        .filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(
            `Cloudflare R2 ortam değişkenleri eksik: ${missing.join(', ')}. ` +
            'Vercel proje ayarlarından Storage > R2 bucket bilgilerini Environment Variables kısmına ekleyip yeniden deploy et.'
        );
    }
}

/**
 * @param {Buffer|ArrayBuffer} fileBuffer - Yüklenecek görselin ham verisi
 * @param {string} [name] - Dosya adı (opsiyonel, benzersizlik için otomatik son ek eklenir)
 * @returns {Promise<{url: string, deleteUrl: string, thumbUrl: string, key: string}>}
 */
export async function uploadToR2(fileBuffer, name) {
    assertConfigured();

    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const suffix = Math.random().toString(36).slice(2, 8);
    const key = `${name || `img_${Date.now()}`}_${suffix}.webp`;

    const { client, PutObjectCommand } = await getClient();
    await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
    }));

    const base = process.env.R2_PUBLIC_URL.replace(/\/+$/, '');
    const url = `${base}/${key}`;

    return {
        url,           // kalıcı, doğrudan erişilebilir görsel URL'i
        thumbUrl: url, // R2 thumbnail üretmiyor, aynı URL döner
        deleteUrl: url, // silme işlemi için DeleteObjectCommand + key kullanılır, DB'de saklanmıyor
        key,
    };
}

/**
 * Next.js'in `request.formData()` çağrısından gelen bir File/Blob nesnesini
 * doğrudan Cloudflare R2'ye yükler.
 * @param {File} file
 * @param {string} [name]
 */
export async function uploadFileToR2(file, name) {
    const arrayBuffer = await file.arrayBuffer();
    return uploadToR2(arrayBuffer, name);
}
