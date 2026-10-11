import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { createRateLimiter } from '@/lib/ratelimit';
import { generateBlogForSeries, generateBlogForChapter, generateGeneralTopicBlog } from '@/lib/ai-blog';

export const maxDuration = 60;

const adminLimiter = createRateLimiter(20, 60 * 1000);
const BATCH_SIZE_DEFAULT = 1;
const BATCH_SIZE_MAX = 5;
const GAP_MS = 13000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(db, item) {
    try {
        if (item.kind === 'series') {
            const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(item.series_id);
            if (!series) return { ok: false, error: 'Seri bulunamadı (silinmiş olabilir)' };
            await generateBlogForSeries(series);
            return { ok: true };
        }
        if (item.kind === 'chapter') {
            const chapter = await db.prepare('SELECT * FROM chapters WHERE id = ?').get(item.chapter_id);
            if (!chapter) return { ok: false, error: 'Bölüm bulunamadı (silinmiş olabilir)' };
            const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(chapter.series_id);
            if (!series) return { ok: false, error: 'Seri bulunamadı' };
            await generateBlogForChapter(series, chapter);
            return { ok: true };
        }
        if (item.kind === 'topic') {
            await generateGeneralTopicBlog(item.topic);
            return { ok: true };
        }
        return { ok: false, error: `Bilinmeyen kind: ${item.kind}` };
    } catch (e) {
        return { ok: false, error: e.message?.slice(0, 300) || 'Bilinmeyen hata' };
    }
}

export async function POST(request) {
    const rl = await adminLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, { status: 429 });
    }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    try {
        const user = await requireAuth(request);
        if (!user || !['admin', 'manager'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchSize = Math.max(1, Math.min(BATCH_SIZE_MAX, parseInt(searchParams.get('batch'), 10) || BATCH_SIZE_DEFAULT));

    const db = await getDb();
    const items = await db.prepare(`SELECT * FROM blog_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?`).all(batchSize);
    if (items.length === 0) {
        return NextResponse.json({ processed: 0, results: [], message: 'Kuyruk boş' });
    }

    for (const item of items) {
        await db.prepare(`UPDATE blog_queue SET status = 'processing' WHERE id = ?`).run(item.id);
    }

    const results = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const outcome = await processOne(db, item);
        if (outcome.ok) {
            await db.prepare(`UPDATE blog_queue SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(item.id);
        } else {
            await db.prepare(`UPDATE blog_queue SET status = 'failed', error = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(outcome.error, item.id);
        }
        results.push({ id: item.id, kind: item.kind, ...outcome });
        if (i < items.length - 1) await sleep(GAP_MS);
    }

    return NextResponse.json({ processed: results.length, results });
}
