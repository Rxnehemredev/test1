import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { GENERAL_TOPICS } from '@/lib/ai-blog';

const routeLimiter = createRateLimiter(20, 60 * 1000);
const MAX_ENQUEUE = 200; // tek istekte kuyruğa eklenebilecek maksimum satır — kazayla binlerce satır atılmasın

function checkStaff(user) {
    return user && ['admin', 'manager'].includes(user.role);
}

// GET /api/admin/blogs/queue — kuyruk durumu (bekleyen/işlenen/tamamlanan/hatalı sayıları + son 30 satır)
export async function GET(request) {
    try {
        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = await getDb();
        const counts = await db.prepare(`
            SELECT status, COUNT(*) as cnt FROM blog_queue GROUP BY status
        `).all();
        const recent = await db.prepare(`
            SELECT q.id, q.kind, q.status, q.error, q.created_at, q.processed_at,
                   s.title as series_title, c.chapter_number, q.topic
            FROM blog_queue q
            LEFT JOIN series s ON q.series_id = s.id
            LEFT JOIN chapters c ON q.chapter_id = c.id
            ORDER BY q.id DESC LIMIT 30
        `).all();

        return NextResponse.json({
            counts: Object.fromEntries(counts.map(c => [c.status, c.cnt])),
            recent,
        });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('GET /api/admin/blogs/queue error:', error);
        return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
    }
}

// POST /api/admin/blogs/queue { mode, count } — kuyruğa toplu iş ekler.
// mode:
//  - 'missing_series' : henüz blogu olmayan yayınlanmış seriler
//  - 'all_series'      : yayınlanmış TÜM serilerden rastgele (blogu olsa bile — "yeniden üret"/companion yazı)
//  - 'chapters'        : blogu olmayan en yeni bölümlerden
//  - 'topics'          : genel/rastgele manga konuları (siteye/seriye bağlı değil)
export async function POST(request) {
    try {
        const rl = await routeLimiter(request);
        if (!rl.success) return NextResponse.json({ error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, { status: 429 });

        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const mode = body.mode;
        const count = Math.max(1, Math.min(MAX_ENQUEUE, parseInt(body.count, 10) || 10));

        const db = await getDb();
        let inserted = 0;

        if (mode === 'missing_series') {
            const rows = await db.prepare(`
                SELECT s.id FROM series s
                WHERE s.published = 1
                  AND NOT EXISTS (SELECT 1 FROM blogs b WHERE b.series_id = s.id AND b.chapter_id IS NULL)
                  AND NOT EXISTS (SELECT 1 FROM blog_queue q WHERE q.series_id = s.id AND q.kind = 'series' AND q.status = 'pending')
                ORDER BY s.created_at DESC LIMIT ?
            `).all(count);
            for (const r of rows) {
                await db.prepare(`INSERT INTO blog_queue (kind, series_id) VALUES ('series', ?)`).run(r.id);
                inserted++;
            }
        } else if (mode === 'all_series') {
            const rows = await db.prepare(`
                SELECT s.id FROM series s
                WHERE s.published = 1
                  AND NOT EXISTS (SELECT 1 FROM blog_queue q WHERE q.series_id = s.id AND q.kind = 'series' AND q.status = 'pending')
                ORDER BY RANDOM() LIMIT ?
            `).all(count);
            for (const r of rows) {
                await db.prepare(`INSERT INTO blog_queue (kind, series_id) VALUES ('series', ?)`).run(r.id);
                inserted++;
            }
        } else if (mode === 'chapters') {
            const rows = await db.prepare(`
                SELECT c.id FROM chapters c
                JOIN series s ON c.series_id = s.id
                WHERE s.published = 1
                  AND NOT EXISTS (SELECT 1 FROM blogs b WHERE b.chapter_id = c.id)
                  AND NOT EXISTS (SELECT 1 FROM blog_queue q WHERE q.chapter_id = c.id AND q.kind = 'chapter' AND q.status = 'pending')
                ORDER BY c.created_at DESC LIMIT ?
            `).all(count);
            for (const r of rows) {
                await db.prepare(`INSERT INTO blog_queue (kind, chapter_id) VALUES ('chapter', ?)`).run(r.id);
                inserted++;
            }
        } else if (mode === 'topics') {
            // Zaten kuyrukta bekleyen konuları tekrar eklememek için basit bir kontrol
            const pendingTopics = await db.prepare(`SELECT topic FROM blog_queue WHERE kind = 'topic' AND status = 'pending'`).all();
            const pendingSet = new Set(pendingTopics.map(t => t.topic));
            const usedTitles = await db.prepare(`SELECT title FROM blogs WHERE series_id IS NULL AND chapter_id IS NULL`).all();
            const usedSet = new Set(usedTitles.map(t => t.title));

            const pool = GENERAL_TOPICS.filter(t => !pendingSet.has(t));
            // Havuz tükenirse (tüm sabit konular zaten üretilmiş/kuyrukta) rastgele
            // tekrar seçime izin ver — Gemini zaten farklı bir açıyla ele alır.
            const source = pool.length > 0 ? pool : GENERAL_TOPICS;
            const shuffled = [...source].sort(() => Math.random() - 0.5);

            for (let i = 0; i < count; i++) {
                const topic = shuffled[i % shuffled.length];
                await db.prepare(`INSERT INTO blog_queue (kind, topic) VALUES ('topic', ?)`).run(topic);
                inserted++;
            }
            void usedSet; // (ileride "hiç işlenmemiş başlık" filtrelemesi için ayrılmış, şimdilik bilgi amaçlı)
        } else {
            return NextResponse.json({ error: 'Geçersiz mode. missing_series, all_series, chapters veya topics olmalı.' }, { status: 400 });
        }

        return NextResponse.json({ inserted });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('POST /api/admin/blogs/queue error:', error);
        return NextResponse.json({ error: 'Kuyruğa eklenemedi' }, { status: 500 });
    }
}

// DELETE /api/admin/blogs/queue — bekleyen tüm kuyruğu temizler (admin panik butonu)
export async function DELETE(request) {
    try {
        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = await getDb();
        const result = await db.prepare(`DELETE FROM blog_queue WHERE status = 'pending'`).run();
        return NextResponse.json({ deleted: result.changes || 0 });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('DELETE /api/admin/blogs/queue error:', error);
        return NextResponse.json({ error: 'Temizlenemedi' }, { status: 500 });
    }
}
