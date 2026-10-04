import 'server-only';

/**
 * Supabase Storage üzerinden görsel yükleme yardımcı fonksiyonu.
 *
 * imgbb / Vercel Blob / Cloudflare R2'ye dördüncü bir alternatif olarak eklendi.
 * Supabase'in resmi JS istemcisi (@supabase/supabase-js) ile bucket'a yüklenir.
 *
 * Gerekli ortam değişkenleri (Vercel → Settings → Environment Variables):
 * - SUPABASE_URL              Proje URL'i, örn. https://xxxxxxxx.supabase.co
 *                             (Supabase Dashboard → Settings → API)
 * - SUPABASE_SERVICE_ROLE_KEY Service role (gizli, server-side) anahtarı — RLS'i
 *                             bypass ederek yükleme yapabilmek için gerekli.
 *                             ANON KEY DEĞİL — service_role key kullanılmalı.
 * - SUPABASE_BUCKET           Yüklemelerin gideceği storage bucket adı
 *                             (varsayılan: 'uploads'). Bucket'ın "Public" olarak
 *                             ayarlanmış olması, döndürülen URL'in doğrudan
 *                             erişilebilir olması için gerekir.
 *
 * Paket: @supabase/supabase-js (package.json içinde tanımlı)
 */

let _client = null;

async function getClient() {
    if (!_client) {
        const { createClient } = await import('@supabase/supabase-js');
        _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
    }
    return _client;
}

function assertConfigured() {
    const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
        .filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(
            `Supabase ortam değişkenleri eksik: ${missing.join(', ')}. ` +
            'Vercel proje ayarlarından Settings > Environment Variables kısmına Supabase proje URL\'ini ve ' +
            'service_role anahtarını ekleyip yeniden deploy et.'
        );
    }
}

/**
 * @param {Buffer|ArrayBuffer} fileBuffer - Yüklenecek görselin ham verisi
 * @param {string} [name] - Dosya adı (opsiyonel, benzersizlik için otomatik son ek eklenir)
 * @returns {Promise<{url: string, deleteUrl: string, thumbUrl: string, key: string}>}
 */
export async function uploadToSupabase(fileBuffer, name) {
    assertConfigured();

    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const suffix = Math.random().toString(36).slice(2, 8);
    const key = `${name || `img_${Date.now()}`}_${suffix}.webp`;
    const bucket = process.env.SUPABASE_BUCKET || 'uploads';

    const client = await getClient();
    const { error } = await client.storage.from(bucket).upload(key, buffer, {
        contentType: 'image/webp',
        upsert: false,
    });

    if (error) {
        throw new Error(`Supabase Storage yükleme hatası: ${error.message}`);
    }

    const { data } = client.storage.from(bucket).getPublicUrl(key);
    const url = data.publicUrl;

    return {
        url,           // kalıcı, doğrudan erişilebilir görsel URL'i (bucket public olmalı)
        thumbUrl: url, // Supabase thumbnail üretmiyor, aynı URL döner
        deleteUrl: url, // silme işlemi için storage.from(bucket).remove([key]) + key kullanılır, DB'de saklanmıyor
        key,
    };
}

/**
 * Next.js'in `request.formData()` çağrısından gelen bir File/Blob nesnesini
 * doğrudan Supabase Storage'a yükler.
 * @param {File} file
 * @param {string} [name]
 */
export async function uploadFileToSupabase(file, name) {
    const arrayBuffer = await file.arrayBuffer();
    return uploadToSupabase(arrayBuffer, name);
}
