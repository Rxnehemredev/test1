import { getDb } from '@/lib/db';

/**
 * NOT: Orijinal sürüm, better-sqlite3'ün disk I/O maliyetini azaltmak için
 * yazmaları bellekte toplayıp 10 saniyede bir toplu (batch) olarak diske
 * yazıyordu. Vercel serverless fonksiyonları istek aralarında donduğu
 * (frozen) veya herhangi bir an sonlandırılabildiği için setInterval
 * tabanlı bu yaklaşım veri kaybına yol açar. Turso zaten uzak/optimize bir
 * servis olduğu için burada artık doğrudan (immediate) yazıyoruz — pratikte
 * kullanıcı için fark edilir bir gecikme yaratmaz.
 */
class WriteQueue {
    /** Okuma geçmişini anında günceller/ekler */
    async pushHistory(userId, chapterId, pageNumber = 1) {
        try {
            const db = await getDb();
            await db.prepare(`
                INSERT INTO reading_history (user_id, chapter_id, page_number, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, chapter_id)
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP, page_number = excluded.page_number
            `).run(userId, chapterId, pageNumber ?? 1);
        } catch (error) {
            console.error('WriteQueue.pushHistory error:', error);
        }
    }

    /** Trafik logunu anında ekler */
    async pushTraffic(path, visitorHash, referrer, userAgent) {
        try {
            const db = await getDb();
            await db.prepare(`
                INSERT INTO site_traffic_log (path, visitor_hash, referrer, user_agent)
                VALUES (?, ?, ?, ?)
            `).run(path, visitorHash, referrer ?? null, userAgent);
        } catch (error) {
            console.error('WriteQueue.pushTraffic error:', error);
        }
    }
}

const globalForQueue = globalThis;
export const batchQueue = globalForQueue.batchQueue || new WriteQueue();
if (process.env.NODE_ENV !== 'production') globalForQueue.batchQueue = batchQueue;
