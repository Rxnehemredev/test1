// lib/seriesCache.js
// ─────────────────────────────────────────────────────────────────────────────
// Seri/bölüm listeleri (trending, top, editor-pick, latest-updates, ana sayfa)
// için tutarlı önbellek yönetimi.
//
// SORUN: Vercel'de her serverless instance'ın kendi in-memory cache'i var.
// Eskiden bir seri eklenince/silinince yalnızca İSTEĞİ İŞLEYEN instance'ın cache'i
// temizleniyordu (o da hiç temizlenmiyordu) → diğer instance'lar 30-60 dk
// eski listeyi göstermeye devam ediyordu.
//
// ÇÖZÜM: "content_version" — DB'de tek bir sayaç. Her seri/bölüm değişikliğinde
// artırılır; cache anahtarına dahil edilir. Böylece TÜM instance'lar, versiyon
// değiştiği anda eski cache'i otomatik olarak kullanmayı bırakır.
// Ayrıca Next.js Data Cache (tag: 'series') ve sayfa cache'i de temizlenir.
// ─────────────────────────────────────────────────────────────────────────────
import { getDb } from '@/lib/db';
import { getCached, invalidateCache } from '@/lib/apiCache';

const VERSION_KEY = 'content_version';

async function readVersion(db) {
    try {
        const row = await db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(VERSION_KEY);
        return row?.setting_value || '0';
    } catch {
        return '0';
    }
}

/** getCached gibi çalışır ama anahtar content_version'a bağlıdır. */
export async function getCachedSeries(key, ttlMs, fetcher) {
    const db = await getDb();
    const version = await readVersion(db);
    return getCached(`${key}@${version}`, ttlMs, fetcher);
}

/**
 * Seri/bölüm eklendiğinde, silindiğinde, güncellendiğinde, yayınlandığında çağır.
 * Hata verse bile asıl işlemi ASLA bozmaz.
 *
 * NEDEN "30-40 dk geç düşüyordu": sadece '/', '/series', '/ranking' yeniden doğrulanıyordu.
 * Sitede gerçek sayfalar '/seri', '/seri/[slug]', '/tur/[slug]' vb. — bunların sayfa (ISR)
 * önbelleği hiç temizlenmiyordu, kendi süresi dolana kadar eski görünüyordu. Artık tüm
 * uygulama ağacı ('/' layout) + Data Cache etiketi temizleniyor.
 */
export async function invalidateSeriesCaches() {
    try {
        const db = await getDb();
        const stamp = String(Date.now());
        try {
            await db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)')
                .run(VERSION_KEY, stamp);
        } catch (e1) {
            // Şema farklıysa (ek kolon vb.) güncelle → yoksa ekle
            const upd = await db.prepare('UPDATE app_settings SET setting_value = ? WHERE setting_key = ?').run(stamp, VERSION_KEY);
            if (!upd?.changes) {
                await db.prepare('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run(VERSION_KEY, stamp);
            }
        }
    } catch (e) {
        console.warn('content_version güncellenemedi:', e.message);
    }

    for (const prefix of ['trending', 'top:', 'editor-pick', 'series:']) {
        try { invalidateCache(prefix); } catch {}
    }

    try {
        const { revalidatePath, revalidateTag } = await import('next/cache');
        // { expire: 0 } → Next 16'da anında geçersiz kıl (SWR yok); Next 15'te ikinci parametre yok sayılır.
        try { revalidateTag('series', { expire: 0 }); } catch { try { revalidateTag('series'); } catch {} }
        // Tüm ISR/sayfa önbelleği (/seri, /seri/[slug], /tur/[slug], /ranking, blog vb.)
        try { revalidatePath('/', 'layout'); } catch {}
        for (const p of ['/', '/seri', '/series', '/ranking']) {
            try { revalidatePath(p); } catch {}
        }
        for (const p of ['/seri/[slug]', '/tur/[slug]']) {
            try { revalidatePath(p, 'page'); } catch {}
        }
    } catch {}
}
